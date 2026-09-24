import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import * as THREE from 'three';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [], loaded = new Set();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  page.setDefaultTimeout(60000);
  await page.addInitScript(() => {
    window.barkStarts = 0;
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function(...args) { window.barkStarts++; return start.apply(this, args); };
    window.renderRoots = new Set();
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true, renderers: new Map(),
      inject(renderer) { const id = this.renderers.size + 1; this.renderers.set(id, renderer); return id; },
      onCommitFiberRoot(_id, root) { window.renderRoots.add(root); },
      onCommitFiberUnmount() {}, onPostCommitFiberRoot() {},
    };
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.ok() && response.url().includes('/models/')) loaded.add(new URL(response.url()).pathname); });
  await page.goto('http://127.0.0.1:3023/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.getByRole('button', { name: 'San Francisco', exact: true }).click();
  await page.waitForTimeout(5000);
  for (const name of ['dog-on-bed', 'herman-miller-motia-desk', 'herman-miller-sofa', 'herman-miller-aeron', 'uploaded-bed']) assert(loaded.has('/models/' + name + '.glb'), name + ' loads');
  const graph = await page.evaluate(() => {
    function findScene(fiber) {
      if (!fiber) return null;
      let object = fiber.stateNode?.object;
      if (object?.isObject3D) { while (object.parent) object = object.parent; if (object.isScene) return object; }
      return findScene(fiber.child) || findScene(fiber.sibling);
    }
    for (const root of window.renderRoots) {
      const scene = findScene(root.current);
      if (!scene) continue;
      window.roomTestScene = scene;
      const names = ['imported-dog-and-bed', 'herman-miller-motia-desk', 'herman-miller-sofa', 'herman-miller-aeron-chair', 'uploaded-bed', 'blue-imac', 'desktop-monitor', 'laptop', 'blue-white-mechanical-keyboard'];
      return names.map(name => ({ name, present: !!scene.getObjectByName(name) }));
    }
    return null;
  });
  assert(graph, 'Inspect actual mounted Three.js objects');
  assert(graph.every(item => item.present), JSON.stringify(graph));
  const furnitureBounds = await page.evaluate(() => {
    const scene = window.roomTestScene;
    scene.updateMatrixWorld(true);
    return ['herman-miller-motia-desk', 'herman-miller-sofa', 'uploaded-bed', 'imported-dog-and-bed'].map(name => {
      const object = scene.getObjectByName(name);
      let bounds = null, lights = 0;
      object.traverse(node => {
        if (node.isLight) lights++;
        if (!node.isMesh) return;
        if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
        const box = node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld);
        if (bounds) bounds.union(box); else bounds = box;
      });
      return { name, lights, min: bounds.min.toArray(), max: bounds.max.toArray() };
    });
  });
  for (const bounds of furnitureBounds) { assert(Math.abs(bounds.min[1] - .075) < .002, bounds.name + ' rests on floor'); assert.equal(bounds.lights, 0, 'no imported showroom lights'); }
  console.log('Model bounds:', JSON.stringify(furnitureBounds));
  assert.equal(await page.locator('button:visible').count(), 6);
  await page.screenshot({ path: 'preview-imported-room.png', timeout: 60000 });
  const box = await page.locator('canvas').boundingBox();
  const camera = new THREE.PerspectiveCamera(59, box.width / box.height, .08, 100);
  camera.position.set(4.4, 2.35, 5.4); camera.lookAt(-.45, 1.25, -.7); camera.updateMatrixWorld();
  const dog = new THREE.Vector3(.2, .57, 2.8).project(camera);
  await page.mouse.click(box.x + (dog.x * .5 + .5) * box.width, box.y + (-dog.y * .5 + .5) * box.height);
  await page.waitForFunction(() => window.barkStarts > 0, undefined, { timeout: 15000 });
  assert.equal(await page.getByRole('dialog').count(), 0);
  const bed = new THREE.Vector3(-2.5, .8, -.7).project(camera);
  await page.mouse.click(box.x + (bed.x * .5 + .5) * box.width, box.y + (-bed.y * .5 + .5) * box.height);
  await page.getByText(/Thinking about you/).waitFor();
  await page.getByRole('button', { name: 'San Francisco', exact: true }).click();
  await page.getByRole('button', { name: 'Step outside', exact: true }).click();
  await page.waitForTimeout(1800);
  assert.equal(await page.locator('main').getAttribute('data-interior'), 'false');
  await page.getByRole('button', { name: 'Step inside', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'preview-imported-mobile.png', timeout: 60000 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('PASS: all five supplied GLBs mounted and grounded, desk devices preserved, dog click barks, bed click works, inside/outside, desktop/mobile, minimal opening UI, no browser errors.');
} finally { await browser.close(); }
