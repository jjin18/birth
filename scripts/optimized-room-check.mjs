import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import * as THREE from 'three';

const expected=JSON.parse(readFileSync('lib/site-assets.json','utf8')).models.map(file=>'/'+file).sort();
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1100,height:800}});
  const errors=[],models=new Set();
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('requestfinished',request=>{const path=new URL(request.url()).pathname;if(path.endsWith('.glb'))models.add(path);});
  await page.addInitScript(()=>{
    window.packedUploads=0;
    window.barkStarts=0;
    const start=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args){window.barkStarts++;return start.apply(this,args);};
    const upload=WebGL2RenderingContext.prototype.texStorage2D;
    WebGL2RenderingContext.prototype.texStorage2D=function(...args){
      if(args[2]===33323||args[2]===33321)window.packedUploads++;
      return upload.apply(this,args);
    };
  });
  await page.goto('http://127.0.0.1:3023/',{waitUntil:'networkidle',timeout:90000});
  await page.waitForFunction(()=>window.packedUploads>=6,undefined,{timeout:90000});
  assert.deepEqual([...models].sort(),expected,'only the six retained models should be requested');
  assert.deepEqual(await page.locator('button:visible').allTextContents(),['Step outside','Tokyo','New York','Taipei','San Francisco']);
  await page.screenshot({path:'preview-optimized-room.png',timeout:60000});
  // Click the real dog mesh at its current room placement, not a UI shortcut.
  const source=readFileSync('components/Penthouse/RoomObjects.tsx','utf8');
  const dogPosition=source.match(/name="white-dog" position=\{\[([^\]]+)\]/)[1].split(',').map(Number);
  const bounds=await page.locator('canvas').boundingBox();
  const camera=new THREE.PerspectiveCamera(59,bounds.width/bounds.height,.08,100);
  camera.position.set(4.4,2.35,5.4);camera.lookAt(-.45,1.25,-.7);camera.updateMatrixWorld();
  const point=new THREE.Vector3(dogPosition[0],dogPosition[1]+.2,dogPosition[2]).project(camera);
  await page.mouse.click(bounds.x+(point.x*.5+.5)*bounds.width,bounds.y+(-point.y*.5+.5)*bounds.height);
  await page.waitForFunction(()=>window.barkStarts>0,undefined,{timeout:10000});
  assert.deepEqual(errors,[]);
  console.log('PASS: final room renders with packed textures, only six current model downloads, no couch request, minimal opening controls, clickable barking dog and no browser errors.');
} finally { await browser.close(); }
