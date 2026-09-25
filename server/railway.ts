import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream, mkdirSync, statSync } from 'node:fs';
import { resolve, join, sep, extname } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import worker from '../worker/index';

const root=resolve('dist/client');
const onRailway=Boolean(process.env.RAILWAY_ENVIRONMENT_ID);
// Refuse ephemeral production storage: a redeploy must never erase the notes.
if(onRailway&&!process.env.RAILWAY_VOLUME_MOUNT_PATH)throw Error('Mount a Railway volume at /data before deploying. Shared fortunes require persistent storage.');
const dataDir=resolve(process.env.RAILWAY_VOLUME_MOUNT_PATH||process.env.DATA_DIR||'.local-data');
mkdirSync(dataDir,{recursive:true});
const db=new DatabaseSync(join(dataDir,'fortunes.sqlite'),{timeout:5000});
db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;
 CREATE TABLE IF NOT EXISTS opened_fortunes (
 id INTEGER PRIMARY KEY CHECK(id >= 0 AND id < 200),
 request_id TEXT NOT NULL UNIQUE, opened_by TEXT NOT NULL, opened_at TEXT NOT NULL
 );`);
// Import only note IDs and opening dates, never old account identifiers.
// Repeated deployments are safe: existing notes are never replaced or reset.
if(process.env.FORTUNES_IMPORT_JSON){
 const seed:unknown=JSON.parse(process.env.FORTUNES_IMPORT_JSON);
 if(!Array.isArray(seed)||seed.length>200)throw Error('Invalid fortune import');
 const ids=new Set<number>();
 for(const item of seed){
  if(!item||!Number.isInteger(item.id)||item.id<0||item.id>=200||ids.has(item.id)||typeof item.openedAt!=='string'||item.openedAt.length>40||!Number.isFinite(Date.parse(item.openedAt)))throw Error('Invalid fortune import entry');
  ids.add(item.id);
 }
 db.exec('BEGIN IMMEDIATE');
 try {
  const insert=db.prepare('INSERT OR IGNORE INTO opened_fortunes (id, request_id, opened_by, opened_at) VALUES (?, ?, ?, ?)');
  for(const item of seed)insert.run(item.id,`imported-sites-${item.id}`,'imported-room',item.openedAt);
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error}
}
const statement=(sql:string,values:SQLInputValue[]=[])=>({
 bind(...args:unknown[]){return statement(sql,args as SQLInputValue[])},
 run(){return db.prepare(sql).all(...values)},
 async all<T>(){return {results:this.run() as T[]}},
});
const DB={
 prepare:statement,
 async batch<T>(statements:ReturnType<typeof statement>[]){
  db.exec('BEGIN IMMEDIATE');
  try {const result=statements.map(s=>({results:s.run() as T[]}));db.exec('COMMIT');return result}
  catch(error){db.exec('ROLLBACK');throw error}
 },
};
const port=Number(process.env.PORT||3023);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
const allowedHosts=new Set(['localhost:'+port,'127.0.0.1:'+port]);
for(const origin of (process.env.PUBLIC_ORIGINS||'https://happybirthdayunc.com,https://www.happybirthdayunc.com').split(',')){
 if(origin.trim())allowedHosts.add(new URL(origin.trim()).host);
}
if(process.env.RAILWAY_PUBLIC_DOMAIN)allowedHosts.add(process.env.RAILWAY_PUBLIC_DOMAIN);
const commonHeaders={'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'};
function json(res:ServerResponse,status:number,body:unknown,headers:Record<string,string>={}){
 res.writeHead(status,{...commonHeaders,'Content-Type':'application/json','Cache-Control':'no-store',...headers});res.end(JSON.stringify(body));
}
function body(req:IncomingMessage):Promise<Buffer>{
 return new Promise((resolveBody,reject)=>{
  let bytes=0,tooLarge=false;const chunks:Buffer[]=[];
  req.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>512){tooLarge=true;chunks.length=0}else if(!tooLarge)chunks.push(chunk)});
  req.once('end',()=>tooLarge?reject(new Error('Request too large')):resolveBody(Buffer.concat(chunks)));
  req.once('error',reject);
 });
}
// A bounded shared-room limiter avoids unbounded identity/IP storage. It is
// deliberately global: this is one small birthday room, not a multi-user API.
let windowStart=Date.now(),reads=0,writes=0;
function rateLimit(method:string){
 if(Date.now()-windowStart>=60000){windowStart=Date.now();reads=0;writes=0}
 if(method==='POST')return ++writes>12;
 return ++reads>300;
}
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.glb':'model/gltf-binary','.wasm':'application/wasm','.woff':'font/woff','.woff2':'font/woff2','.mp3':'audio/mpeg','.wav':'audio/wav'};
async function staticFile(req:IncomingMessage,res:ServerResponse,url:URL){
 if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Method not allowed.'},{Allow:'GET, HEAD'});
 let path:string;try{path=decodeURIComponent(url.pathname)}catch{return json(res,400,{error:'Invalid path.'})}
 if(path.includes('\0')||path.includes('\\')||path.split('/').some(part=>part==='..'||part.startsWith('.')))return json(res,404,{error:'Not found.'});
 let file=resolve(root,'.'+path);
 if(file!==root&&!file.startsWith(root+sep))return json(res,404,{error:'Not found.'});
 try {if(statSync(file).isDirectory())file=join(file,'index.html')}catch{return json(res,404,{error:'Not found.'})}
 let stat;try{stat=statSync(file);if(!stat.isFile())throw Error('Not a file')}catch{return json(res,404,{error:'Not found.'})}
 const type=mime[extname(file)]||'application/octet-stream';
 const etag=`W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
 const headers:Record<string,string|number>={...commonHeaders,'Content-Type':type,ETag:etag,'Accept-Ranges':'bytes','Cache-Control':path.startsWith('/_next/static/')?'public, max-age=31536000, immutable':'public, max-age=0, must-revalidate',Vary:'Accept-Encoding'};
 if(req.headers['if-none-match']===etag){res.writeHead(304,headers);res.end();return}
 let start=0,end=stat.size-1,status=200;
 if(req.headers.range&&!req.headers['if-range']){
  const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if(!match||(!match[1]&&!match[2]))return json(res,416,{error:'Invalid range.'},{'Content-Range':`bytes */${stat.size}`});
  if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(Number(match[2]),end)}
  else start=Math.max(0,stat.size-Number(match[2]));
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=stat.size)return json(res,416,{error:'Invalid range.'},{'Content-Range':`bytes */${stat.size}`});
  status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
 }
 const gzip=status===200&&/\bgzip\b(?!\s*;\s*q=0(?:[.,\s]|$))/.test(req.headers['accept-encoding']||'')&&/^(text\/|application\/json)/.test(type);
 if(gzip)headers['Content-Encoding']='gzip';else headers['Content-Length']=stat.size===0?0:end-start+1;
 res.writeHead(status,headers);
 if(req.method==='HEAD'||stat.size===0){res.end();return}
 // Stream geometry/images off disk instead of buffering the whole room in RAM.
 const stream=createReadStream(file,{start,end});
 if(gzip)await pipeline(stream,createGzip(),res);else await pipeline(stream,res);
}
const server=createServer(async(req,res)=>{
 try {
  const host=req.headers.host||'';
  const url=new URL(req.url||'/',`${onRailway?'https':'http'}://${host||'localhost'}`);
  if(url.pathname==='/healthz'){
   db.prepare('SELECT 1').get();return json(res,200,{ok:true});
  }
  if(!allowedHosts.has(host))return json(res,421,{error:'Unknown hostname.'});
  if(url.pathname.replace(/\/$/,'')!=='/api/fortunes')return await staticFile(req,res,url);
  if(req.method!=='GET'&&req.method!=='POST')return json(res,405,{error:'Method not allowed.'},{Allow:'GET, POST'});
  if(rateLimit(req.method))return json(res,429,{error:'Please give the cookie a moment and try again.'},{'Retry-After':String(Math.max(1,Math.ceil((60000-Date.now()+windowStart)/1000)))});
  if(Number(req.headers['content-length']||0)>512)return json(res,413,{error:'Request too large.'});
  const headers=new Headers();
  for(const name of ['content-type','content-length','origin','sec-fetch-site']){
   const value=req.headers[name];if(typeof value==='string')headers.set(name,value);
  }
  let payload:Buffer|undefined;
  try {if(req.method==='POST')payload=await body(req)}catch{return json(res,413,{error:'Request too large.'})}
  // Never forward client-supplied OpenAI identity headers on public hosting.
  const request=new Request(url,{method:req.method,headers,body:payload?.toString('utf8')});
  const response=await worker.fetch(request,{DB,PUBLIC_ACCESS:'shared',ASSETS:{fetch:async()=>new Response('Not found',{status:404})}});
  res.writeHead(response.status,{...commonHeaders,...Object.fromEntries(response.headers)});res.end(await response.text());
 }catch(error){
  if(res.headersSent){res.destroy();return}
  console.error('Request failed:',error instanceof Error?error.message:'Unknown error');json(res,503,{error:'The apartment is temporarily unavailable. Please try again.'});
 }
});
server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
server.listen(port,'0.0.0.0',()=>console.log(`Penthouse 22 listening on ${port}; public access; persistent fortune storage ready.`));
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{
 server.close(()=>{db.close();process.exit(0)});
 server.closeIdleConnections();setTimeout(()=>process.exit(1),10000).unref();
});
