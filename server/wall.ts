import type {IncomingMessage,ServerResponse} from 'node:http';
import type {DatabaseSync} from 'node:sqlite';
import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {mkdir,writeFile,unlink,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {join} from 'node:path';
import {pipeline} from 'node:stream/promises';
import seeds from '../lib/date-wall-data.json';
import {photoDate,validDate} from './photo-date';

const MiB=1024*1024,MAX_INPUT=12*MiB,MAX_STORAGE=100*MiB,MAX_ENTRIES=300;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SESSION_AGE=12*60*60*1000;
class WallError extends Error{constructor(public status:number,message:string){super(message)}}
function json(res:ServerResponse,status:number,value:unknown,headers:Record<string,string>={}){
 res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(value));
}
async function readBody(req:IncomingMessage,limit:number){
 if(Number(req.headers['content-length']||0)>limit)throw new WallError(413,'That file or message is too large.');
 const chunks:Buffer[]=[];let size=0;
 for await(const chunk of req){size+=chunk.length;if(size>limit)throw new WallError(413,'That file or message is too large.');chunks.push(chunk)}
 return Buffer.concat(chunks);
}
async function readJson(req:IncomingMessage,limit=8192){
 if(req.headers['content-type']?.split(';')[0]!=='application/json')throw new WallError(415,'Please send a JSON message.');
 const raw=await readBody(req,limit);let value;
 try{value=JSON.parse(raw.toString())}catch{throw new WallError(400,'The message could not be read. Please try again.')}
 if(!value||typeof value!=='object'||Array.isArray(value))throw new WallError(400,'Invalid message.');return value;
}
function safeEqual(a:string,b:string){return timingSafeEqual(createHash('sha256').update(a).digest(),createHash('sha256').update(b).digest())}
type Entry={id:string;title:string;note:string;alt:string;date:string|null;src:string|null;thumbnail:string|null;width:number;height:number;version:number;image_id:string|null};
type Upload={id:string;date:string|null;width:number;height:number;bytes:number;created:number};
export function createWall(db:DatabaseSync,dataDir:string){
 const directory=join(dataDir,'wall-images'),secret=process.env.WALL_EDIT_PASSCODE||'';
 if(secret&&secret.length<16)throw Error('WALL_EDIT_PASSCODE must contain at least 16 characters.');
 db.exec(`CREATE TABLE IF NOT EXISTS wall_entries (id TEXT PRIMARY KEY,title TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',alt TEXT NOT NULL DEFAULT '',date TEXT,src TEXT,thumbnail TEXT,width INTEGER NOT NULL DEFAULT 0,height INTEGER NOT NULL DEFAULT 0,version INTEGER NOT NULL DEFAULT 1,image_id TEXT UNIQUE,bytes INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS wall_uploads(id TEXT PRIMARY KEY,date TEXT,width INTEGER NOT NULL,height INTEGER NOT NULL,bytes INTEGER NOT NULL,created INTEGER NOT NULL);`);
 const seed=db.prepare('INSERT OR IGNORE INTO wall_entries(id,title,alt,date,src,thumbnail,width,height,created) VALUES (?,?,?,?,?,?,?,?,?)');
 seeds.forEach((p,i)=>seed.run(p.id,p.title,p.alt,p.date,p.src,p.thumbnail,p.width,p.height,i));
 const list=()=>db.prepare('SELECT id,title,note,alt,date,src,thumbnail,width,height,version FROM wall_entries ORDER BY date IS NULL,date,created,id').all();
 const get=(id:string)=>db.prepare('SELECT * FROM wall_entries WHERE id=?').get(id) as Entry|undefined;
 const files=(id:string)=>[join(directory,id+'.webp'),join(directory,id+'-thumb.webp')];
 const removeFiles=async(id:string)=>{if(!uuid.test(id))return;await Promise.all(files(id).map(file=>unlink(file).catch(()=>{})))};
 const cleanup=async()=>{
  const expired=db.prepare('SELECT id FROM wall_uploads WHERE created < ?').all(Date.now()-24*60*60*1000) as {id:string}[];
  for(const item of expired){await removeFiles(item.id);db.prepare('DELETE FROM wall_uploads WHERE id=?').run(item.id)}
 };
 const sign=(value:string)=>createHmac('sha256',secret).update(value).digest('base64url');
 const authenticated=(req:IncomingMessage)=>{
  if(!secret)return false;
  const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('wall_edit='))?.slice(10)||'';
  const [issued,signature]=token.split('.'),time=Number(issued);
  return /^\d+$/.test(issued||'')&&time<=Date.now()&&Date.now()-time<SESSION_AGE&&Boolean(signature)&&safeEqual(signature,sign(issued));
 };
 let activeUpload=false,window=Date.now(),reads=0,writes=0,authWindow=Date.now(),failures=0;
 const editHeaders=(token:string,secure:boolean,maxAge=SESSION_AGE/1000)=>({'Set-Cookie':`wall_edit=${token}; HttpOnly; SameSite=Strict; Path=/api/wall; Max-Age=${maxAge}${secure?'; Secure':''}`});
 return async function wall(req:IncomingMessage,res:ServerResponse,url:URL){
  try{
   const path=url.pathname,method=req.method||'GET',canEdit=authenticated(req);
   if(path.startsWith('/api/wall/images/')){
    if(method!=='GET'&&method!=='HEAD')throw new WallError(405,'Method not allowed.');
    const name=path.slice('/api/wall/images/'.length),id=name.replace(/(?:-thumb)?\.webp$/,'');
    if(!uuid.test(id)||!new RegExp('^'+id+'(?:-thumb)?\\.webp$').test(name))throw new WallError(404,'Photo not found.');
    const published=db.prepare('SELECT 1 FROM wall_entries WHERE image_id=?').get(id);
    if(!published&&!(canEdit&&db.prepare('SELECT 1 FROM wall_uploads WHERE id=?').get(id)))throw new WallError(404,'Photo not found.');
    const file=join(directory,name);let info;try{info=await stat(file)}catch{throw new WallError(404,'Photo not found.')}
    res.writeHead(200,{'Content-Type':'image/webp','Content-Length':info.size,'X-Content-Type-Options':'nosniff','Cache-Control':published?'public, max-age=31536000, immutable':'private, no-store'});
    if(method==='HEAD')res.end();else await pipeline(createReadStream(file),res);return;
   }
   if(Date.now()-window>=60000){window=Date.now();reads=0;writes=0}
   if(method==='GET'?++reads>120:++writes>30)throw new WallError(429,'Please wait a minute and try again.');
   if(path==='/api/wall'&&method==='GET')return json(res,200,{entries:list(),canEdit,editingEnabled:Boolean(secret)});
   if(!['POST','PATCH','DELETE'].includes(method))throw new WallError(405,'Method not allowed.');
   // Cookie authentication alone is not enough: require an exact same-origin write.
   if(req.headers.origin!==url.origin||req.headers['sec-fetch-site']==='cross-site')throw new WallError(403,'Open the date wall on this website to make changes.');
   if(path==='/api/wall/session'&&method==='POST'){
    if(!secret)throw new WallError(503,'Editing has not been set up yet.');
    if(Date.now()-authWindow>=15*60000){authWindow=Date.now();failures=0}
    if(failures>=8)throw new WallError(429,'Too many attempts. Please wait 15 minutes.');
    const value=await readJson(req,512);
    if(typeof value.passcode!=='string'||!safeEqual(value.passcode,secret)){failures++;throw new WallError(401,'That passcode did not match.')}
    const issued=String(Date.now());return json(res,200,{canEdit:true},editHeaders(issued+'.'+sign(issued),url.protocol==='https:'));
   }
   if(path==='/api/wall/session'&&method==='DELETE')return json(res,200,{canEdit:false},editHeaders('',url.protocol==='https:',0));
   if(!canEdit)throw new WallError(401,'Unlock editing with your shared passcode first.');
   if(path==='/api/wall/upload'&&method==='POST'){
    if(activeUpload)throw new WallError(429,'Another photo is being prepared. Please try again in a moment.');
    if(!['image/jpeg','image/png','image/webp'].includes(req.headers['content-type']||''))throw new WallError(415,'Choose a JPEG, PNG or WebP photo. Export HEIC photos as JPEG first.');
    activeUpload=true;let id:string|undefined;
    try{
     await cleanup();
     const used=()=>Number((db.prepare('SELECT (SELECT COALESCE(SUM(bytes),0) FROM wall_entries)+(SELECT COALESCE(SUM(bytes),0) FROM wall_uploads) AS total').get() as {total:number}).total);
     if(used()>=MAX_STORAGE)throw new WallError(507,'The photo storage limit has been reached.');
     const input=await readBody(req,MAX_INPUT);
     const sharp=(await import('sharp')).default;sharp.cache(false);sharp.concurrency(1);
     const options={limitInputPixels:32_000_000,failOn:'warning' as const};
     let meta;try{meta=await sharp(input,options).metadata()}catch{throw new WallError(415,'This photo could not be read. Use a JPEG, PNG or WebP up to 32 megapixels.')}
     if(!['jpeg','png','webp'].includes(meta.format||'')||(meta.pages||1)!==1)throw new WallError(415,'Please use a still JPEG, PNG or WebP photo.');
     const date=photoDate(meta.exif);
     const full=await sharp(input,options).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85,effort:4}).toBuffer({resolveWithObject:true});
     const thumb=await sharp(full.data).resize({width:360,height:360,fit:'inside',withoutEnlargement:true}).webp({quality:78,effort:4}).toBuffer();
     const bytes=full.data.length+thumb.length;
     if(bytes>2*MiB||used()+bytes>MAX_STORAGE)throw new WallError(507,'This photo exceeds the wall storage limit. Choose a smaller image.');
     id=randomUUID();await mkdir(directory,{recursive:true});const [file,small]=files(id);
     await writeFile(file,full.data,{flag:'wx'});await writeFile(small,thumb,{flag:'wx'});
     db.prepare('INSERT INTO wall_uploads VALUES (?,?,?,?,?,?)').run(id,date,full.info.width,full.info.height,bytes,Date.now());
     return json(res,201,{uploadId:id,date,width:full.info.width,height:full.info.height,thumbnail:`/api/wall/images/${id}-thumb.webp`,bytes});
    }catch(error){if(id)await removeFiles(id);throw error}finally{activeUpload=false}
   }
   if((path==='/api/wall'&&method==='POST')||(path.startsWith('/api/wall/')&&method==='PATCH')){
    const value=await readJson(req),editing=method==='PATCH',id=editing?path.slice('/api/wall/'.length):value.id;
    if(typeof id!=='string'||(editing?!/^[a-z0-9-]{1,64}$/.test(id):!uuid.test(id)))throw new WallError(400,'Invalid entry.');
    const title=typeof value.title==='string'?value.title.trim():'',note=typeof value.note==='string'?value.note.trim():'';
    if(!title||title.length>120||note.length>2000)throw new WallError(400,'Add a title (up to 120 characters) and a note of up to 2,000 characters.');
    if(value.date!==null&&!validDate(value.date))throw new WallError(400,'Choose a valid date or leave it blank.');
    const existing=get(id);
    if(editing){
     if(!existing)throw new WallError(404,'This memory could not be found.');
     if(existing.version!==value.version)throw new WallError(409,'This memory changed in another window. Return to the wall and reopen it before editing.');
     db.prepare('UPDATE wall_entries SET title=?,note=?,date=?,version=version+1 WHERE id=?').run(title,note,value.date,id);
    }else if(!existing){
     if(Number((db.prepare('SELECT COUNT(*) AS n FROM wall_entries').get() as {n:number}).n)>=MAX_ENTRIES)throw new WallError(507,'The wall is full. Please edit an existing memory.');
     const upload=value.uploadId?db.prepare('SELECT * FROM wall_uploads WHERE id=?').get(typeof value.uploadId==='string'?value.uploadId:'') as Upload|undefined:undefined;
     if(value.uploadId&&!upload)throw new WallError(400,'Please choose the photo again. Its temporary upload has expired.');
     db.exec('BEGIN IMMEDIATE');
     try{
      db.prepare('INSERT INTO wall_entries(id,title,note,alt,date,src,thumbnail,width,height,image_id,bytes,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(id,title,note,title,value.date,upload?`/api/wall/images/${upload.id}.webp`:null,upload?`/api/wall/images/${upload.id}-thumb.webp`:null,upload?.width||0,upload?.height||0,upload?.id||null,upload?.bytes||0,Date.now());
      if(upload)db.prepare('DELETE FROM wall_uploads WHERE id=?').run(upload.id);
      db.exec('COMMIT');
     }catch(error){db.exec('ROLLBACK');throw error}
    }
    return json(res,200,{entries:list(),canEdit:true,editingEnabled:true});
   }
   throw new WallError(404,'Not found.');
  }catch(error){
   if(res.headersSent){res.destroy();return}
   if(error instanceof WallError)return json(res,error.status,{error:error.message});
   console.error('Date wall request failed');return json(res,503,{error:'The memory could not be saved. Please try again.'});
  }
 };
}
