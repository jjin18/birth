import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { resolve } from 'node:path';

// Run manually with the approved photo path; never ship the source photograph.
const input=process.argv[2];
assert(input,'Usage: node scripts/prepare-tab-icon.mjs <photo>');
const output=resolve('public/favicon-ryan.png');
// A single tab-sized asset; Sharp strips EXIF/GPS/device metadata by default.
const image=await sharp(input,{limitInputPixels:32_000_000}).rotate()
 .resize(64,64,{fit:'cover',position:'centre'})
 .png({palette:true,colours:96,compressionLevel:9}).toBuffer();
assert(image.length<8192,'Tab icon must stay below 8 KiB');
await writeFile(output,image);
console.log(`Prepared 64x64 tab icon (${image.length} bytes).`);
