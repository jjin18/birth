import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {build} from 'esbuild';
const bundled=await build({entryPoints:['lib/room-camera.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {roomOpening,containRoomCamera,cameraBounds}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
for(const x of [-100,-5,0,5,100])for(const y of [-100,0,3,6,100])for(const z of [-100,0,12,100]){const p={x,y,z};containRoomCamera(p);assert(p.x>=cameraBounds.minX&&p.x<=cameraBounds.maxX);assert(p.y>=cameraBounds.minY&&p.y<=cameraBounds.maxY);assert(p.z>=cameraBounds.minZ&&p.z<=cameraBounds.maxZ)}
for(const [width,height] of [[1280,850],[390,844]]){const opening=roomOpening(width,height);assert(opening.position[1]<cameraBounds.maxY);assert((opening.position[2]-3.5)*Math.tan(opening.fov*Math.PI/360)*(width/height)>5.5,'whole room fits horizontally')}
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:850}});
 page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:3023/',{waitUntil:'networkidle',timeout:90000});
 await page.waitForTimeout(4500);await page.screenshot({path:'preview-final-interior.png'});
 const found=await page.evaluate(()=>{
  const canvas=document.querySelector('canvas');
  let fiber=canvas[Object.keys(canvas).find(k=>k.startsWith('__reactFiber'))];
  const seen=new Set();
  function inspect(value,depth=0){if(!value||typeof value!=='object'||seen.has(value)||depth>3)return null;seen.add(value);if(typeof value.getState==='function'){const state=value.getState();if(state.camera&&state.scene)return value}for(const key of ['current','memoizedState','baseState','store','value']){const result=inspect(value[key],depth+1);if(result)return result}return null}
  while(fiber){let hook=fiber.memoizedState;while(hook){const store=inspect(hook);if(store){window.__cameraTestStore=store;return true}hook=hook.next}fiber=fiber.return}return false;
 });
 console.log('Live camera probe:',found);
 if(found){
  await page.evaluate(()=>{window.__cameraPositions=[];window.__cameraTestActive=true;const sample=()=>{if(!window.__cameraTestActive)return;window.__cameraPositions.push(window.__cameraTestStore.getState().camera.position.toArray());requestAnimationFrame(sample)};sample()});
 }
 for(const [dx,dy,wheel] of [[450,-550,5000],[-650,650,-5000],[0,-650,5000],[650,0,5000]]){
  await page.mouse.move(640,420);await page.mouse.down();await page.mouse.move(640+dx,420+dy,{steps:15});await page.mouse.up();await page.mouse.wheel(0,wheel);await page.waitForTimeout(500);
 }
 await page.screenshot({path:'preview-camera-limits.png'});
 if(found){const points=await page.evaluate(()=>{window.__cameraTestActive=false;return window.__cameraPositions});assert(points.length>10);for(const [x,y,z] of points){assert(y<=5.20001&&y>=.64999,'camera remains below ceiling and above floor');assert(x>=-4.55001&&x<=4.55001&&z>=-2.95001&&z<=21.50001,'camera remains inside walls')}console.log('Validated',points.length,'live camera positions')}
 const mobile=await browser.newPage({viewport:{width:390,height:844}});await mobile.goto('http://127.0.0.1:3023/',{waitUntil:'networkidle',timeout:90000});await mobile.waitForTimeout(3500);await mobile.screenshot({path:'preview-final-mobile.png'});assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);console.log('PASS: raised ceiling, responsive whole-room framing, camera containment, browser interactions, no runtime errors.');
}finally{await browser.close()}
