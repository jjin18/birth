import * as THREE from 'three';

// The supplied bed is one merged mesh/material. Its headboard ends at z=-.398;
// the adjacent pillows begin in front of z=-.393. No mask texture is needed.
export const HEADBOARD_FRONT_Z=-.396;
const finished=new WeakSet<THREE.Material>();
export function applyBlackHeadboard(object:THREE.Object3D){
 object.traverse(node=>{
  if(!(node instanceof THREE.Mesh))return;
  for(const material of Array.isArray(node.material)?node.material:[node.material]){
   if(!(material instanceof THREE.MeshStandardMaterial)||finished.has(material))continue;
   const compile=material.onBeforeCompile,key=material.customProgramCacheKey();
   material.onBeforeCompile=function(shader,renderer){
    compile.call(this,shader,renderer); // Preserve lossless packed texture channels.
    shader.vertexShader='varying float vHeadboardFinish;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
     vHeadboardFinish=step(position.z,${HEADBOARD_FRONT_Z.toFixed(3)});`);
    shader.fragmentShader='varying float vHeadboardFinish;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
     float headboardGrain=dot(diffuseColor.rgb,vec3(0.2126,0.7152,0.0722));
     diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.007,0.008,0.009)*(0.8+0.2*headboardGrain),vHeadboardFinish);`);
   };
   material.customProgramCacheKey=()=>key+'|headboard-black-v1';
   material.needsUpdate=true;finished.add(material);
  }
 });
}
