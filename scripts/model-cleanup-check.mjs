import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

// Parse the changed GLBs in the actual browser loader without rendering the
// entire high-detail room. This catches broken indices, images and Draco data.
const models = ['herman-miller-aeron.glb', 'herman-miller-motia-desk.glb', 'girard-flower-table.glb'];
const { outputFiles } = await build({ bundle: true, write: false, format: 'iife', define: { 'import.meta.url': JSON.stringify('http://model-check.test/check.js') }, stdin: {
  resolveDir: process.cwd(), loader: 'js', contents: `
    import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
    import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
    import { Box3, Vector3 } from 'three';
    const decoder = new DRACOLoader().setDecoderPath('/draco/');
    const loader = new GLTFLoader().setDRACOLoader(decoder);
    window.result = (async () => {
      const results = [];
      for (const file of ${JSON.stringify(models)}) {
        const model = await loader.loadAsync('/models/' + file);
        let triangles = 0, meshes = 0, hidden = 0;
        model.scene.traverse(node => {
          if (node.isLight || /BLOB|Ground_plane/i.test(node.name)) hidden++;
          if (node.isMesh) { meshes++; triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3; }
        });
        const size = new Box3().setFromObject(model.scene).getSize(new Vector3()).toArray();
        results.push({file, triangles, meshes, hidden, size});
        const resources = new Set();
        model.scene.traverse(node => {
          if (!node.isMesh) return;
          resources.add(node.geometry);
          for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
            resources.add(material);
            for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
          }
        });
        for (const resource of resources) resource.dispose();
      }
      decoder.dispose();
      return results;
    })();
  `,
} });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('http://model-check.test/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><script src="/check.js"></script></body></html>' });
    if (url.pathname === '/check.js') return route.fulfill({ contentType: 'text/javascript', body: outputFiles[0].text });
    if (url.pathname === '/favicon.ico') return route.fulfill({ status: 204, body: '' });
    const root = resolve('public'), path = resolve(root, '.' + decodeURIComponent(url.pathname));
    assert(path.startsWith(root + sep));
    return route.fulfill({ contentType: path.endsWith('.wasm') ? 'application/wasm' : path.endsWith('.js') ? 'text/javascript' : 'model/gltf-binary', body: readFileSync(path) });
  });
  await page.goto('http://model-check.test/', { waitUntil: 'load' });
  assert.deepEqual(errors, []);
  await page.waitForFunction(() => window.result !== undefined, undefined, { timeout: 10000 });
  const results = await page.evaluate(() => window.result);
  for (const result of results) {
    assert(result.meshes > 0 && result.triangles > 0);
    assert.equal(result.hidden, 0);
    assert(result.size.every(value => Number.isFinite(value) && value > 0));
    const file = readFileSync('public/models/' + result.file);
    const gltf = JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)));
    const expected = gltf.meshes.flatMap(mesh => mesh.primitives).reduce((sum, primitive) => sum + gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3, 0);
    assert.equal(result.triangles, expected, result.file + ' decoded triangle count');
  }
  assert.deepEqual(errors, []);
  console.log('PASS: cleaned chair, desk and table load with all retained triangles, textures and valid bounds.', JSON.stringify(results));
} finally { await browser.close(); }
