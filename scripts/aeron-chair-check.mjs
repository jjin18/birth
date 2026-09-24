import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const supplied = readFileSync('C:/Users/jiahui jin/Downloads/AERE1BG1G1CD2ESD2310321093HFALP.glb');
assert(supplied.equals(readFileSync('public/models/herman-miller-aeron.glb')), 'use the supplied model unchanged');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors = [], loaded = new Set();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  page.setDefaultTimeout(60000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => {
    const url = new URL(response.url());
    if (response.ok() && (url.pathname.startsWith('/models/') || url.pathname.startsWith('/draco/'))) loaded.add(url.pathname);
  });
  await page.goto('http://127.0.0.1:3023/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.locator('canvas').waitFor();
  await page.getByRole('button', { name: 'San Francisco', exact: true }).click();
  await page.waitForTimeout(5000);
  assert(loaded.has('/models/herman-miller-aeron.glb'));
  assert(loaded.has('/draco/draco_decoder.wasm'));
  assert(loaded.has('/draco/draco_wasm_wrapper.js'));
  assert.equal(await page.locator('button:visible').count(), 6);
  await page.screenshot({ path: 'preview-aeron-room.png', timeout: 60000 });
  await page.getByRole('button', { name: 'Step outside', exact: true }).click();
  await page.waitForTimeout(1800);
  assert.equal(await page.locator('main').getAttribute('data-interior'), 'false');
  await page.getByRole('button', { name: 'Step inside', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: 'preview-aeron-mobile.png', timeout: 60000 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('PASS: exact supplied GLB, self-hosted Draco decoding, desktop/mobile rendering, inside/outside switching, six opening controls, no browser errors.');
} finally {
  await browser.close();
}
