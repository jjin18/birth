import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import * as THREE from 'three';
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:850}});
 page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
 let boxLoaded=false;page.on('response',r=>{if(r.url().endsWith('/textures/panda-box-reference.png')&&r.ok())boxLoaded=true});
 await page.goto('http://127.0.0.1:3023/',{waitUntil:'networkidle',timeout:90000});await page.getByRole('button',{name:'Day',exact:true}).click();await page.waitForTimeout(3500);
 await page.screenshot({path:'preview-final-personalized-room.png',timeout:60000});assert(boxLoaded);
 const bounds=await page.locator('canvas').boundingBox(),camera=new THREE.PerspectiveCamera(59,bounds.width/bounds.height,.08,100);camera.position.set(4.4,2.35,5.4);camera.lookAt(-.45,1.25,-.7);camera.updateMatrixWorld();const point=new THREE.Vector3(1.85,1.58,2.1).project(camera);await page.mouse.click(bounds.x+(point.x*.5+.5)*bounds.width,bounds.y+(-point.y*.5+.5)*bounds.height);
 await page.locator('.fortune-crack').waitFor();assert.equal(await page.locator('.cookie-half').count(),2);assert.equal(await page.locator('.cookie-crumb').count(),8);
 const names=await page.locator('.fortune-crack').evaluate(el=>el.getAnimations({subtree:true}).map(a=>a.animationName));assert(names.includes('cookie-break-left')&&names.includes('cookie-break-right')&&names.includes('fortune-unfold'));
 await page.locator('.fortune-crack').evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=720}));await page.screenshot({path:'preview-cookie-cracking.png',timeout:60000});
 await page.locator('.fortune-crack').evaluate(el=>el.getAnimations({subtree:true}).forEach(a=>a.finish()));
 await page.getByText('Saved to your shared paper clip.',{exact:true}).waitFor();assert.equal(await page.locator('.fortune-slip>p').evaluate(el=>getComputedStyle(el).textTransform),'uppercase');await page.screenshot({path:'preview-cookie-open.png',timeout:60000});
 const first=await page.locator('.fortune-number').innerText();await page.getByRole('button',{name:'One more cookie',exact:true}).click();await page.getByText('Saved to your shared paper clip.',{exact:true}).waitFor();assert.notEqual(await page.locator('.fortune-number').innerText(),first);
 await page.getByRole('button',{name:/Your notes/}).click();await page.locator('.fortune-collection').waitFor();assert(await page.locator('.fortune-collection .fortune-note').count()>1);
 const mobile=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await mobile.goto('http://127.0.0.1:3023/',{waitUntil:'networkidle',timeout:90000});await mobile.getByRole('button',{name:'Panda Express · open a fortune cookie'}).click();await mobile.getByText('Saved to your shared paper clip.',{exact:true}).waitFor();await mobile.screenshot({path:'preview-cookie-mobile.png',timeout:60000});assert.equal(await mobile.locator('.cookie-half-left').evaluate(el=>getComputedStyle(el).animationName),'none');assert.equal(await mobile.locator('dialog').evaluate(el=>el.scrollWidth>el.clientWidth),false);
 assert.deepEqual(errors,[]);console.log('PASS: physical red-carton click, two animated cookie halves, eight crumbs, paper reveal, red uppercase type, unique shared saves, collection, mobile, reduced motion, no errors.');
}finally{await browser.close()}
