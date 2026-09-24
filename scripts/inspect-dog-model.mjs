import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
const modelPath = process.argv[2] ?? 'public/models/dog-on-bed.glb';
const previewName = process.argv[3] ?? 'dog-model';

const { outputFiles } = await build({ bundle: true, write: false, format: 'iife', stdin: { resolveDir: process.cwd(), contents: `
import * as THREE from 'three';
import { GLTFLoader, DRACOLoader } from 'three-stdlib';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(800, 800); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#535b63');
const generator = new THREE.PMREMGenerator(renderer);
scene.environment = generator.fromScene(new RoomEnvironment(), .04).texture;
scene.environmentIntensity = .8;
scene.add(new THREE.HemisphereLight('#eef6ff', '#80705e', 2));
const light = new THREE.DirectionalLight('#fff2dc', 3); light.position.set(2, 3, 3); scene.add(light);
const camera = new THREE.PerspectiveCamera(40, 1, .01, 100);
camera.position.set(1.1, 1.05, 1.8); camera.lookAt(0, .3, 0);
const loader = new GLTFLoader(), draco = new DRACOLoader(); draco.setDecoderPath('/draco/'); loader.setDRACOLoader(draco);
loader.load('/model.glb', gltf => {
  const bounds = new THREE.Box3().setFromObject(gltf.scene), center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
  const scale = 1 / Math.max(size.x, size.y, size.z);
  gltf.scene.scale.setScalar(scale);
  gltf.scene.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  scene.add(gltf.scene);
  renderer.render(scene, camera);
  window.modelView = angle => { camera.position.set(Math.sin(angle) * 2, 1.05, Math.cos(angle) * 2); camera.lookAt(0, .3, 0); renderer.render(scene, camera); };
  window.modelReady = true;
}, undefined, error => { window.modelError = String(error); });
` } });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
  page.on('pageerror', error => console.error(error.stack));
  await page.route('http://dog-preview.test/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/') return route.fulfill({ contentType: 'text/html', body: '<html><body style="margin:0"><script src="/app.js"></script></body></html>' });
    if (path === '/app.js') return route.fulfill({ contentType: 'text/javascript', body: outputFiles[0].text });
    if (path === '/model.glb') return route.fulfill({ contentType: 'model/gltf-binary', body: readFileSync(modelPath) });
    if (['/draco/draco_wasm_wrapper.js', '/draco/draco_decoder.wasm', '/draco/draco_decoder.js'].includes(path)) return route.fulfill({ contentType: path.endsWith('.wasm') ? 'application/wasm' : 'text/javascript', body: readFileSync('public' + path) });
    return route.fulfill({ status: 404, body: '' });
  });
  await page.goto('http://dog-preview.test/');
  await page.waitForFunction(() => window.modelReady || window.modelError, undefined, { timeout: 90000 });
  const error = await page.evaluate(() => window.modelError); if (error) throw new Error(error);
  await page.screenshot({ path: 'preview-' + previewName + '.png', timeout: 60000 });
  await page.evaluate(() => window.modelView(Math.PI + .5));
  await page.screenshot({ path: 'preview-' + previewName + '-back.png', timeout: 60000 });
  console.log('Model front and back rendered successfully: ' + previewName);
} finally { await browser.close(); }
