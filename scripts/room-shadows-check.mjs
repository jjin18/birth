import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {Scene,Mesh,BoxGeometry,MeshBasicMaterial} from 'three';
import {N8AOPostPass} from 'n8ao';

const compiled=await build({entryPoints:['lib/room-ao.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {protectRoomShadowMaps}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));

// Exercise the installed N8AO transparency implementation, not a copy of it.
const scene=new Scene(),geometry=new BoxGeometry();
const opaqueMaterial=new MeshBasicMaterial(),glassMaterial=new MeshBasicMaterial({transparent:true,depthWrite:false});
const chair=new Mesh(geometry,opaqueMaterial),glass=new Mesh(geometry,glassMaterial);chair.name='chair';chair.castShadow=true;scene.add(chair,glass);
const renderer={
 shadowMap:{enabled:true,autoUpdate:true,needsUpdate:false},autoClearDepth:true,cache:'complete',draws:0,
 getClearColor:color=>color.set('#122334'),getClearAlpha:()=>1,setClearColor(){},setRenderTarget(){},clear(){},
 render(scene){this.draws++;if(this.shadowMap.enabled&&(this.shadowMap.autoUpdate||this.shadowMap.needsUpdate)){this.cache=chair.visible?'complete':'missing-chair';this.shadowMap.needsUpdate=false}}
};
const pass={scene,camera:{},depthTexture:{},configuration:{depthBufferType:0},depthCopyPass:{material:{uniforms:{depthTexture:{},reverseDepthBuffer:{}}},render(){}},
 render(renderer){N8AOPostPass.prototype.renderTransparency.call(this,renderer);return 'rendered'}
};
pass.render(renderer);assert.equal(renderer.cache,'missing-chair','reproduce the old auxiliary pass overwriting the furniture shadow');
assert(chair.visible&&glass.visible,'N8AO restores visibility but did not restore the shadow contents');
protectRoomShadowMaps(pass);
for(const autoUpdate of [true,false])for(const needsUpdate of [true,false]){
 renderer.cache='complete';renderer.shadowMap.autoUpdate=autoUpdate;renderer.shadowMap.needsUpdate=needsUpdate;
 const before={...renderer.shadowMap},draws=renderer.draws;
 assert.equal(pass.render(renderer),'rendered');assert.equal(renderer.draws,draws+2,'transparent layers still render normally');
 assert.equal(renderer.cache,'complete','active, idle and pending refresh all preserve the complete main-render shadow map');
 assert.deepEqual(renderer.shadowMap,before,'all renderer flags restored for the next main frame');
 assert(chair.visible&&glass.visible);
}
const throwing={render(){throw Error('test render failure')}};protectRoomShadowMaps(throwing);
const beforeFailure={...renderer.shadowMap};assert.throws(()=>throwing.render(renderer),/test render failure/);assert.deepEqual(renderer.shadowMap,beforeFailure,'even failed postprocessing restores shadow policy');
const effects=await readFile('components/Penthouse/RoomEffects.tsx','utf8');assert(effects.includes('protectRoomShadowMaps(pass)'),'the real room installs the protection');
assert(effects.includes('multisampling={4}')&&effects.includes("pass.setQualityMode('Medium')"),'anti-aliasing and AO quality are unchanged');
const source=await readFile('components/Penthouse/Scene.tsx','utf8');assert(source.includes('shadowSize={2048}')&&source.includes('MAX_ROOM_DPR'),'high-resolution light shadows and display quality retained');
assert(source.includes('!props.interior&&props.ready&&<ContactShadows'),'one-shot grounding shadow waits for the loaded exterior and never captures the long interior floor');
geometry.dispose();opaqueMaterial.dispose();glassMaterial.dispose();
console.log('PASS: reproduced real N8AO shadow-cache corruption, preserved shadows across active/idle modes, transparent layers intact, exception-safe flags, original quality retained.');
