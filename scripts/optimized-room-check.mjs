import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

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
  assert.deepEqual(errors,[]);
  console.log('PASS: final room renders with packed textures, only six current model downloads, no couch request, minimal opening controls and no browser errors.');
} finally { await browser.close(); }
