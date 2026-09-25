import { total } from './fortune-test-data.mjs';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({ entryPoints: ['lib/fortune-api.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
const { getFortunes, openFortune } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const note = { id: 7, openedAt: '2026-09-25T00:00:00.000Z' };
const opened = { fortune: note, total }, archive = { fortunes: [note], total };
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
    JSON.parse(call.body).requestId===requestId && ['generic','joke'].includes(JSON.parse(call.body).kind) && call.credentials === 'same-origin' && call.cache === 'no-store'));
  assert(calls.every(call=>call.body===calls[0].body),'retries retain the same draw preference');
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
  responses(Response.json({error:'Slow down'},{status:429,headers:{'Retry-After':'28'}}));
  await assert.rejects(openFortune(requestId),e=>e.retryAfter===28&&e.retryable===false);assert.equal(calls.length,1,'429 must respect Retry-After, not hammer the server');
  responses(Response.json({error:'A unique opening ID is required.'},{status:400}));
  await assert.rejects(openFortune(''), /unique opening ID/); assert.equal(calls.length,1);
  for (const value of [{},null,{total},{fortune:{id:999,openedAt:note.openedAt},total},{fortune:note,exhausted:true,total}]) {
    responses(Response.json(value),Response.json(value),Response.json(value));
    await assert.rejects(openFortune(requestId), /try again/); assert.equal(calls.length,3);
  }
  responses(Response.json({fortunes:[note,note],total}),Response.json(archive));
  assert.deepEqual(await getFortunes(),archive);
  responses(Response.json({exhausted:true,total}));
  assert.deepEqual(await openFortune(requestId),{exhausted:true,total});
  responses(Response.json({removed:true,total}));
  assert.deepEqual(await openFortune(requestId),{removed:true,total});assert.equal(calls.length,1);
  responses(Response.json({fortunes:[note,{...note,id:10}],total}));
  assert.deepEqual(await getFortunes(),archive,'removed notes are filtered even from a stale archive');
  const secondId='12345678-1234-1234-1234-123456789abd';
  responses(Response.json({fortune:{...note,id:200},total}));
  await Promise.all([openFortune(secondId),openFortune(secondId)]);
  assert.equal(calls.length,1,'duplicate mounts share one in-flight request');
  assert.equal(JSON.parse(calls[0].body).kind,'joke','second successful opening requests a joke despite earlier retries');
  responses(Response.json(opened));await openFortune('12345678-1234-1234-1234-123456789abe');
  assert.equal(JSON.parse(calls[0].body).kind,'generic','normal fortunes resume after the joke');
  console.log('PASS: resilient JSON handling, bounded retries, stable IDs, auth/validation/exhaustion, duplicate-request coalescing and second-cookie joke timing.');
} finally { globalThis.fetch = realFetch; }
