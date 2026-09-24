import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import * as THREE from 'three';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:3023/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('canvas').waitFor();
  await page.waitForTimeout(3000);
  const expected = ['Step outside', 'Tokyo', 'New York', 'Paris', 'Taipei', 'San Francisco'];
  assert.deepEqual(await page.locator('button:visible').allTextContents(), expected);
  assert.equal((await page.locator('main').innerText()).replace(/\s+/g, ' ').trim(), expected.join(' '));
  await page.screenshot({ path: 'preview-minimal-room.png', timeout: 60000 });
  await page.getByRole('button', { name: 'Step outside', exact: true }).click();
  assert.equal(await page.locator('main').getAttribute('data-interior'), 'false');
  assert.deepEqual(await page.locator('button:visible').allTextContents(), ['Step inside', ...expected.slice(1)]);
  await page.getByRole('button', { name: 'Step inside', exact: true }).click();
  await page.getByRole('button', { name: 'Taipei', exact: true }).click();
  assert.equal(await page.locator('main').getAttribute('data-city'), 'taipei');
  await page.waitForTimeout(2500);
  const bounds = await page.locator('canvas').boundingBox();
  const camera = new THREE.PerspectiveCamera(59, bounds.width / bounds.height, .08, 100);
  camera.position.set(4.4, 2.35, 5.4);
  camera.lookAt(-.45, 1.25, -.7);
  camera.updateMatrixWorld();
  const point = new THREE.Vector3(1.85, 1.58, 2.1).project(camera);
  await page.mouse.click(bounds.x + (point.x * .5 + .5) * bounds.width, bounds.y + (-point.y * .5 + .5) * bounds.height);
  await page.locator('.fortune-crack').waitFor();
  await page.getByText('Saved to your shared paper clip.', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.locator('.fortune-crack').waitFor({ state: 'detached' });
  assert.deepEqual(await page.locator('button:visible').allTextContents(), expected);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1500);
  assert.deepEqual(await page.locator('button:visible').allTextContents(), expected);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  await page.screenshot({ path: 'preview-minimal-mobile.png', timeout: 60000 });
  assert.deepEqual(errors, []);
  console.log('PASS: minimal desktop/mobile opening, inside/outside toggle, city selection, physical carton interaction, modal close, no overflow or browser errors.');
} finally {
  await browser.close();
}
