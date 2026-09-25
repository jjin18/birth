import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare,convertV4MiniflareOptions } from 'miniflare';
import { transform, build } from 'esbuild';
import { activeFortuneIds,genericFortuneIds,jokeFortuneIds,total } from './fortune-test-data.mjs';

const source=await readFile('lib/fortunes.ts','utf8');
const {code}=await transform(source,{loader:'ts',format:'esm'});
const {fortunes}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
assert.equal(fortunes.length,209);
assert.equal(new Set(fortunes.map(f=>f.trim().toLowerCase())).size,fortunes.length);
// Compile only this test's legacy runtime; Railway builds no longer emit it.
const worker=await build({entryPoints:['worker/index.ts'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'});
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:worker.outputFiles[0].text,compatibilityDate:'2026-09-01',d1Databases:['DB'],bindings:{LOCAL_PREVIEW:'1'}}));
try {
 const db=await mf.getD1Database('DB');
 const sql=await readFile('drizzle/0000_modern_grey_gargoyle.sql','utf8');
 for(const statement of sql.split('--> statement-breakpoint'))await db.prepare(statement.trim()).run();
 const post=async(requestId=crypto.randomUUID(),kind='generic')=>{
  const response=await mf.dispatchFetch('http://localhost/api/fortunes',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost'},body:JSON.stringify({requestId,kind})});
  assert.equal(response.status,200);return response.json();
 };
 const requestId=crypto.randomUUID();
 const first=await post(requestId),retry=await post(requestId);
 assert.deepEqual(first,retry,'retry must reuse exactly the same fortune');
 assert(genericFortuneIds.includes(first.fortune.id));
 const second=await post(crypto.randomUUID(),'joke');assert(jokeFortuneIds.includes(second.fortune.id),'second cookie can request an inside joke');
 const concurrent=await Promise.all(Array.from({length:19},()=>post()));
 const ids=new Set([first.fortune.id,second.fortune.id,...concurrent.map(x=>x.fortune.id)]);
 assert.equal(ids.size,21,'concurrent devices must receive unique fortunes');
 for(let i=21;i<total;i++){const next=await post();assert(!ids.has(next.fortune.id));ids.add(next.fortune.id)}
 assert.deepEqual([...ids].sort((a,b)=>a-b),[...activeFortuneIds].sort((a,b)=>a-b),'retired generic notes are never drawn');
 assert.equal((await post()).exhausted,true);
 assert.deepEqual(await post(requestId),first,'retry after exhaustion must still return the original note');
 const collection=await (await mf.dispatchFetch('http://localhost/api/fortunes',{headers:{'oai-authenticated-user-id':'another-device'}})).json();
 assert.equal(collection.fortunes.length,total,'the paper clip must be shared across devices');
 await db.prepare('INSERT INTO opened_fortunes VALUES (1,?,?,?)').bind(crypto.randomUUID(),'legacy','2026-09-25T00:00:00.000Z').run();
 const legacy=await (await mf.dispatchFetch('http://localhost/api/fortunes')).json();
 assert.equal(legacy.fortunes.length,total+1,'retired notes remain in the saved collection');
 assert.equal((await post()).exhausted,true,'retired notes do not affect active-pool exhaustion');
 assert.equal((await mf.dispatchFetch('https://example.com/api/fortunes')).status,401);
 assert.equal((await mf.dispatchFetch('http://localhost/api/fortunes',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID()})})).status,403);
 console.log('PASS: entire fortune pool including inside jokes, concurrent draws, retry safety, shared collection, exhaustion and access guards.');
}finally{await mf.dispose()}
