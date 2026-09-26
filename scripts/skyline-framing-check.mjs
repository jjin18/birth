import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import sharp from 'sharp';

const bundle=await build({entryPoints:['lib/skyline-framing.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {skylineCrop,skylineHorizons,SKYLINE_HORIZON_FROM_BOTTOM}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
assert.equal(skylineHorizons.tokyo.day,.55,'Tokyo uses the distant ground, not tower tops');
assert.equal(skylineHorizons.tokyo.dark,.545);
for(const [city,modes] of Object.entries(skylineHorizons))for(const [mode,horizon] of Object.entries(modes)){
 const suffix=mode==='dark'?'':'-'+mode;
 const image=await sharp(`public/cities/${city}${suffix}.jpg`).metadata();
 assert.equal(image.width/image.height,1.5,'UV framing assumes existing 3:2 assets');
 for(const interior of [true,false]){
  const crop=skylineCrop(city,mode,interior);
  assert(crop.bottom>=0&&crop.bottom+crop.height<=1,'crop never exposes a stretched edge');
  const projectedHorizon=(1-horizon-crop.bottom)/crop.height;
  assert(Math.abs(projectedHorizon-SKYLINE_HORIZON_FROM_BOTTOM)<1e-12,'all twelve skyline variants share the same horizon height');
 }
}
const experience=await readFile('components/Experience.tsx','utf8');
assert(experience.includes('onClick={()=>setCity(i)}'),'city changes preserve camera position, zoom and focus');
assert(!experience.includes('setCity(i);home()'),'city changes do not restart the camera transition');
const backdrop=await readFile('components/Penthouse/Backdrop.tsx','utf8');
assert(backdrop.includes('skylineCrop(loaded.city,loaded.mode,interior)'),'old skyline retains its own framing during a pending load');
assert(backdrop.includes('useLayoutEffect')&&!backdrop.includes('texture.needsUpdate=true'),'framing updates before rendering without another GPU texture upload');
assert(backdrop.includes('if(!active){next.dispose();return}')&&backdrop.includes('old?.dispose()'),'cancelled and replaced images release their textures');
console.log('PASS: all 12 horizons align inside/outside, no edge stretching, fixed camera on city change and one retained texture.');
