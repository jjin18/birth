import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {brotliDecompressSync,gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:"export * from './lib/render-budget';export * from './server/static-encoding';export * from './lib/asset-url';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const {renderMode,FrameBudget,acceptedEncodings,assetUrl}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
assert.equal(renderMode(true,false,1,100),'paused');assert.equal(renderMode(false,true,101,100),'paused');assert.equal(renderMode(false,true,90,100),'active');assert.equal(renderMode(false,false,101,100),'idle');
const budget=new FrameBudget();for(let i=0;i<1000;i++)budget.sample(67,false);assert.equal(budget.tier,0,'idle frame cap is not mistaken for a slow GPU');
for(let i=0;i<180;i++)budget.sample(16,true);assert.equal(budget.tier,0);for(let i=0;i<90;i++)budget.sample(40,true);assert.equal(budget.tier,1);for(let i=0;i<180;i++)budget.sample(40,true);assert.equal(budget.tier,2);for(let i=0;i<180;i++)budget.sample(16,true);assert.equal(budget.tier,2,'no quality oscillation');
assert.deepEqual(acceptedEncodings('gzip, br'),['br','gzip']);assert.deepEqual(acceptedEncodings('br;q=0, gzip;q=.5'),['gzip']);assert.deepEqual(acceptedEncodings('gzip;q=1, br;q=.8'),['gzip','br']);assert.deepEqual(acceptedEncodings('br;q=0,gzip;q=0'),[]);assert.deepEqual(acceptedEncodings('*;q=.5,br;q=0'),['gzip']);
const versions=JSON.parse(await readFile('lib/asset-versions.json','utf8'));
for(const [path,hash] of Object.entries(versions)){assert.equal(createHash('sha256').update(await readFile('public'+path)).digest('hex').slice(0,16),hash);assert.equal(assetUrl(path),path+'?v='+hash)}
assert.equal(assetUrl('/api/wall/images/example.webp'),'/api/wall/images/example.webp');
const html=await readFile('dist/client/index.html');assert.deepEqual(brotliDecompressSync(await readFile('dist/client/index.html.br')),html);assert.deepEqual(gunzipSync(await readFile('dist/client/index.html.gz')),html);
const modal=await readFile('components/Modal.tsx','utf8');assert(modal.includes('tabIndex={-1} autoFocus')&&modal.includes('el?.focus({preventScroll:true})'),'modal explicitly focuses itself instead of glowing Step inside');
const css=await readFile('app/globals.css','utf8');assert(!css.includes('fonts.googleapis.com'));const media=await readdir('dist/client/_next/static/media');assert(media.filter(p=>p.endsWith('.woff2')).length>=2);
console.log('PASS: render pause/idle/active policy, adaptive-quality guard, versioned assets, local fonts, Brotli/gzip, encoding exclusions, and popup focus target.');
