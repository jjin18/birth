import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Lossless cleanup only: no image re-encoding, mesh simplification or quantization.
// Match the showroom objects already removed by the room's model components.
const files = ['herman-miller-aeron.glb', 'herman-miller-motia-desk.glb', 'girard-flower-table.glb'];
const hidden = node => /BLOB|Ground_plane/i.test(node.name || '') || !!node.extensions?.KHR_lights_punctual;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const sorted = values => [...new Set(values)].filter(value => value !== undefined).sort((a,b) => a-b);
const visit = (object, callback) => {
  if (!object || typeof object !== 'object') return;
  for (const [key, value] of Object.entries(object)) {
    callback(object, key, value);
    if (key !== 'bufferViews') visit(value, callback);
  }
};
function viewBytes(gltf, binary, index) {
  const view = gltf.bufferViews[index];
  assert(view && view.buffer === 0, 'Only embedded, single-buffer models are supported');
  return binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
}
// Resolve resource indices to actual content so remapping can be checked without
// relying on a screenshot: all visible nodes, materials and binary data must match.
function visibleSignature(gltf, binary) {
  const view = index => {
    const result = { ...gltf.bufferViews[index], data: digest(viewBytes(gltf, binary, index)) };
    delete result.byteOffset;
    return result;
  };
  const accessor = index => {
    const result = structuredClone(gltf.accessors[index]);
    assert(!result.sparse, 'Sparse accessors need a separate implementation');
    if (result.bufferView !== undefined) result.bufferView = view(result.bufferView);
    return result;
  };
  const material = index => {
    const result = structuredClone(gltf.materials[index]);
    visit(result, (_, key, info) => {
      if (!key.endsWith('Texture') || typeof info?.index !== 'number') return;
      const texture = structuredClone(gltf.textures[info.index]);
      assert(!texture.extensions, 'Unexpected texture extension');
      texture.source = { ...gltf.images[texture.source], bufferView: view(gltf.images[texture.source].bufferView) };
      if (texture.sampler !== undefined) texture.sampler = gltf.samplers[texture.sampler];
      info.index = texture;
    });
    return result;
  };
  const mesh = index => {
    const result = structuredClone(gltf.meshes[index]);
    for (const primitive of result.primitives) {
      assert(!primitive.targets, 'Morph targets need a separate implementation');
      primitive.attributes = Object.fromEntries(Object.entries(primitive.attributes).map(([name, id]) => [name, accessor(id)]));
      if (primitive.indices !== undefined) primitive.indices = accessor(primitive.indices);
      if (primitive.material !== undefined) primitive.material = material(primitive.material);
      const draco = primitive.extensions?.KHR_draco_mesh_compression;
      if (draco) draco.bufferView = view(draco.bufferView);
    }
    return result;
  };
  const node = index => {
    const result = structuredClone(gltf.nodes[index]);
    if (hidden(result)) return null;
    const children = (result.children || []).map(node).filter(Boolean);
    if (children.length) result.children = children; else delete result.children;
    if (result.mesh !== undefined) result.mesh = mesh(result.mesh);
    else if (!children.length) return null;
    return result;
  };
  return gltf.scenes[gltf.scene || 0].nodes.map(node).filter(Boolean);
}
for (const file of files) {
  const path = new URL('../public/models/' + file, import.meta.url);
  const source = await readFile(path);
  assert.equal(source.readUInt32LE(0), 0x46546c67);
  assert.equal(source.readUInt32LE(4), 2);
  const jsonLength = source.readUInt32LE(12);
  assert.equal(source.readUInt32LE(20 + jsonLength + 4), 0x004e4942);
  const binary = source.subarray(28 + jsonLength);
  const gltf = JSON.parse(source.subarray(20, 20 + jsonLength));
  assert.equal(gltf.scenes.length, 1);
  assert(!gltf.skins?.length && !gltf.animations?.length && !gltf.cameras?.length);
  const before = visibleSignature(gltf, binary);
  const originalViews = gltf.bufferViews;
  const retained = new Set();
  function keepNode(index) {
    const node = gltf.nodes[index];
    if (hidden(node)) return false;
    node.children = (node.children || []).filter(keepNode);
    if (!node.children.length) delete node.children;
    if (node.mesh === undefined && !node.children) return false;
    retained.add(index);
    return true;
  }
  gltf.scenes[0].nodes = gltf.scenes[0].nodes.filter(keepNode);
  function compact(key, indices) {
    const kept = sorted(indices);
    const map = new Map(kept.map((old, index) => [old, index]));
    gltf[key] = kept.map(index => { assert(gltf[key][index]); return gltf[key][index]; });
    return index => { assert(map.has(index), `Missing ${key} reference ${index}`); return map.get(index); };
  }
  const nodeIndex = compact('nodes', retained);
  gltf.scenes[0].nodes = gltf.scenes[0].nodes.map(nodeIndex);
  for (const node of gltf.nodes) if (node.children) node.children = node.children.map(nodeIndex);
  const meshIndex = compact('meshes', gltf.nodes.map(node => node.mesh));
  for (const node of gltf.nodes) if (node.mesh !== undefined) node.mesh = meshIndex(node.mesh);
  const primitives = gltf.meshes.flatMap(mesh => mesh.primitives);
  const materialIndex = compact('materials', primitives.map(primitive => primitive.material));
  for (const primitive of primitives) if (primitive.material !== undefined) primitive.material = materialIndex(primitive.material);
  const textureInfos = [];
  visit(gltf.materials, (_, key, value) => { if (key.endsWith('Texture') && typeof value?.index === 'number') textureInfos.push(value); });
  const textureIndex = compact('textures', textureInfos.map(info => info.index));
  for (const info of textureInfos) info.index = textureIndex(info.index);
  const imageIndex = compact('images', gltf.textures.map(texture => texture.source));
  for (const texture of gltf.textures) texture.source = imageIndex(texture.source);
  const samplerIndex = compact('samplers', gltf.textures.map(texture => texture.sampler));
  for (const texture of gltf.textures) if (texture.sampler !== undefined) texture.sampler = samplerIndex(texture.sampler);
  const accessorIndex = compact('accessors', primitives.flatMap(primitive => [primitive.indices, ...Object.values(primitive.attributes)]));
  for (const primitive of primitives) {
    if (primitive.indices !== undefined) primitive.indices = accessorIndex(primitive.indices);
    primitive.attributes = Object.fromEntries(Object.entries(primitive.attributes).map(([name, index]) => [name, accessorIndex(index)]));
  }
  if (gltf.extensions) { delete gltf.extensions.KHR_lights_punctual; if (!Object.keys(gltf.extensions).length) delete gltf.extensions; }
  for (const key of ['extensionsUsed', 'extensionsRequired']) if (gltf[key]) gltf[key] = gltf[key].filter(name => name !== 'KHR_lights_punctual');
  const usedViews = new Set();
  visit(gltf, (_, key, value) => { if (key === 'bufferView') usedViews.add(value); });
  const viewIndex = compact('bufferViews', usedViews);
  visit(gltf, (parent, key, value) => { if (key === 'bufferView') parent[key] = viewIndex(value); });
  const chunks = [];
  let length = 0;
  for (const index of sorted(usedViews)) {
    const view = originalViews[index];
    const padding = (4 - length % 4) % 4;
    if (padding) { chunks.push(Buffer.alloc(padding)); length += padding; }
    const bytes = binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
    assert.equal(bytes.length, view.byteLength);
    gltf.bufferViews[viewIndex(index)] = { ...view, byteOffset: length };
    chunks.push(bytes); length += bytes.length;
  }
  gltf.buffers = [{ byteLength: length }];
  const packed = Buffer.concat(chunks);
  assert.deepEqual(visibleSignature(gltf, packed), before, 'Visible model content must be byte-for-byte equivalent');
  const json = Buffer.from(JSON.stringify(gltf));
  const jsonPadded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20); json.copy(jsonPadded);
  const binPadded = Buffer.alloc(Math.ceil(packed.length / 4) * 4); packed.copy(binPadded);
  const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + jsonPadded.length + binPadded.length, 8);
  header.writeUInt32LE(jsonPadded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  binHeader.writeUInt32LE(binPadded.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  const result = Buffer.concat([header, jsonPadded, binHeader, binPadded]);
  assert(result.length <= source.length);
  if (process.argv.includes('--write')) await writeFile(path, result);
  console.log(JSON.stringify({ file, originalBytes: source.length, cleanedBytes: result.length, savedBytes: source.length-result.length, visibleContentIdentical: true, written: process.argv.includes('--write') }));
}
