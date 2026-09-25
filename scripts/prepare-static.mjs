import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';

async function files(root) {
  const entries = await readdir(root,{withFileTypes:true});
  return (await Promise.all(entries.map(entry=>entry.isDirectory()?files(join(root,entry.name)):[join(root,entry.name)]))).flat();
}
export async function versionAssets() {
  const versions = {};
  for (const file of (await files('public')).sort()) {
    const path = '/' + relative('public',file).split(sep).join('/');
    versions[path] = createHash('sha256').update(await readFile(file)).digest('hex').slice(0,16);
  }
  // Generated deterministic build input, shared by asset URLs and the HTTP server.
  await writeFile('lib/asset-versions.json',JSON.stringify(versions,null,2)+'\n');
}
export async function precompress(root) {
  let original = 0, compressed = 0, count = 0;
  for (const file of await files(root)) {
    if (!/\.(?:html|js|mjs|css|json|svg|txt)$/.test(file)) continue;
    const input = await readFile(file); if (input.length < 1024) continue;
    const br = brotliCompressSync(input,{params:{[constants.BROTLI_PARAM_QUALITY]:6}}), gz = gzipSync(input,{level:9});
    if (br.length < input.length) await writeFile(file+'.br',br);
    if (gz.length < input.length) await writeFile(file+'.gz',gz);
    original += input.length; compressed += br.length; count++;
  }
  console.log('Precompressed static text:',JSON.stringify({files:count,originalBytes:original,brotliBytes:compressed}));
}
