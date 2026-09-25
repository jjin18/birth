import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import * as THREE from 'three';
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
try{
 const context=await browser.newContext({viewport:{width:1280,height:850},deviceScaleFactor:1.5});
 await context.addInitScript(()=>{window.barkStarts=0;const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){window.barkStarts++;return start.apply(this,args)}});
 const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
 let imacLoaded=false;page.on('response',r=>{if(r.url().endsWith('/textures/imac-reference.png')&&r.ok())imacLoaded=true});
 await page.goto('http://127.0.0.1:3023/',{waitUntil:'networkidle',timeout:90000});
 await page.getByRole('button',{name:'San Francisco',exact:true}).click();await page.getByRole('button',{name:'Day',exact:true}).click();await page.waitForTimeout(4000);
 await page.screenshot({path:'preview-terrier-workstation.png',timeout:60000});
 assert(!imacLoaded,'plain black iMac screen does not download the retired wallpaper');
 const box=await page.locator('canvas').boundingBox();
 const camera=new THREE.PerspectiveCamera(59,box.width/box.height,.08,100);camera.position.set(4.4,2.35,5.4);camera.lookAt(-.45,1.25,-.7);camera.updateMatrixWorld();
 const project=(p)=>{const v=new THREE.Vector3(...p).project(camera);return {x:box.x+(v.x*.5+.5)*box.width,y:box.y+(-v.y*.5+.5)*box.height}};
 const dog=project([.447,.586,3.053]);
 await page.screenshot({path:'preview-terrier-detail.png',clip:{x:Math.max(0,dog.x-140),y:Math.max(0,dog.y-155),width:280,height:Math.min(280,850-Math.max(0,dog.y-155))},timeout:60000});
 await page.mouse.click(dog.x,dog.y);assert.equal(await page.evaluate(()=>window.barkStarts),0,'dog clicks stay silent');
 assert.equal(await page.getByRole('dialog').count(),0,'dog click does not open other activities');
 console.log('Physical terrier click stays silent');
 await page.getByRole('button',{name:'Room overview',exact:true}).click();await page.waitForTimeout(3000);await page.screenshot({path:'preview-personalized-overview.png',timeout:60000});
 await page.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844}});
 await mobile.goto('http://127.0.0.1:3023/',{waitUntil:'networkidle',timeout:90000});await mobile.waitForTimeout(3500);await mobile.screenshot({path:'preview-personalized-mobile.png',timeout:60000});
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);console.log('PASS: iMac asset, silent terrier, workstation/room rendering, mobile, no browser errors.');
}finally{await browser.close()}
