import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const bundle = await build({bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'},stdin:{
  resolveDir:process.cwd(),loader:'tsx',contents:`
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import FortunePanel from './components/FortunePanel';
    const root=createRoot(document.getElementById('root'));
    window.showFortune=(mode,requestId,key)=>root.render(<FortunePanel key={key} mode={mode} requestId={requestId}
      close={()=>{}} onCollection={count=>{window.savedCount=count;}} onOpenClip={()=>{}} onAnother={()=>{}}/>);
  `,
}});
const browser=await chromium.launch({channel:'msedge',headless:true});
const note={id:7,openedAt:'2026-09-25T00:00:00.000Z'},id='12345678-1234-1234-1234-123456789abc';
try {
  const page=await browser.newPage({viewport:{width:1100,height:900},reducedMotion:'reduce'});
  const errors=[],posts=[]; let scenario='recover',gets=0;
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://fortune-panel.test/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/app.js"></script>'});
    if(path==='/app.js')return route.fulfill({contentType:'text/javascript',body:bundle.outputFiles[0].text});
    if(path==='/style.css')return route.fulfill({contentType:'text/css',body:readFileSync('app/globals.css')});
    if(path==='/favicon.ico')return route.fulfill({status:204,body:''});
    if(path==='/api/fortunes') {
      if(route.request().method()==='POST') {
        posts.push(JSON.parse(route.request().postData()));
        if(scenario==='fail'||(scenario==='recover'&&posts.length===1))return route.fulfill({status:200,contentType:'application/json',body:''});
        return route.fulfill({json:{fortune:note,total:200}});
      }
      gets++;
      if(scenario==='archive-fail')return route.fulfill({status:200,contentType:'application/json',body:''});
      return route.fulfill({json:{fortunes:[note],total:200}});
    }
    const root=resolve('public'),file=resolve(root,'.'+decodeURIComponent(path));assert(file.startsWith(root+sep));
    return route.fulfill({body:readFileSync(file),contentType:'image/png'});
  });
  await page.goto('http://fortune-panel.test/');
  await page.evaluate(id=>window.showFortune('fortune',id,1),id);
  await page.locator('.fortune-crack').waitFor();
  await page.getByText('Saved to your shared paper clip.',{exact:true}).waitFor();
  assert.equal(posts.length,2);assert(posts.every(post=>post.requestId===id));
  assert.equal(await page.locator('[role="alert"]').count(),0);
  scenario='archive-fail';gets=0;
  await page.evaluate(id=>window.showFortune('fortune',id,2),id);
  await page.getByText('Your saved notes will refresh when you open the paper clip.',{exact:true}).waitFor();
  assert.equal(gets,3);assert.equal(await page.locator('.fortune-crack').count(),1);
  assert.equal(await page.locator('[role="alert"]').count(),0);
  await page.screenshot({path:'preview-fortune-recovery.png'});
  scenario='fail';
  await page.evaluate(id=>window.showFortune('fortune',id,3),id);
  await page.getByRole('alert').waitFor();
  assert.match(await page.getByRole('alert').innerText(),/Please try again/);
  assert.doesNotMatch(await page.getByRole('alert').innerText(),/Unexpected|JSON|SyntaxError/);
  scenario='success';
  await page.getByRole('button',{name:'Try again',exact:true}).click();
  await page.locator('.fortune-crack').waitFor();
  assert(posts.every(post=>post.requestId===id),'automatic and manual retries must use the original ID');
  scenario='archive-fail';
  await page.evaluate(id=>window.showFortune('paperclip',id,4),id);
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByText('Nothing clipped yet.').count(),0,'invalid JSON must not become an empty collection');
  assert.deepEqual(errors,[]);
  console.log('PASS: fortune modal recovers empty responses, keeps a confirmed saved note when collection refresh fails, retries the same opening, and never reports a failed archive as empty.');
} finally { await browser.close(); }
