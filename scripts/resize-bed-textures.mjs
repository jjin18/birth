import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// The user approved a bed-only resolution reduction. Keep the original in
// Git history, not in public/, and never simplify or re-encode its geometry.
const source=execFileSync('git',['show','54f411c8a4cb9c01e5037e0b6af84dc9d9ddecc8:public/models/uploaded-bed-v2.glb'],{maxBuffer:64*1024*1024});
assert.equal(source.readUInt32LE(0),0x46546c67);
assert.equal(source.readUInt32LE(4),2);
const jsonLength=source.readUInt32LE(12),binary=source.subarray(28+jsonLength);
const gltf=JSON.parse(source.subarray(20,20+jsonLength));
const before=structuredClone(gltf),views=before.bufferViews;
const imageViews=new Map(),images=[];
assert.equal(gltf.images.length,2,'Only the audited bed color and roughness/metalness maps are expected');
for(const image of gltf.images){
  assert.equal(image.mimeType,'image/png');
  const view=views[image.bufferView];assert.equal(view.buffer,0);
  const bytes=binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
  const metadata=await sharp(bytes).metadata();
  assert.equal(metadata.width,4096);assert.equal(metadata.height,4096);
  const resized=await sharp(bytes).resize(2048,2048,{kernel:'lanczos3'}).png({compressionLevel:9,palette:false}).toBuffer();
  const after=await sharp(resized).metadata();assert.equal(after.width,2048);assert.equal(after.height,2048);
  imageViews.set(image.bufferView,resized);
  images.push({width:after.width,height:after.height,originalBytes:bytes.length,bytes:resized.length});
}
const chunks=[];let length=0;
const digest=data=>createHash('sha256').update(data).digest('hex');
for(let index=0;index<views.length;index++){
  const view=views[index];assert.equal(view.buffer,0);
  const original=binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
  const bytes=imageViews.get(index)||original;
  const padding=(4-length%4)%4;if(padding){chunks.push(Buffer.alloc(padding));length+=padding;}
  gltf.bufferViews[index]={...view,byteOffset:length,byteLength:bytes.length};
  chunks.push(bytes);length+=bytes.length;
}
const packed=Buffer.concat(chunks);
for(let index=0;index<views.length;index++)if(!imageViews.has(index)){
  const old=views[index],next=gltf.bufferViews[index];
  assert.equal(digest(binary.subarray(old.byteOffset||0,(old.byteOffset||0)+old.byteLength)),
    digest(packed.subarray(next.byteOffset,next.byteOffset+next.byteLength)),'Geometry/accessor data changed');
}
gltf.buffers=[{byteLength:length}];
const comparable=structuredClone(gltf);comparable.bufferViews=before.bufferViews;comparable.buffers=before.buffers;
assert.deepEqual(comparable,before,'The scene, materials, UVs and all non-image settings must remain identical');
const json=Buffer.from(JSON.stringify(gltf));
const jsonPadded=Buffer.alloc(Math.ceil(json.length/4)*4,0x20);json.copy(jsonPadded);
const binPadded=Buffer.alloc(Math.ceil(packed.length/4)*4);packed.copy(binPadded);
const header=Buffer.alloc(20),binHeader=Buffer.alloc(8);
header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jsonPadded.length+binPadded.length,8);
header.writeUInt32LE(jsonPadded.length,12);header.writeUInt32LE(0x4e4f534a,16);
binHeader.writeUInt32LE(binPadded.length,0);binHeader.writeUInt32LE(0x004e4942,4);
const result=Buffer.concat([header,jsonPadded,binHeader,binPadded]);
const output=new URL('../public/models/uploaded-bed-2k.glb',import.meta.url);
if(process.argv.includes('--write'))await writeFile(output,result);
console.log(JSON.stringify({originalBytes:source.length,optimizedBytes:result.length,images,geometryAndMaterialsUnchanged:true,written:process.argv.includes('--write')}));
