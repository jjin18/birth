import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, stat, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { once } from 'node:events';
import { get } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { total,activeFortuneIds } from './fortune-test-data.mjs';

const temp=await mkdtemp(join(tmpdir(),'penthouse-railway-test-'));
const port=Number(process.env.TEST_PORT||3199),origin=`http://127.0.0.1:${port}`;
let child;
async function start(extra={}){
 child=spawn(process.execPath,['dist/railway/server.mjs'],{env:{...process.env,PORT:String(port),DATA_DIR:temp,RAILWAY_ENVIRONMENT_ID:'',RAILWAY_VOLUME_MOUNT_PATH:'',...extra},stdio:['ignore','pipe','pipe'],windowsHide:true});
 let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x);
 for(let i=0;i<100;i++){
  if(child.exitCode!==null)throw Error(logs);
  try{if((await fetch(origin+'/healthz')).ok)return}catch{}
  await new Promise(r=>setTimeout(r,50));
 }
 throw Error('Server did not start: '+logs);
}
async function stop(){if(!child||child.exitCode!==null)return;const exit=once(child,'exit');child.kill('SIGTERM');await exit}
const post=(id=crypto.randomUUID(),headers={},text)=>fetch(origin+'/api/fortunes',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:text??JSON.stringify({requestId:id})});
try {
 await start();
 const home=await fetch(origin+'/');assert.equal(home.status,200);assert.match(home.headers.get('content-type'),/text\/html/);assert(!home.redirected);assert.match(await home.text(),/Ryan/);
 const empty=await (await fetch(origin+'/api/fortunes')).json();assert.equal(empty.fortunes.length,0);
 const id=crypto.randomUUID(),response=await post(id);assert.equal(response.status,200);const first=await response.json();assert(first.fortune);
 assert.deepEqual(await (await post(id,{'oai-authenticated-user-id':'forged-account'})).json(),first);
 const draws=await Promise.all(Array.from({length:4},async()=>{const r=await post();assert.equal(r.status,200);return r.json()}));
 assert.equal(new Set([first.fortune.id,...draws.map(x=>x.fortune.id)]).size,5);
 assert.equal((await post(undefined,{Origin:'https://evil.example'})).status,403);
 assert.equal((await post(undefined,{Origin:''})).status,403);
 assert.equal((await post(undefined,{},'{broken')).status,400);
 assert.equal((await post(undefined,{},'x'.repeat(513))).status,413);
 assert.equal((await fetch(origin+'/api/fortunes',{method:'DELETE'})).status,405);
 const model='models/uploaded-bed-2k.glb',bytes=await readFile('dist/client/'+model);
 const head=await fetch(origin+'/'+model,{method:'HEAD'});assert.equal(Number(head.headers.get('content-length')),bytes.length);assert.equal((await head.arrayBuffer()).byteLength,0);
 const range=await fetch(origin+'/'+model,{headers:{Range:'bytes=0-31'}});assert.equal(range.status,206);assert.deepEqual(Buffer.from(await range.arrayBuffer()),bytes.subarray(0,32));
 assert.equal((await fetch(origin+'/'+model,{headers:{Range:'bytes=999999999-'}})).status,416);
 assert.equal((await fetch(origin+'/'+model,{headers:{'If-None-Match':head.headers.get('etag')}})).status,304);
 const versions=JSON.parse(await readFile('lib/asset-versions.json','utf8'));
 assert.match((await fetch(origin+'/'+model+'?v='+versions['/'+model],{method:'HEAD'})).headers.get('cache-control'),/immutable/);
 assert(!head.headers.get('cache-control').includes('immutable'));
 assert(!(await fetch(origin+'/'+model+'?v=wrong',{method:'HEAD'})).headers.get('cache-control').includes('immutable'));
 for(const encoding of ['br','gzip','identity']){
  const response=await fetch(origin+'/',{headers:{'Accept-Encoding':encoding}});assert.equal(response.status,200);
  assert.equal(response.headers.get('content-encoding'),encoding==='identity'?null:encoding);
  assert.match(await response.text(),/Ryan/);
 }
 const excluded=await fetch(origin+'/',{headers:{'Accept-Encoding':'br;q=0,gzip;q=0'}});assert.equal(excluded.headers.get('content-encoding'),null);
 const textRange=await fetch(origin+'/',{headers:{Range:'bytes=0-31','Accept-Encoding':'br'}});assert.equal(textRange.status,206);assert.equal(textRange.headers.get('content-encoding'),null);assert.equal((await textRange.arrayBuffer()).byteLength,32);
 assert.equal((await fetch(origin+'/.env')).status,404);
 assert.equal((await fetch(origin+'/server/railway.ts')).status,404);
 const foreignHost=await new Promise((resolveStatus,reject)=>{const request=get(origin+'/api/fortunes',{headers:{Host:'evil.example'}},response=>{response.resume();resolveStatus(response.statusCode)});request.on('error',reject)});
 assert.equal(foreignHost,421);
 for(let i=0;i<15;i++){const replay=await post(id);assert.equal(replay.status,200);assert.deepEqual(await replay.json(),first)}
 let limited;for(let i=0;i<13;i++){limited=await post();if(limited.status===429)break;await limited.text()}
 assert.equal(limited.status,429);assert(limited.headers.get('retry-after'));
 assert.deepEqual(await (await post(id)).json(),first,'retries of a saved cookie bypass the new-opening limit');
 const before=await (await fetch(origin+'/api/fortunes')).json();await stop();
 assert((await stat(join(temp,'fortunes.sqlite'))).size<1024*1024);
 await start();assert.deepEqual(await (await fetch(origin+'/api/fortunes')).json(),before);
 assert.deepEqual(await (await post(id)).json(),first);await stop();
 // Fill the disposable DB, then verify old request IDs stay idempotent even
 // when no fortunes remain. Never consume real production notes in tests.
 const db=new DatabaseSync(join(temp,'fortunes.sqlite'));
 const insert=db.prepare('INSERT OR IGNORE INTO opened_fortunes VALUES (?, ?, ?, ?)');
 for(const id of activeFortuneIds)insert.run(id,crypto.randomUUID(),'test-seed',new Date().toISOString());db.close();
 await start();assert.deepEqual(await (await post()).json(),{exhausted:true,total});assert.deepEqual(await (await post(id)).json(),first);await stop();
 const importDir=join(temp,'import-check'),imported=[{id:7,openedAt:'2026-09-25T00:00:00.000Z'},{id:19,openedAt:'2026-09-25T00:01:00.000Z'}];
 await start({DATA_DIR:importDir,FORTUNES_IMPORT_JSON:JSON.stringify(imported)});
 assert.deepEqual((await (await fetch(origin+'/api/fortunes')).json()).fortunes,[...imported].reverse());await stop();
 await start({DATA_DIR:importDir,FORTUNES_IMPORT_JSON:JSON.stringify(imported)});
 assert.equal((await (await fetch(origin+'/api/fortunes')).json()).fortunes.length,2);await stop();
 // An operator reset is one-time, privately backed up, and cannot be reversed
 // accidentally by a still-configured legacy import on a later deployment.
 const resetEnv={DATA_DIR:importDir,FORTUNES_IMPORT_JSON:JSON.stringify(imported),FORTUNES_RESET_KEY:'disposable-test-reset'};
 await start(resetEnv);
 assert.equal((await (await fetch(origin+'/api/fortunes')).json()).fortunes.length,0);
 const fresh=(await (await post()).json()).fortune;assert(fresh);await stop();
 await start(resetEnv);
 assert.deepEqual((await (await fetch(origin+'/api/fortunes')).json()).fortunes,[fresh]);await stop();
 await start({DATA_DIR:importDir,FORTUNES_IMPORT_JSON:JSON.stringify(imported),FORTUNES_RESET_KEY:''});
 assert.deepEqual((await (await fetch(origin+'/api/fortunes')).json()).fortunes,[fresh]);await stop();
 const resetDb=new DatabaseSync(join(importDir,'fortunes.sqlite'));
 assert.equal(resetDb.prepare('SELECT COUNT(*) AS n FROM fortune_reset_backup').get().n,2);
 assert.equal(resetDb.prepare('SELECT COUNT(*) AS n FROM fortune_resets').get().n,1);resetDb.close();
 await assert.rejects(start({DATA_DIR:join(temp,'invalid-import'),FORTUNES_IMPORT_JSON:'[{"id":999,"openedAt":"bad"}]'}),/Invalid fortune import/);
 await assert.rejects(start({RAILWAY_ENVIRONMENT_ID:'test-production'}),/Mount a Railway volume/);
 console.log('PASS: no-login room, shared notes, identity spoofing resistance, concurrent draws, restart persistence, legacy-note import, exhaustion, request guards, rate limits, exact streamed graphics, range/HEAD/ETag and durable-storage enforcement.');
}finally{
 await stop();const target=resolve(temp);assert(target.startsWith(resolve(tmpdir())+sep)&&target.includes('penthouse-railway-test-'));
 await rm(target,{recursive:true,force:true});
}
