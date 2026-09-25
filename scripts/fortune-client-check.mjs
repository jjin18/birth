import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['lib/fortune-api.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
const { getFortunes, openFortune } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const note = { id: 7, openedAt: '2026-09-25T00:00:00.000Z' };
const opened = { fortune: note, total: 200 }, archive = { fortunes: [note], total: 200 };
const realFetch = globalThis.fetch;
const requestId = '12345678-1234-1234-1234-123456789abc';
let calls;
function responses(...queue) {
  calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    assert(queue.length > 0, 'Unexpected extra retry');
    const next = queue.shift(); if (next instanceof Error) throw next;
    return typeof next === 'function' ? next() : next;
  };
}
function sameOpening() {
  assert(calls.every(call => call.url === '/api/fortunes' && call.method === 'POST' &&
    call.body === JSON.stringify({requestId}) && call.credentials === 'same-origin' && call.cache === 'no-store'));
}
try {
  responses(new Response('', {status:200}), Response.json(opened));
  assert.deepEqual(await openFortune(requestId), opened); assert.equal(calls.length,2); sameOpening();
  responses(new Response('{"fortune":', {headers:{'content-type':'application/json'}}), Response.json(opened));
  assert.deepEqual(await openFortune(requestId), opened); sameOpening();
  responses(new Response('<html>Gateway error</html>', {status:502,headers:{'content-type':'text/html'}}), Response.json(archive));
  assert.deepEqual(await getFortunes(), archive);
  responses(new TypeError('Failed to fetch'), new DOMException('Aborted','AbortError'), Response.json(opened));
  assert.deepEqual(await openFortune(requestId), opened); assert.equal(calls.length,3); sameOpening();
  responses(() => new Response(new ReadableStream({start(controller){controller.error(new Error('interrupted body'));}})), Response.json(opened));
  assert.deepEqual(await openFortune(requestId), opened); sameOpening();
  for (const status of [200,204,500,503]) {
    responses(...Array.from({length:3},()=>new Response(status===204?null:'',{status})));
    await assert.rejects(openFortune(requestId), error => /try again/i.test(error.message) && !/JSON|Unexpected|SyntaxError/i.test(error.message));
    assert.equal(calls.length,3); sameOpening();
  }
  responses(new Response('',{status:401}));
  await assert.rejects(getFortunes(), /reopen the apartment/); assert.equal(calls.length,1);
  responses(new Response('',{status:403}));
  await assert.rejects(openFortune(requestId), /reopen the apartment/); assert.equal(calls.length,1);
  responses(Response.json({error:'A unique opening ID is required.'},{status:400}));
  await assert.rejects(openFortune(''), /unique opening ID/); assert.equal(calls.length,1);
  for (const value of [{},null,{total:200},{fortune:{id:999,openedAt:note.openedAt},total:200},{fortune:note,exhausted:true,total:200}]) {
    responses(Response.json(value),Response.json(value),Response.json(value));
    await assert.rejects(openFortune(requestId), /try again/); assert.equal(calls.length,3);
  }
  responses(Response.json({fortunes:[note,note],total:200}),Response.json(archive));
  assert.deepEqual(await getFortunes(),archive);
  responses(Response.json({exhausted:true,total:200}));
  assert.deepEqual(await openFortune(requestId),{exhausted:true,total:200});
  console.log('PASS: empty/truncated/non-JSON responses, network/body interruptions, bounded retries, stable opening IDs, auth errors, payload validation and exhaustion.');
} finally { globalThis.fetch = realFetch; }
