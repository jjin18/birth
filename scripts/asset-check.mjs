import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

export async function checkAssets() {
  const root = resolve('public');
  const manifest = JSON.parse(await readFile('lib/site-assets.json', 'utf8'));
  const bundle = await build({ entryPoints: ['lib/cities.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
  const { cities } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  const skylines = cities.flatMap(city => ['', '-day', '-sunset'].map(mode => `cities/${city.id}${mode}.jpg`));
  const expected = [...Object.values(manifest).flat(), ...skylines].sort();
  assert.equal(new Set(expected).size, expected.length, 'Asset manifest must not contain duplicates');
  async function files(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return (await Promise.all(entries.map(async entry => {
      assert(!entry.isSymbolicLink(), 'Public assets must not be symlinks');
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? files(path) : [relative(root, path).split(sep).join('/')];
    }))).flat();
  }
  const actual = (await files(root)).sort();
  assert.deepEqual(actual, expected, 'Only audited graphics and runtime support may ship. Remove unused files or review the asset manifest.');
  let totalBytes = 0, modelBytes = 0, triangles = 0;
  for (const file of expected) {
    const path = resolve(root, file);
    assert(path.startsWith(root + sep), 'Asset path must remain inside public/');
    const { size } = await stat(path); totalBytes += size;
    if (!file.endsWith('.glb')) continue;
    modelBytes += size;
    const source = await readFile(path);
    assert.equal(source.readUInt32LE(0), 0x46546c67, file);
    assert.equal(source.readUInt32LE(8), source.length, file + ' must not have trailing data');
    const gltf = JSON.parse(source.subarray(20, 20 + source.readUInt32LE(12)));
    const views = new Set();
    function walk(object) {
      if (!object || typeof object !== 'object') return;
      for (const [key, value] of Object.entries(object)) {
        if (key === 'bufferView') { assert(gltf.bufferViews[value], file + ' invalid buffer reference'); views.add(value); }
        else if (key !== 'bufferViews') walk(value);
      }
    }
    walk(gltf);
    assert.equal(views.size, gltf.bufferViews.length, file + ' contains unused embedded data');
    assert(!(gltf.nodes || []).some(node => /BLOB|Ground_plane/i.test(node.name || '') || node.extensions?.KHR_lights_punctual), file + ' contains unused showroom objects');
    for (const mesh of gltf.meshes || []) for (const primitive of mesh.primitives) {
      if ((primitive.mode ?? 4) === 4) triangles += gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3;
    }
  }
  const report = { files: expected.length, selectedCities: cities.length, models: manifest.models.length, totalBytes, modelBytes, meshTriangles: triangles };
  console.log('Asset audit passed:', JSON.stringify(report));
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await checkAssets();
