import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import draco from 'draco3d';
import sharp from 'sharp';
import { MeshoptSimplifier } from 'meshoptimizer';

// Offline only, never part of page load/build. Always start from this reviewed
// original revision, so rerunning cannot compound simplification loss.
const revision = '251a03640d892f12546f3118abcc61ef08226b56';
const decoderModule = await draco.createDecoderModule({});
const encoderModule = await draco.createEncoderModule({});
await MeshoptSimplifier.ready;
const reports = [];
// Keep the dog's reviewed original geometry and fur texture; simplification is
// not worth losing its small silhouette/detail. The lamp remains optimized.
for (const [name, targetFaces, textureSize] of [['uploaded-floor-lamp', 80000, 2048]]) {
  const source = execFileSync('git', ['show', `${revision}:public/models/${name}.glb`], { maxBuffer: 30 * 1024 ** 2, windowsHide: true });
  const gltf = JSON.parse(source.toString('utf8', 20, 20 + source.readUInt32LE(12)));
  const binary = source.subarray(28 + source.readUInt32LE(12));
  assert.equal(gltf.meshes.length, 1); assert.equal(gltf.meshes[0].primitives.length, 1);
  assert(!gltf.skins?.length && !gltf.animations?.length);
  const primitive = gltf.meshes[0].primitives[0];
  const viewBytes = index => { const v = gltf.bufferViews[index]; return binary.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength); };
  let indices;
  const attributes = {};
  const compressed = primitive.extensions?.KHR_draco_mesh_compression;
  if (compressed) {
    const m = decoderModule, decoder = new m.Decoder(), buffer = new m.DecoderBuffer(), mesh = new m.Mesh();
    const bytes = viewBytes(compressed.bufferView); buffer.Init(new Int8Array(bytes), bytes.length);
    const status = decoder.DecodeBufferToMesh(buffer, mesh); assert(status.ok());
    const faces = new m.DracoInt32Array(); indices = new Uint32Array(mesh.num_faces() * 3);
    for (let i = 0; i < mesh.num_faces(); i++) { decoder.GetFaceFromMesh(mesh, i, faces); for (let j = 0; j < 3; j++) indices[i * 3 + j] = faces.GetValue(j); }
    for (const [semantic, id] of Object.entries(compressed.attributes)) {
      const attribute = decoder.GetAttributeByUniqueId(mesh, id), values = new m.DracoFloat32Array();
      assert(decoder.GetAttributeFloatForAllPoints(mesh, attribute, values));
      attributes[semantic] = Float32Array.from({ length: values.size() }, (_, i) => values.GetValue(i)); m.destroy(values);
    }
    for (const object of [faces, status, mesh, buffer, decoder]) m.destroy(object);
  } else {
    const accessor = index => {
      const a = gltf.accessors[index], v = gltf.bufferViews[a.bufferView];
      assert(!a.sparse && !v.byteStride);
      const Type = {5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType];
      const count = a.count * {SCALAR:1,VEC2:2,VEC3:3}[a.type];
      return new Type(Uint8Array.from(viewBytes(a.bufferView).subarray(a.byteOffset ?? 0, (a.byteOffset ?? 0) + count * Type.BYTES_PER_ELEMENT)).buffer);
    };
    indices = new Uint32Array(accessor(primitive.indices));
    for (const [semantic, index] of Object.entries(primitive.attributes)) attributes[semantic] = accessor(index);
  }
  const originalFaces = indices.length / 3, vertexCount = attributes.POSITION.length / 3;
  assert.deepEqual(Object.keys(attributes).sort(), ['NORMAL', 'POSITION', 'TEXCOORD_0']);
  const weighted = new Float32Array(vertexCount * 5);
  for (let i = 0; i < vertexCount; i++) {
    weighted.set(attributes.NORMAL.subarray(i * 3, i * 3 + 3), i * 5);
    weighted.set(attributes.TEXCOORD_0.subarray(i * 2, i * 2 + 2), i * 5 + 3);
  }
  // Preserve seams, normals and UVs; stop early rather than exceed 0.1% error.
  const [simplified, error] = MeshoptSimplifier.simplifyWithAttributes(indices, attributes.POSITION, 3, weighted, 5, [0.2,0.2,0.2,1,1], null, targetFaces * 3, 0.001, ['LockBorder']);
  assert(error <= .00101); indices = simplified;
  const [remap, count] = MeshoptSimplifier.compactMesh(indices);
  for (const semantic of Object.keys(attributes)) {
    const stride = semantic === 'TEXCOORD_0' ? 2 : 3, old = attributes[semantic], next = new Float32Array(count * stride);
    for (let i = 0; i < remap.length; i++) if (remap[i] !== 0xffffffff) next.set(old.subarray(i * stride, i * stride + stride), remap[i] * stride);
    attributes[semantic] = next;
  }
  const m = encoderModule, mesh = new m.Mesh(), builder = new m.MeshBuilder(), encoder = new m.Encoder(), output = new m.DracoInt8Array();
  builder.AddFacesToMesh(mesh, indices.length / 3, indices);
  const attributeIds = {};
  for (const [semantic, values] of Object.entries(attributes)) {
    const type = {POSITION:m.POSITION,NORMAL:m.NORMAL,TEXCOORD_0:m.TEX_COORD}[semantic];
    attributeIds[semantic] = builder.AddFloatAttributeToMesh(mesh, type, count, values.length / count, values);
  }
  encoder.SetSpeedOptions(5,5); encoder.SetAttributeQuantization(m.POSITION,18); encoder.SetAttributeQuantization(m.NORMAL,12); encoder.SetAttributeQuantization(m.TEX_COORD,16);
  encoder.SetEncodingMethod(m.MESH_EDGEBREAKER_ENCODING);
  const encodedLength = encoder.EncodeMeshToDracoBuffer(mesh, output); assert(encodedLength > 0);
  const encoded = Buffer.from(Array.from({length:encodedLength}, (_,i) => output.GetValue(i) & 255));
  for (const object of [output,encoder,builder,mesh]) m.destroy(object);
  const d = decoderModule, checkDecoder = new d.Decoder(), checkBuffer = new d.DecoderBuffer(), checkMesh = new d.Mesh();
  checkBuffer.Init(new Int8Array(encoded), encoded.length);
  const checkStatus = checkDecoder.DecodeBufferToMesh(checkBuffer, checkMesh); assert(checkStatus.ok());
  assert(checkMesh.num_faces() >= indices.length / 3 * .999);
  const finalFaces = checkMesh.num_faces(), finalVertices = checkMesh.num_points();
  for (const object of [checkStatus,checkMesh,checkBuffer,checkDecoder]) d.destroy(object);
  const chunks = [], views = []; let length = 0;
  const addView = bytes => {
    const pad = (4 - length % 4) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); length += pad; }
    const index = views.length; views.push({buffer:0,byteOffset:length,byteLength:bytes.length}); chunks.push(bytes); length += bytes.length; return index;
  };
  const textures = [];
  for (const image of gltf.images) {
    const bytes = viewBytes(image.bufferView), metadata = await sharp(bytes).metadata();
    const resize = Math.max(metadata.width,metadata.height) > textureSize;
    // Preserve data-map channels losslessly after resampling; color uses high-quality WebP.
    const colorImage = gltf.images[gltf.textures[gltf.materials[0].pbrMetallicRoughness.baseColorTexture.index].source] === image;
    const optimized = resize ? await sharp(bytes).resize({width:textureSize,height:textureSize,fit:'inside',withoutEnlargement:true}).webp(colorImage?{quality:95,effort:6}:{lossless:true,effort:6}).toBuffer() : bytes;
    if (resize) image.mimeType = 'image/webp';
    image.bufferView = addView(optimized);
    textures.push({from:[metadata.width,metadata.height],to:resize?[textureSize,textureSize]:[metadata.width,metadata.height],bytes:optimized.length});
  }
  primitive.extensions = {...primitive.extensions,KHR_draco_mesh_compression:{bufferView:addView(encoded),attributes:attributeIds}};
  for (const a of gltf.accessors) { delete a.bufferView; delete a.byteOffset; }
  const indexAccessor = gltf.accessors[primitive.indices]; indexAccessor.count = finalFaces * 3; indexAccessor.min = [0]; indexAccessor.max = [finalVertices - 1];
  for (const index of Object.values(primitive.attributes)) gltf.accessors[index].count = finalVertices;
  gltf.extensionsUsed = [...new Set([...(gltf.extensionsUsed ?? []),'KHR_draco_mesh_compression'])];
  gltf.extensionsRequired = [...new Set([...(gltf.extensionsRequired ?? []),'KHR_draco_mesh_compression'])];
  for (const texture of gltf.textures) if (gltf.images[texture.source]?.mimeType === 'image/webp') {
    texture.extensions = {...texture.extensions,EXT_texture_webp:{source:texture.source}}; delete texture.source;
    gltf.extensionsUsed = [...new Set([...gltf.extensionsUsed,'EXT_texture_webp'])];
    gltf.extensionsRequired = [...new Set([...gltf.extensionsRequired,'EXT_texture_webp'])];
  }
  gltf.bufferViews = views; gltf.buffers = [{byteLength:length}];
  const json = Buffer.from(JSON.stringify(gltf)), jsonPadded = Buffer.alloc(Math.ceil(json.length / 4) * 4,32); json.copy(jsonPadded);
  const bin = Buffer.concat(chunks), binPadded = Buffer.alloc(Math.ceil(bin.length / 4) * 4); bin.copy(binPadded);
  const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2,4); header.writeUInt32LE(28+jsonPadded.length+binPadded.length,8); header.writeUInt32LE(jsonPadded.length,12); header.writeUInt32LE(0x4e4f534a,16);
  binHeader.writeUInt32LE(binPadded.length); binHeader.writeUInt32LE(0x004e4942,4);
  const result = Buffer.concat([header,jsonPadded,binHeader,binPadded]); assert(result.length < source.length);
  const report = {name,beforeBytes:source.length,afterBytes:result.length,beforeFaces:originalFaces,afterFaces:finalFaces,error,textures}; reports.push(report);
  if (process.argv.includes('--write')) await writeFile(`public/models/${name}.glb`,result);
  console.log(JSON.stringify(report));
}
