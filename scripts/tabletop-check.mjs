import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

// Exercise the actual tabletop components in isolation from the large room GLBs.
const { outputFiles } = await build({
  bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'unrelated-room-models', setup(build) {
    build.onResolve({ filter: /^\.\/Imported(Dog|Lamp)$/ }, args => ({ path: args.path, namespace: 'unused-room-model' }));
    build.onLoad({ filter: /.*/, namespace: 'unused-room-model' }, () => ({ contents: 'export default function UnusedModel(){return null;}' }));
  } }],
  stdin: { loader: 'tsx', resolveDir: process.cwd(), contents: `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { Canvas } from '@react-three/fiber';
    import * as THREE from 'three';
    import FortuneTable from './components/Penthouse/FortuneTable';
    window.tableClicks = [];
    createRoot(document.getElementById('root')).render(
      <Canvas dpr={1} camera={{position:[4.5,3.4,5.5],fov:42}} onCreated={({scene,camera})=>{camera.lookAt(2.3,.7,2.1);window.tableState={scene,camera,THREE};}}>
        <color attach="background" args={['#596169']}/>
        <ambientLight intensity={2}/><directionalLight position={[3,5,4]} intensity={3}/>
        <FortuneTable count={12} onFortune={()=>window.tableClicks.push('fortune')} onPaperclip={()=>window.tableClicks.push('paperclip')} onGloves={()=>window.tableClicks.push('gloves')}/>
      </Canvas>);
  ` },
});
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
assert(!readFileSync('components/Penthouse/Scene.tsx','utf8').includes('<Cylinder'), 'The old wooden table and cylinder must be removed');
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('http://tabletop.test/**', route => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname);
    if (path === '/') return route.fulfill({ contentType: 'text/html', body: '<html><body style="margin:0"><div id="root" style="width:100vw;height:100vh"></div><script src="/app.js"></script></body></html>' });
    if (path === '/app.js') return route.fulfill({ contentType: 'text/javascript', body: outputFiles[0].text });
    if (path === '/favicon.ico') return route.fulfill({ status: 204, body: '' });
    const publicRoot = resolve('public'), file = resolve(publicRoot, '.' + path);
    assert(file.startsWith(publicRoot + sep));
    const contentType = path.endsWith('.wasm') ? 'application/wasm' : path.endsWith('.js') ? 'text/javascript' : path.endsWith('.png') ? 'image/png' : 'model/gltf-binary';
    return route.fulfill({ contentType, body: readFileSync(file) });
  });
  await page.goto('http://tabletop.test/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.tableState?.scene.getObjectByName('boxing-gloves'), undefined, { timeout: 60000 });
  const report = await page.evaluate(() => {
    const { scene, camera, THREE } = window.tableState;
    scene.updateMatrixWorld(true);
    const table = scene.getObjectByName('uploaded-flower-table');
    const tableBounds = new THREE.Box3().setFromObject(table);
    const surface = tableBounds.max.y;
    const names = ['panda-express', 'fortune-paperclip', 'boxing-gloves'];
    const objects = names.map(name => {
      const object = scene.getObjectByName(name), bounds = new THREE.Box3().setFromObject(object);
      const center = bounds.getCenter(new THREE.Vector3());
      const ray = new THREE.Raycaster(new THREE.Vector3(center.x, surface + 2, center.z), new THREE.Vector3(0, -1, 0));
      return { name, min: bounds.min.toArray(), max: bounds.max.toArray(), width: bounds.max.x-bounds.min.x, supported: ray.intersectObject(table,true).some(hit=>Math.abs(hit.point.y-surface)<.025) };
    });
    const gloves = objects.find(object=>object.name==='boxing-gloves');
    const gloveCornersSupported = [gloves.min[0],gloves.max[0]].every(x=>[gloves.min[2],gloves.max[2]].every(z=>{
      const ray = new THREE.Raycaster(new THREE.Vector3(x,surface+2,z),new THREE.Vector3(0,-1,0));
      return ray.intersectObject(table,true).some(hit=>Math.abs(hit.point.y-surface)<.025);
    }));
    let importedLights = 0; table.traverse(node=>{if(node.isLight)importedLights++});
    const tabletopChildren = scene.getObjectByName('tabletop-objects').children.map(child=>child.name).sort();
    return { tableMin: tableBounds.min.toArray(), tableMax: tableBounds.max.toArray(), surface, objects, gloveCornersSupported, importedLights, tabletopChildren };
  });
  console.log(JSON.stringify(report));
  await page.screenshot({path:'preview-tabletop.png',timeout:60000});
  assert(Math.abs(report.tableMin[1]-.075)<.002, 'Table rests on the floor');
  assert.equal(report.importedLights,0);
  assert.deepEqual(report.tabletopChildren,['boxing-gloves','fortune-paperclip','panda-express'], 'No cylinder remains');
  assert(report.objects.every(object=>object.supported),'All objects sit over the tabletop');
  assert(report.gloveCornersSupported,'The entire glove hitbox fits inside the tabletop outline');
  const paper = report.objects.find(object=>object.name==='fortune-paperclip');
  const panda = report.objects.find(object=>object.name==='panda-express');
  assert(paper.width<.25,'Paper stack is much smaller');
  assert(paper.min[0]-panda.max[0]>.01 && paper.min[0]-panda.max[0]<.22,'Paper stack sits directly beside the Panda box');
  assert(paper.min[1]>=report.surface && paper.min[1]-report.surface<.02,'Paper rests on the tabletop');
  for (const [name,local,action] of [
    ['panda-express',[0,.22,.20],'fortune'],
    ['fortune-paperclip',[.16,.04,.03],'paperclip'],
    ['boxing-gloves',[0,.18,.05],'gloves'],
  ]) {
    const point = await page.evaluate(({name,local})=>{
      const {scene,camera,THREE}=window.tableState;
      const object=scene.getObjectByName(name), p=object.localToWorld(new THREE.Vector3(...local)).project(camera);
      return {x:(p.x*.5+.5)*innerWidth,y:(-p.y*.5+.5)*innerHeight};
    },{name,local});
    console.log('Checking click:', action, point);
    await page.mouse.click(point.x,point.y);
    await page.waitForFunction(action=>window.tableClicks.includes(action),action,{timeout:5000});
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{const {camera}=window.tableState;camera.position.set(5.1,5.3,7.2);camera.lookAt(2.3,.7,2.1);camera.updateProjectionMatrix()});
  await page.screenshot({path:'preview-tabletop-mobile.png',timeout:60000});
  assert.deepEqual(errors,[]);
  console.log('PASS: supplied table grounded; no cylinder; tiny adjacent paper stack; gloves fully supported; all three click handlers work; desktop/mobile renders without browser errors.');
} finally { await browser.close(); }
