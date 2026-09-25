import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve,sep } from 'node:path';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const original=execFileSync('git',['show','54f411c8a4cb9c01e5037e0b6af84dc9d9ddecc8:public/models/uploaded-bed-v2.glb'],{maxBuffer:64*1024*1024});
const {outputFiles}=await build({bundle:true,write:false,format:'iife',define:{'import.meta.url':JSON.stringify('http://bed-quality.test/check.js')},stdin:{resolveDir:process.cwd(),loader:'js',contents:`
  import * as THREE from 'three';
  import { GLTFLoader,DRACOLoader } from 'three-stdlib';
  import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
  import { optimizeModelTextures } from './lib/model-textures.ts';
  const decoder=new DRACOLoader().setDecoderPath('/draco/');
  const loader=new GLTFLoader().setDRACOLoader(decoder);
  const renderer=new THREE.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
  renderer.setSize(1000,750);renderer.setPixelRatio(1);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  document.body.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#8f9494');
  const gen=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),env=gen.fromScene(room,.04);
  scene.environment=env.texture;scene.environmentIntensity=.35;
  scene.add(new THREE.HemisphereLight('#d8e8f1','#76634f',1.6));
  const light=new THREE.DirectionalLight('#fff2dd',2.2);light.position.set(1,6,4);scene.add(light);
  const views=[{name:'room',position:[4.4,2.35,5.4],target:[-.45,1.25,-.7]},
    {name:'close',position:[.5,2.1,2.2],target:[-2.4,.85,-.5]}];
  const saved=new Map();
  window.frames={};
  window.renderBed=async label=>{
    const {scene:model}=await loader.loadAsync(label==='4k'?'/original.glb':'/models/uploaded-bed-2k.glb');
    optimizeModelTextures([model]);
    const bounds=new THREE.Box3().setFromObject(model),center=bounds.getCenter(new THREE.Vector3());
    const scale=3.05/bounds.getSize(new THREE.Vector3()).x;
    model.scale.setScalar(scale);model.position.set(-3.2-center.x*scale,.075-bounds.min.y*scale,-.95-center.z*scale);
    scene.add(model);const reports=[];
    for(const view of views){
      const camera=new THREE.PerspectiveCamera(59,1000/750,.08,100);
      camera.position.set(...view.position);camera.lookAt(...view.target);camera.updateMatrixWorld();
      renderer.render(scene,camera);
      const pixels=new Uint8Array(1000*750*4),gl=renderer.getContext();gl.readPixels(0,0,1000,750,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      window.frames[label+'-'+view.name]=renderer.domElement.toDataURL('image/png');
      if(label==='4k')saved.set(view.name,pixels);
      else{
        const reference=saved.get(view.name);let sum=0,max=0,samples=0;
        // Compare the bed's projected rectangle, not a mostly-empty frame.
        const box=new THREE.Box3().setFromObject(model),points=[];
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(camera));
        const x0=Math.max(0,Math.floor((Math.min(...points.map(p=>p.x))*.5+.5)*1000));
        const x1=Math.min(1000,Math.ceil((Math.max(...points.map(p=>p.x))*.5+.5)*1000));
        const y0=Math.max(0,Math.floor((Math.min(...points.map(p=>p.y))*.5+.5)*750));
        const y1=Math.min(750,Math.ceil((Math.max(...points.map(p=>p.y))*.5+.5)*750));
        for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)for(let c=0;c<3;c++){
          const i=(y*1000+x)*4+c,d=Math.abs(pixels[i]-reference[i]);sum+=d;max=Math.max(max,d);samples++;
        }
        reports.push({view:view.name,meanDifference:sum/samples,maxDifference:max,samples});
      }
    }
    scene.remove(model);
    const resources=new Set();model.traverse(node=>{if(!node.isMesh)return;resources.add(node.geometry);for(const m of Array.isArray(node.material)?node.material:[node.material]){resources.add(m);for(const value of Object.values(m))if(value?.isTexture)resources.add(value);}});
    for(const resource of resources)resource.dispose();
    return reports;
  };
`}});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage({viewport:{width:1000,height:750}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.route('http://bed-quality.test/**',route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><body style="margin:0"><script src="/check.js"></script></body>'});
    if(path==='/check.js')return route.fulfill({contentType:'text/javascript',body:outputFiles[0].text});
    if(path==='/original.glb')return route.fulfill({contentType:'model/gltf-binary',body:original});
    if(path==='/favicon.ico')return route.fulfill({status:204,body:''});
    const root=resolve('public'),file=resolve(root,'.'+decodeURIComponent(path));assert(file.startsWith(root+sep));
    return route.fulfill({contentType:path.endsWith('.wasm')?'application/wasm':path.endsWith('.js')?'text/javascript':'model/gltf-binary',body:readFileSync(file)});
  });
  await page.goto('http://bed-quality.test/');
  await page.evaluate(()=>window.renderBed('4k'));
  const reports=await page.evaluate(()=>window.renderBed('2k'));
  assert.deepEqual(errors,[]);
  for(const report of reports)assert(report.meanDifference<2.5,report.view+' bed rendering differs too much');
  // View both exact renders side-by-side; QA output is ignored, never shipped.
  await page.evaluate(()=>{document.body.innerHTML='<div style="display:flex;width:1600px;background:#8f9494">'+['4k','2k'].map(label=>'<section style="width:800px"><p style="font:20px sans-serif;margin:12px">'+label+'</p><img style="width:800px" src="'+window.frames[label+'-close']+'"></section>').join('')+'</div>';});
  await page.setViewportSize({width:1600,height:660});
  await page.screenshot({path:'preview-bed-texture-comparison.png'});
  console.log('PASS: bed loaded with unchanged geometry, 4K vs 2K appearance comparison (8-bit RGB levels):',JSON.stringify(reports));
}finally{await browser.close();}
