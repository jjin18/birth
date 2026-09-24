import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare,convertV4MiniflareOptions } from 'miniflare';
import { transform } from 'esbuild';

const source=await readFile('lib/fortunes.ts','utf8');
const {code}=await transform(source,{loader:'ts',format:'esm'});
const {fortunes}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
assert.equal(fortunes.length,200);
assert.equal(new Set(fortunes.map(f=>f.trim().toLowerCase())).size,200);
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:'dist/server/index.js',compatibilityDate:'2026-09-01',d1Databases:['DB'],bindings:{LOCAL_PREVIEW:'1'}}));
try {
 const db=await mf.getD1Database('DB');
 const sql=await readFile('drizzle/0000_modern_grey_gargoyle.sql','utf8');
 for(const statement of sql.split('--> statement-breakpoint'))await db.prepare(statement.trim()).run();
 const post=async(requestId=crypto.randomUUID(),extra={})=>{
  const response=await mf.dispatchFetch('http://localhost/api/fortunes',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost',...extra},body:JSON.stringify({requestId})});
  assert.equal(response.status,200);return response.json();
 };
 const requestId=crypto.randomUUID();
 const first=await post(requestId),retry=await post(requestId);
 assert.deepEqual(first,retry,'retry must reuse exactly the same fortune');
 const concurrent=await Promise.all(Array.from({length:20},()=>post()));
 const ids=new Set([first.fortune.id,...concurrent.map(x=>x.fortune.id)]);
 assert.equal(ids.size,21,'concurrent devices must receive unique fortunes');
 for(let i=21;i<200;i++){const next=await post();assert(!ids.has(next.fortune.id));ids.add(next.fortune.id)}
 assert.equal(ids.size,200);
 assert.equal((await post()).exhausted,true);
 assert.deepEqual(await post(requestId),first,'retry after exhaustion must still return the original note');
 const collection=await (await mf.dispatchFetch('http://localhost/api/fortunes',{headers:{'oai-authenticated-user-id':'another-device'}})).json();
 assert.equal(collection.fortunes.length,200,'the paper clip must be shared across devices');
 assert.equal((await mf.dispatchFetch('https://example.com/api/fortunes')).status,401);
 assert.equal((await mf.dispatchFetch('http://localhost/api/fortunes',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID()})})).status,403);
 console.log('PASS: 200 unique fortunes, concurrent draws, retry safety, shared collection, exhaustion and access guards.');
}finally{await mf.dispose()}
