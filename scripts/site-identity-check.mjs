import assert from 'node:assert/strict';
import { readFile,stat } from 'node:fs/promises';
import sharp from 'sharp';

const layout=await readFile('app/layout.tsx','utf8');
assert(layout.includes('title: "Ryan\'s 22nd"'));
assert(layout.includes("url: '/favicon-ryan.png', type: 'image/png', sizes: '64x64'"));
assert(!layout.includes('/favicon.svg'));
const path='public/favicon-ryan.png',meta=await sharp(path).metadata();
assert.equal(meta.format,'png');assert.equal(meta.width,64);assert.equal(meta.height,64);
assert(!meta.exif&&!meta.xmp&&!meta.iptc&&!meta.icc,'Icon has no private image metadata');
const {size}=await stat(path);assert(size<8192,'Icon stays below 8 KiB');
console.log(`PASS: Ryan's 22nd tab title, 64x64 photo icon, no private metadata; ${size} bytes.`);
