import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const manifest = JSON.parse(readFileSync('lib/site-assets.json', 'utf8'));
const selected=process.argv.find(arg=>arg.startsWith('--model='))?.slice('--model='.length);
if(selected)assert(manifest.models.includes(selected),'Unknown model');
const models=selected?[selected]:manifest.models;
assert(!manifest.models.some(file => /sofa|couch/.test(file)));
assert(!readFileSync('components/Penthouse/Scene.tsx', 'utf8').includes('ImportedSofa'));
for (const file of ['SoftFurnishings','Terrier','MeshChair']) assert(!existsSync('components/Penthouse/'+file+'.tsx'), 'Obsolete loading model: '+file);
for (const file of ['ImportedFurniture','ImportedDog','AeronChair']) {
  const source=readFileSync('components/Penthouse/'+file+'.tsx','utf8');
  assert(!/fallback=\{</.test(source), 'Loading should not build a second model: '+file);
}
const { outputFiles } = await build({ bundle: true, write: false, format: 'iife', define: {
  'import.meta.url': JSON.stringify('http://texture-check.test/check.js'),
}, stdin: { resolveDir: process.cwd(), loader: 'js', contents: String.raw`
  import * as THREE from 'three';
  import { GLTFLoader, DRACOLoader } from 'three-stdlib';
  import { optimizeModelTextures, applyPackedMaterial } from './lib/model-textures.ts';
  function check(ok, message) { if (!ok) throw new Error(message); }
  function collect(scene) {
    const materials = new Set(), geometries = new Set();
    scene.traverse(node => {
      if (!node.isMesh) return;
      geometries.add(node.geometry);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
    });
    return { materials, geometries };
  }
  function maps(materials) {
    return [...materials].flatMap(material => Object.entries(material)
      .filter(([, value]) => value?.isTexture).map(([key, texture]) => ({ material, key, texture })));
  }
  function estimate(bindings) {
    const sources = new Map();
    for (const {texture} of bindings) {
      const key = [texture.format, texture.wrapS, texture.wrapT, texture.minFilter, texture.magFilter,
        texture.colorSpace, texture.anisotropy, texture.generateMipmaps].join(':');
      if (!sources.has(texture.source)) sources.set(texture.source, new Set());
      if (sources.get(texture.source).has(key)) continue;
      sources.get(texture.source).add(key);
    }
    let bytes = 0;
    for (const [source, keys] of sources) for (const key of keys) {
      const texture = bindings.find(item => item.texture.source === source &&
        [item.texture.format, item.texture.wrapS, item.texture.wrapT, item.texture.minFilter, item.texture.magFilter,
          item.texture.colorSpace, item.texture.anisotropy, item.texture.generateMipmaps].join(':') === key).texture;
      const channels = texture.format === THREE.RedFormat ? 1 : texture.format === THREE.RGFormat ? 2 : 4;
      let {width, height} = texture.image;
      do { bytes += width * height * channels; if (!texture.generateMipmaps || (width === 1 && height === 1)) break;
        width = Math.max(1, Math.floor(width / 2)); height = Math.max(1, Math.floor(height / 2));
      } while (true);
    }
    return bytes;
  }
  function renderer() {
    const result = new THREE.WebGLRenderer({antialias:false, preserveDrawingBuffer:true});
    result.setSize(480, 360);
    result.setPixelRatio(1);
    result.toneMapping = THREE.ACESFilmicToneMapping;
    result.toneMappingExposure = 1.2;
    const gl = result.getContext(), original = gl.texStorage2D.bind(gl);
    const allocations = [];
    gl.texStorage2D = function(target, levels, format, width, height) {
      allocations.push({levels, format, width, height});
      return original(target, levels, format, width, height);
    };
    result.allocations = allocations;
    return result;
  }
  function render(result, scene, camera) {
    result.render(scene, camera);
    const pixels = new Uint8Array(480 * 360 * 4), gl = result.getContext();
    gl.readPixels(0, 0, 480, 360, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    check(gl.getError() === gl.NO_ERROR, 'WebGL error');
    return pixels;
  }
  window.runModel = async file => {
    const decoder = new DRACOLoader().setDecoderPath('/draco/');
    const model = await new GLTFLoader().setDRACOLoader(decoder).loadAsync('/' + file);
    const {materials, geometries} = collect(model.scene), before = maps(materials);
    const beforeBytes = estimate(before);
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#b8b4ab');
    scene.add(model.scene, new THREE.HemisphereLight('#ffffff', '#706858', 2));
    const bounds = new THREE.Box3().setFromObject(model.scene), center = bounds.getCenter(new THREE.Vector3());
    const span = bounds.getSize(new THREE.Vector3()).length();
    const keyLight = new THREE.DirectionalLight('#fff4dd', 3);
    keyLight.position.copy(center).add(new THREE.Vector3(span, span * 1.3, span)); scene.add(keyLight);
    const camera = new THREE.PerspectiveCamera(40, 480/360, span/100, span*10);
    camera.position.copy(center).add(new THREE.Vector3(span*.75, span*.45, span*1.2)); camera.lookAt(center);
    let device = renderer();
    const baseline = render(device, scene, camera), beforeAllocations = device.allocations.slice();
    device.dispose(); device.forceContextLoss();
    const {packedTextures} = optimizeModelTextures(model.scenes);
    check(packedTextures > 0, file + ' packed no textures');
    const checked = new Set();
    let checkedPixels = 0;
    for (const {material, key, texture} of before) {
      const replacement = material[key];
      if (!replacement.userData.roomPackedChannels) { check(replacement === texture, key + ' changed unnecessarily'); continue; }
      check(replacement.image.width === texture.image.width && replacement.image.height === texture.image.height, 'resolution changed');
      for (const property of ['channel','wrapS','wrapT','minFilter','magFilter','anisotropy','generateMipmaps','colorSpace','flipY','rotation'])
        check(replacement[property] === texture[property], property + ' changed');
      for (const property of ['offset','repeat','center','matrix']) check(replacement[property].equals(texture[property]), property + ' changed');
      if (checked.has(texture)) continue; checked.add(texture);
      const canvas = document.createElement('canvas'); canvas.width=texture.image.width; canvas.height=texture.image.height;
      const context = canvas.getContext('2d', {willReadFrequently:true}); context.drawImage(texture.image,0,0);
      const rgba = context.getImageData(0,0,canvas.width,canvas.height).data;
      const gb = replacement.userData.roomPackedChannels === 'gb';
      const data = replacement.image.data;
      for (let pixel=0, index=0; pixel<rgba.length; pixel+=4) {
        check(data[index++] === rgba[pixel+(gb?1:0)], 'first channel not lossless');
        if (gb) check(data[index++] === rgba[pixel+2], 'second channel not lossless');
      }
      checkedPixels += canvas.width * canvas.height; canvas.width=canvas.height=0;
    }
    check(collect(model.scene).geometries.size === geometries.size, 'geometry changed');
    // Cloned animated materials must compose their own callback with the map swizzle.
    for (const material of materials) if (material.roughnessMap?.userData.roomPackedChannels) {
      const clone = material.clone(); let called = false;
      clone.onBeforeCompile = () => { called = true; };
      clone.customProgramCacheKey = () => 'test-animation'; applyPackedMaterial(clone);
      const shader = {fragmentShader:'#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>'};
      clone.onBeforeCompile(shader, null);
      check(called && shader.fragmentShader.includes('texelRoughness.r') && shader.fragmentShader.includes('texelMetalness.g'), 'animation hook lost');
      check(clone.customProgramCacheKey().startsWith('test-animation|'), 'animation cache key lost'); clone.dispose();
    }
    device = renderer();
    const optimized = render(device, scene, camera), afterAllocations = device.allocations.slice();
    let maxDifference=0, changed=0, sumDifference=0;
    for(let i=0;i<baseline.length;i++) { const difference=Math.abs(baseline[i]-optimized[i]);
      maxDifference=Math.max(maxDifference,difference); if(difference) changed++; sumDifference+=difference;
    }
    // Read back the restored GPU resources too. The packed bytes must remain
    // available after a WebGL context loss (no closed/discarded bitmaps).
    const restored = new Promise((resolve,reject) => {
      const timeout=setTimeout(()=>reject(new Error('context restore timeout')),15000);
      device.domElement.addEventListener('webglcontextrestored',()=>{ clearTimeout(timeout); resolve(); },{once:true});
    });
    device.forceContextLoss(); await new Promise(resolve=>setTimeout(resolve,100)); device.forceContextRestore(); await restored;
    const recovered=render(device,scene,camera);
    check(recovered.every((value,index)=>value===optimized[index]),'context restoration changed pixels');
    const afterBytes=estimate(maps(materials));
    check(optimizeModelTextures(model.scenes).packedTextures === 0, 'packing is not idempotent');
    check(afterAllocations.some(item=>item.format===33323 || item.format===33321), 'no RG8/R8 GPU allocations');
    const result={file,packedTextures,checkedPixels,beforeBytes,afterBytes,maxDifference,changed,meanDifference:sumDifference/baseline.length,
      beforeAllocations,afterAllocations};
    window.preview=device.domElement.toDataURL('image/png');
    device.dispose(); device.forceContextLoss(); decoder.dispose();
    return result;
  };
` } });
const browser = await chromium.launch({channel:'msedge',headless:true});
const reports=[];
try {
  for (const file of models) {
    const page=await browser.newPage(); const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{ if(message.type()==='error') errors.push(message.text()); });
    await page.route('http://texture-check.test/**',route=>{
      const url=new URL(route.request().url());
      if(url.pathname==='/') return route.fulfill({contentType:'text/html',body:'<!doctype html><script src="/check.js"></script>'});
      if(url.pathname==='/check.js') return route.fulfill({contentType:'text/javascript',body:outputFiles[0].text});
      if(url.pathname==='/favicon.ico') return route.fulfill({status:204,body:''});
      const root=resolve('public'),path=resolve(root,'.'+decodeURIComponent(url.pathname)); assert(path.startsWith(root+sep));
      return route.fulfill({contentType:path.endsWith('.wasm')?'application/wasm':path.endsWith('.js')?'text/javascript':'model/gltf-binary',body:readFileSync(path)});
    });
    await page.goto('http://texture-check.test/');
    const report=await page.evaluate(file=>window.runModel(file),file);
    assert.deepEqual(errors,[],file);
    assert.equal(report.maxDifference,0,file+' changed rendered pixels');
    assert(report.afterBytes<report.beforeBytes);
    reports.push(report);
    console.log('PASS:',JSON.stringify({...report,beforeAllocations:report.beforeAllocations.length,afterAllocations:report.afterAllocations.length}));
    await page.close();
  }
} finally { await browser.close(); }
const sum=key=>reports.reduce((total,report)=>total+report[key],0);
console.log('Model texture budget (asset dimensions + mipmaps; not total device memory):',JSON.stringify({models:models.length,beforeMiB:sum('beforeBytes')/2**20,afterMiB:sum('afterBytes')/2**20,savedMiB:(sum('beforeBytes')-sum('afterBytes'))/2**20,checkedPixels:sum('checkedPixels')}));
