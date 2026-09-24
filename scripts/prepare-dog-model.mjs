import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import draco from 'draco3d';

// Compress a supplied static, single-mesh GLB without simplifying the surface
// or changing its embedded images. Draco may discard degenerate faces.
// The source file is never modified.
const input = process.argv[2];
assert(input, 'Pass the source GLB path.');
const outputPath = process.argv[3] ?? 'public/models/dog-on-bed.glb';
const source = readFileSync(input);
assert.equal(source.readUInt32LE(0), 0x46546c67);
const jsonLength = source.readUInt32LE(12);
const gltf = JSON.parse(source.toString('utf8', 20, 20 + jsonLength).trim());
const binaryStart = 20 + jsonLength + 8;
const binary = source.subarray(binaryStart);
assert.equal(gltf.meshes.length, 1);
assert.equal(gltf.meshes[0].primitives.length, 1);
assert(!gltf.skins?.length && !gltf.animations?.length);
const primitive = gltf.meshes[0].primitives[0];
const readAccessor = index => {
  const accessor = gltf.accessors[index];
  const view = gltf.bufferViews[accessor.bufferView];
  assert(!view.byteStride && !accessor.sparse);
  const components = { SCALAR: 1, VEC2: 2, VEC3: 3 }[accessor.type];
  const ArrayType = { 5126: Float32Array, 5125: Uint32Array }[accessor.componentType];
  assert(ArrayType && components);
  const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const bytes = binary.subarray(offset, offset + accessor.count * components * 4);
  return new ArrayType(Uint8Array.from(bytes).buffer);
};

const module = await draco.createEncoderModule({});
const encoder = new module.Encoder(), builder = new module.MeshBuilder(), mesh = new module.Mesh();
const output = new module.DracoInt8Array();
const indices = readAccessor(primitive.indices);
const vertexCount = gltf.accessors[primitive.attributes.POSITION].count;
builder.AddFacesToMesh(mesh, indices.length / 3, indices);
const attributeIds = {};
for (const [semantic, index] of Object.entries(primitive.attributes)) {
  const type = { POSITION: module.POSITION, NORMAL: module.NORMAL, TEXCOORD_0: module.TEX_COORD }[semantic];
  assert(type !== undefined, `Unsupported attribute: ${semantic}`);
  const values = readAccessor(index);
  attributeIds[semantic] = builder.AddFloatAttributeToMesh(mesh, type, vertexCount, values.length / vertexCount, values);
}
encoder.SetSpeedOptions(5, 5);
encoder.SetAttributeQuantization(module.POSITION, 18);
encoder.SetAttributeQuantization(module.NORMAL, 12);
encoder.SetAttributeQuantization(module.TEX_COORD, 16);
encoder.SetEncodingMethod(module.MESH_EDGEBREAKER_ENCODING);
const encodedLength = encoder.EncodeMeshToDracoBuffer(mesh, output);
assert(encodedLength > 0, 'Draco encoding failed');
const encoded = Buffer.alloc(encodedLength);
for (let i = 0; i < encodedLength; i++) encoded[i] = output.GetValue(i) & 255;
for (const object of [output, mesh, builder, encoder]) module.destroy(object);

const decoderModule = await draco.createDecoderModule({});
const decoder = new decoderModule.Decoder(), compressed = new decoderModule.DecoderBuffer(), decoded = new decoderModule.Mesh();
compressed.Init(new Int8Array(encoded), encoded.length);
const status = decoder.DecodeBufferToMesh(compressed, decoded);
assert(status.ok(), 'Compressed model must decode successfully');
const triangleCount = decoded.num_faces();
assert(triangleCount * 3 / indices.length > .999, 'Only negligible degenerate faces may be discarded');
gltf.accessors[primitive.indices].count = triangleCount * 3;
for (const index of Object.values(primitive.attributes)) gltf.accessors[index].count = decoded.num_points();
gltf.accessors[primitive.indices].max = [decoded.num_points() - 1];
for (const object of [status, decoded, compressed, decoder]) decoderModule.destroy(object);

const chunks = [], views = [];
let length = 0;
const addView = bytes => {
  const pad = (4 - length % 4) % 4;
  if (pad) { chunks.push(Buffer.alloc(pad)); length += pad; }
  const index = views.length;
  views.push({ buffer: 0, byteOffset: length, byteLength: bytes.length });
  chunks.push(bytes); length += bytes.length;
  return index;
};
for (const image of gltf.images ?? []) {
  const view = gltf.bufferViews[image.bufferView];
  assert(view && !image.uri, 'Expected embedded textures');
  image.bufferView = addView(binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
}
primitive.extensions = { ...primitive.extensions, KHR_draco_mesh_compression: { bufferView: addView(encoded), attributes: attributeIds } };
for (const accessor of gltf.accessors) { delete accessor.bufferView; delete accessor.byteOffset; }
gltf.extensionsUsed = [...new Set([...(gltf.extensionsUsed ?? []), 'KHR_draco_mesh_compression'])];
gltf.extensionsRequired = [...new Set([...(gltf.extensionsRequired ?? []), 'KHR_draco_mesh_compression'])];
gltf.bufferViews = views;
gltf.buffers = [{ byteLength: length }];
const json = Buffer.from(JSON.stringify(gltf));
const jsonPadded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20); json.copy(jsonPadded);
const bin = Buffer.concat(chunks);
const binPadded = Buffer.alloc(Math.ceil(bin.length / 4) * 4); bin.copy(binPadded);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
header.writeUInt32LE(20 + jsonPadded.length + 8 + binPadded.length, 8);
header.writeUInt32LE(jsonPadded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(binPadded.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
const result = Buffer.concat([header, jsonPadded, binHeader, binPadded]);
assert(result.length < 25 * 1024 * 1024, 'Must fit the hosting asset limit');
writeFileSync(outputPath, result);
console.log(JSON.stringify({ originalBytes: source.length, optimizedBytes: result.length, triangleCount, degenerateTrianglesDiscarded: indices.length / 3 - triangleCount, texturesPreserved: gltf.images.length }));
