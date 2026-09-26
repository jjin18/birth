import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Color,ShaderLib,Group,Mesh,BoxGeometry,MeshStandardMaterial} from 'three';

const result=await build({entryPoints:['lib/room-finishes.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {floorPlankColors,tintFloorShader,floorProgramKey,keyboardColors,keyboardKeyColor}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const shader={fragmentShader:ShaderLib.physical.fragmentShader};
tintFloorShader(shader);
assert.equal((shader.fragmentShader.match(/float floorLuminance=/g)||[]).length,1);
assert(shader.fragmentShader.includes('#include <map_fragment>'),'keep the existing wood texture sample');
assert.equal(floorProgramKey(),'smoked-grey-oak-v1');
const luminance=c=>c.r*.2126+c.g*.7152+c.b*.0722;
const chroma=c=>Math.max(c.r,c.g,c.b)-Math.min(c.r,c.g,c.b);
const oldColors=['#93704f','#a07d58','#ab815a','#9e7550','#ad865d'];
// Compare representative oak texels in linear RGB under identical lighting.
for(const sample of ['#b99465','#856644','#d5b88d'])for(let i=0;i<5;i++){
 const texel=new Color(sample),before=new Color(oldColors[i]).lerp(new Color('#fff4df'),.58).multiply(texel);
 const after=new Color(floorPlankColors[i]).multiply(texel),grey=new Color().setRGB(luminance(after),luminance(after),luminance(after));
 after.lerp(grey,.55);
 assert(luminance(after)<luminance(before)*.85,'floor is noticeably darker');
 assert(chroma(after)<chroma(before)*.6,'floor has a restrained grey wash');
 assert(chroma(after)>0,'retain some natural wood warmth');
}
for(const file of ['Scene.tsx','InteriorEnvelope.tsx']){
 const source=await readFile('components/Penthouse/'+file,'utf8');
 assert(source.includes('floorPlankColors')&&source.includes('kind="floor"'),'all floor sections share the finish');
}
const materials=await readFile('components/Penthouse/Materials.tsx','utf8');
assert(materials.includes('map=isWood?maps.wood'),'reuse the existing oak map');
assert(materials.includes('bumpMap={map} bumpScale={isWood?.018'),'retain wood grain relief');
assert(materials.includes('useTexture(texturePaths)')&&!materials.includes('setMaps'),'floor is textured on its first visible frame, not recoloured by late state');
const scene=await readFile('components/Penthouse/Scene.tsx','utf8');
assert(scene.includes('<Suspense fallback={null}><RoomMaterials>'),'texture wait never blanks the skyline or whole canvas');
const lighting=await readFile('components/Penthouse/Lighting.tsx','utf8');
assert(lighting.includes('scene.environmentIntensity=initial.environment')&&lighting.includes('intensity={initial.ambient}'),'first frame uses the finished lighting instead of ramping from night defaults');
const workstation=await readFile('components/Penthouse/Workstation.tsx','utf8');
const keyboard=workstation.split('<group name="mechanical-keyboard"')[1]?.split('</group>')[0];
assert(keyboard,'mechanical keyboard exists');
assert(keyboard.includes('keyboardKeyColor(row,col)'));
assert.equal(keyboardKeyColor(0,0),keyboardColors.accent,'red Escape');
assert.equal(keyboardKeyColor(2,13),keyboardColors.accent,'red Enter');
assert.equal(keyboardKeyColor(1,5),keyboardColors.key,'slate-grey letter keys');
assert.equal(keyboardKeyColor(2,0),keyboardColors.modifier,'charcoal modifiers');
assert(luminance(new Color(keyboardColors.key))>luminance(new Color(keyboardColors.modifier)));
assert.equal(Array.from({length:56},(_,i)=>keyboardKeyColor(Math.floor(i/14),i%14)).filter(c=>c===keyboardColors.accent).length,2,'only two red accents, no additional keys');
assert(!workstation.includes('<group position={[-1.02,1.12,.24]}>'),'coffee mug, coffee surface and handle are removed');

const finishBundle=await build({entryPoints:['lib/desk-finish.ts'],bundle:true,write:false,format:'esm',platform:'node',packages:'external'});
const finishCode=finishBundle.outputFiles[0].text.replace(/from "([^\"]+)"/g,(_,name)=>`from ${JSON.stringify(import.meta.resolve(name))}`);
const {applyBlackDeskLegs}=await import('data:text/javascript;base64,'+Buffer.from(finishCode).toString('base64'));
const bytes=await readFile('public/models/herman-miller-motia-desk.glb');
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
const sourceMaterials=gltf.materials.map(m=>new MeshStandardMaterial({color:new Color().setRGB(...m.pbrMetallicRoughness.baseColorFactor.slice(0,3)),metalness:m.pbrMetallicRoughness.metallicFactor,roughness:m.pbrMetallicRoughness.roughnessFactor}));
const source=new Group(),geometry=new BoxGeometry();
for(const node of gltf.nodes.filter(n=>n.mesh!==undefined)){
 const mesh=new Mesh(geometry,gltf.meshes[node.mesh].primitives.map(p=>sourceMaterials[p.material]));mesh.name=node.name;source.add(mesh);
}
const object=source.clone(true),copies=applyBlackDeskLegs(object);
assert.equal(copies.length,4,'all four supplied silver leg/foot materials are blackened');
for(let i=0;i<object.children.length;i++){
 const original=source.children[i],changed=object.children[i];
 assert.equal(changed.geometry,original.geometry,'no extra geometry allocation');
 if(changed.name.includes('-LEG-')){
  changed.material.forEach((m,j)=>{assert.notEqual(m,original.material[j]);assert.equal(m.color.getHexString(),'17191b');assert.equal(m.roughness,.6);assert.equal(m.metalness,.25)});
 }else assert.deepEqual(changed.material,original.material,'tabletop, edge, controls and casters are untouched');
}
for(const index of [4,5,8,9])assert(Math.abs(sourceMaterials[index].color.r-.4396571738409188)<1e-10,'shared model cache retains the original silver material');
copies.forEach(m=>m.dispose());sourceMaterials.forEach(m=>m.dispose());geometry.dispose();
const bedBundle=await build({entryPoints:['lib/bed-finish.ts'],bundle:true,write:false,format:'esm',platform:'node',packages:'external'});
const bedCode=bedBundle.outputFiles[0].text.replace(/from "([^\"]+)"/g,(_,name)=>`from ${JSON.stringify(import.meta.resolve(name))}`);
const {applyBlackHeadboard,HEADBOARD_FRONT_Z}=await import('data:text/javascript;base64,'+Buffer.from(bedCode).toString('base64'));
assert(HEADBOARD_FRONT_Z>-.398&&HEADBOARD_FRONT_Z<-.393,'isolate headboard behind pillow geometry');
const bedMaterial=new MeshStandardMaterial(),bedGeometry=new BoxGeometry(),bed=new Mesh(bedGeometry,bedMaterial);
let previousHookCalled=false;bedMaterial.onBeforeCompile=()=>{previousHookCalled=true};
const originalAttributes=bedGeometry.attributes;
applyBlackHeadboard(bed);
assert.equal(bed.material,bedMaterial,'reuse the existing bed material');
assert.equal(bed.geometry,bedGeometry);assert.equal(bedGeometry.attributes,originalAttributes,'no extra geometry or attributes');
const version=bedMaterial.version;
applyBlackHeadboard(bed);assert.equal(bedMaterial.version,version,'material hook is applied only once');
const bedShader={vertexShader:ShaderLib.physical.vertexShader,fragmentShader:ShaderLib.physical.fragmentShader};
bedMaterial.onBeforeCompile(bedShader,{});assert(previousHookCalled,'preserve existing packed-texture shader');
assert(bedShader.vertexShader.includes('step(position.z,-0.396)'));
assert(bedShader.fragmentShader.includes('headboardGrain'));
assert(!bedShader.fragmentShader.includes('sampler2D headboard'),'no additional texture sampler');
bedMaterial.dispose();bedGeometry.dispose();
console.log('PASS: reference keyboard palette, black desk legs/headboard, unchanged model geometry/textures, no coffee mug, and darker grey-washed oak.');
