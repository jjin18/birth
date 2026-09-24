import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { access } from 'node:fs/promises';
const cities=['tokyo','new-york','paris','taipei','san-francisco'];
const names=['Tokyo','New York','Paris','Taipei','San Francisco'];
for(const city of cities)for(const mode of ['dark','day','sunset'])await access(`public/cities/${city}${mode==='dark'?'':'-'+mode}.jpg`);
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
 page.setDefaultTimeout(60000);
 await page.clock.setFixedTime(new Date('2026-09-24T03:00:00Z'));
 page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
 const loaded=new Set();page.on('response',r=>{if(r.ok()&&r.url().includes('/cities/'))loaded.add(new URL(r.url()).pathname)});
 await page.goto('http://127.0.0.1:3023',{waitUntil:'networkidle',timeout:90000});
 await page.locator('.scene-layer canvas').waitFor();await page.waitForTimeout(4000);
 assert.equal(await page.locator('main').getAttribute('data-sky-mode'),'day','Tokyo at local noon');
 await page.screenshot({path:'preview-upgraded-day.png',timeout:60000});
 for(let i=0;i<cities.length;i++){
  await page.getByRole('button',{name:names[i],exact:true}).click();
  for(const mode of ['day','sunset','dark']){
   await page.getByRole('group',{name:'Sky mode'}).getByRole('button',{name:mode[0].toUpperCase()+mode.slice(1),exact:true}).click();
   await page.waitForTimeout(600);assert.equal(await page.locator('main').getAttribute('data-sky-mode'),mode);
  }
 }
 await page.waitForTimeout(1500);assert.equal(loaded.size,15,'all fifteen views must actually load');
 await page.getByRole('group',{name:'Sky mode'}).getByRole('button',{name:'Auto',exact:true}).click();
 assert.equal(await page.locator('main').getAttribute('data-sky-mode'),'dark','San Francisco at local evening');
 await page.getByRole('button',{name:'Taipei',exact:true}).click();await page.getByRole('button',{name:'Sunset',exact:true}).click();await page.waitForTimeout(2500);await page.screenshot({path:'preview-upgraded-sunset.png',timeout:60000});
 await page.getByRole('button',{name:'Panda Express · open a fortune cookie'}).click();await page.getByText('Saved to your shared paper clip.',{exact:true}).waitFor();
 const cookie=page.getByAltText('Golden baked fortune cookie');assert(await cookie.evaluate(image=>image.complete&&image.naturalWidth>0));
 assert.equal(await page.locator('.fortune-signature').textContent(),'Panda Express');
 assert((await page.locator('.fortune-slip').evaluate(el=>getComputedStyle(el).backgroundImage)).includes('fortune-paper.png'));
 await page.screenshot({path:'preview-realistic-fortune.png',timeout:60000});
 await page.getByRole('button',{name:/Your notes/}).click();await page.locator('.fortune-collection').waitFor();await page.screenshot({path:'preview-realistic-collection.png',timeout:60000});
 await page.close();
 const mobile=await browser.newPage({viewport:{width:390,height:844}});await mobile.goto('http://127.0.0.1:3023',{waitUntil:'networkidle',timeout:90000});await mobile.locator('.scene-layer canvas').waitFor();await mobile.waitForTimeout(3500);
 assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert(await mobile.getByRole('button',{name:'Sunset',exact:true}).isVisible());
 const controls=await mobile.locator('.sky-controls').boundingBox(),actions=await mobile.locator('.room-actions').boundingBox();assert(controls.y+controls.height<=actions.y,'sky and room controls must not overlap');
 await mobile.screenshot({path:'preview-upgraded-mobile.png',timeout:60000});
 await mobile.getByRole('button',{name:'Panda Express · open a fortune cookie'}).click();await mobile.getByText('Saved to your shared paper clip.',{exact:true}).waitFor();await mobile.screenshot({path:'preview-realistic-fortune-mobile.png',timeout:60000});
 assert.equal(await mobile.locator('dialog').evaluate(el=>el.scrollWidth>el.clientWidth),false,'fortune modal must not overflow');
 assert.deepEqual(errors,[]);console.log('PASS: fifteen loaded skyline views, automatic timing, manual controls, realistic cookie and paper, desktop/mobile layout, no browser errors.');
}finally{await browser.close()}
