// Every write in this test is to a disposable loopback server and temporary DB.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {once} from 'node:events';
import {DatabaseSync} from 'node:sqlite';
import sharp from 'sharp';
import {build} from 'esbuild';
const temp=await mkdtemp(join(tmpdir(),'birthday-wall-test-')),port=3198,origin=`http://127.0.0.1:${port}`;
let child;
async function start(){
 child=spawn(process.execPath,['dist/railway/server.mjs'],{env:{...process.env,PORT:String(port),DATA_DIR:temp,RAILWAY_ENVIRONMENT_ID:'',RAILWAY_VOLUME_MOUNT_PATH:'',FORTUNES_RESET_KEY:'',FORTUNES_IMPORT_JSON:'',WALL_EDIT_PASSCODE:'',WALL_SESSION_SECRET:''},stdio:['ignore','pipe','pipe'],windowsHide:true});
 let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
 for(let i=0;i<100;i++){if(child.exitCode!==null)throw Error(logs);try{if((await fetch(origin+'/healthz')).ok)return}catch{}await new Promise(r=>setTimeout(r,50))}
 throw Error('Server did not start: '+logs);
}
async function stop(){if(!child||child.exitCode!==null)return;const done=once(child,'exit');child.kill('SIGTERM');await done}
const get=async()=>await (await fetch(origin+'/api/wall')).json();
const send=(path,value,method='POST',headers={})=>fetch(origin+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(value)});
const upload=(bytes,headers={})=>fetch(origin+'/api/wall/upload',{method:'POST',headers:{Origin:origin,'Content-Type':'image/jpeg',...headers},body:bytes});
try{
 await start();const baseline=await get();assert.equal(baseline.entries.length,11);assert.equal(baseline.canEdit,true);assert(baseline.entries.some(p=>p.id==='dinner'));assert(!baseline.entries.some(p=>p.id==='dinner-close'));
 const note={id:crypto.randomUUID(),title:'A written memory',note:'A lovely date\nAnd another line.',date:'2026-01-02'};
 assert.equal((await send('/api/wall',note,'POST',{Origin:'https://evil.example'})).status,403);
 assert.equal((await send('/api/wall',note,'POST',{Origin:''})).status,403);
 assert.equal((await send('/api/wall',{...note,date:'2026-02-30'})).status,400);
 assert.equal((await send('/api/wall',{...note,title:'x'.repeat(121)})).status,400);
 assert.equal((await send('/api/wall',{...note,note:'x'.repeat(9000)})).status,413);
 assert.equal((await send('/api/wall',note)).status,200);assert.equal((await send('/api/wall',note)).status,200);assert.equal((await get()).entries.length,12);
 const edit={title:'Our curry date',note:'Remember this?',date:'2026-04-02',version:1};assert.equal((await send('/api/wall/curry',edit,'PATCH')).status,200);assert.equal((await send('/api/wall/curry',edit,'PATCH')).status,409);
 const source=await sharp({create:{width:1200,height:900,channels:3,background:'#77aa55'}}).withExif({IFD0:{Make:'PRIVATE CAMERA'},IFD2:{DateTimeOriginal:'2025:06:07 14:15:16'}}).jpeg().toBuffer();
 assert((await sharp(source).metadata()).exif,'fixture must contain real EXIF');
 const uploaded=await upload(source);assert.equal(uploaded.status,201);const photo=await uploaded.json();assert.equal(photo.date,'2025-06-07');assert(photo.bytes<100000);
 assert.equal((await fetch(origin+photo.thumbnail)).status,200,'public editor can preview a draft via its unguessable upload id');
 assert.equal((await fetch(origin+photo.thumbnail)).status,200);
 const withPhoto={id:crypto.randomUUID(),title:'An uploaded date',note:'From the camera date',date:photo.date,uploadId:photo.uploadId};assert.equal((await send('/api/wall',withPhoto)).status,200);
 assert.equal((await send('/api/wall',{...withPhoto,id:crypto.randomUUID()})).status,400,'uploads can only be published once');
 for(const suffix of ['.webp','-thumb.webp']){
  const r=await fetch(origin+'/api/wall/images/'+photo.uploadId+suffix);assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/immutable/);
  const meta=await sharp(Buffer.from(await r.arrayBuffer())).metadata();assert(!meta.exif&&!meta.xmp&&!meta.iptc);assert.equal(meta.format,'webp');assert(Math.max(meta.width,meta.height)<=(suffix.startsWith('-')?360:1600));
 }
 const noExif=await sharp(source).jpeg().toBuffer();const noDate=await (await upload(noExif)).json();assert.equal(noDate.date,null);
 assert.equal((await upload(Buffer.from('not an image'))).status,415);assert.equal((await upload(source,{'Content-Type':'image/svg+xml'})).status,415);
 assert.equal((await fetch(origin+'/api/wall/images/'+photo.uploadId+'.txt')).status,404);
 assert.equal((await fetch(origin+'/api/wall/images/fortunes.sqlite')).status,404);
 const saved=await get();await stop();await start();const persisted=await get();assert.deepEqual(persisted.entries,saved.entries);assert.equal(persisted.entries.find(p=>p.id==='curry').title,edit.title);assert.equal(persisted.canEdit,true,'public editing survives a server restart');
 assert.equal((await fetch(origin+'/api/fortunes').then(r=>r.json())).fortunes.length,0,'fortune collection must be untouched');
 // Read the actual persisted normalized copies, then exercise quota/expiry safely.
 const db=new DatabaseSync(join(temp,'fortunes.sqlite'));assert.equal(db.prepare('SELECT COUNT(*) AS n FROM wall_uploads').get().n,1);
 db.prepare('UPDATE wall_uploads SET created=0 WHERE id=?').run(noDate.uploadId);
 await upload(noExif);assert(!(await readdir(join(temp,'wall-images'))).includes(noDate.uploadId+'.webp'),'expired draft removed');
 db.prepare('UPDATE wall_entries SET bytes=? WHERE id=?').run(100*1024*1024,withPhoto.id);assert.equal((await upload(source)).status,507);db.close();
 const retiredSession=await send('/api/wall/session',{});assert.equal(retiredSession.status,404);
 let limited;for(let i=0;i<35;i++){limited=await send('/api/wall',{id:crypto.randomUUID(),title:'Rate-limit fixture',note:'',date:null});if(limited.status===429)break}assert.equal(limited.status,429,'public writes stay rate limited');
 // Fuzz the bounds-safe metadata reader without importing app runtime state.
 const built=await build({entryPoints:['server/photo-date.ts'],bundle:true,write:false,format:'esm',platform:'node'});
 const {photoDate,validDate}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].contents).toString('base64'));
 assert.equal(photoDate((await sharp(source).metadata()).exif),'2025-06-07');assert.equal(validDate('2025-02-29'),false);assert.equal(validDate('2024-02-29'),true);
 for(let i=0;i<256;i++)assert.equal(photoDate(Buffer.alloc(i,255)),null);
 const lock=JSON.parse(await readFile('server/runtime/package-lock.json','utf8'));assert(lock.packages['node_modules/@img/sharp-linux-x64']);
 console.log('PASS: 11 seeds, public editing and same-origin guards, metadata date, manual date, text-only notes, idempotent adds, version conflicts, durable edits/photos, sanitized bounded uploads, unguessable draft IDs, quotas, expiry, write rate limits, and untouched fortunes.');
}finally{await stop();const target=resolve(temp);assert(target.startsWith(resolve(tmpdir())+sep)&&target.includes('birthday-wall-test-'));await rm(target,{recursive:true,force:true})}
