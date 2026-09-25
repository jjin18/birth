import * as THREE from 'three';
import {applyPackedMaterial} from './model-textures';

/** Override only the named Motia leg/foot assemblies, never the tabletop. */
export function applyBlackDeskLegs(object:THREE.Object3D){
 const copies=new Map<THREE.Material,THREE.MeshStandardMaterial>();
 object.traverse(node=>{
  if(!(node instanceof THREE.Mesh)||!/^HRM-MOTIA-(?:30-)?LEG-(?:LEFT|RIGHT)-/i.test(node.name))return;
  const black=(source:THREE.Material)=>{
   if(!(source instanceof THREE.MeshStandardMaterial))return source;
   let material=copies.get(source);
   if(!material){
    material=source.clone();material.color.set('#17191b');
    material.roughness=.6;material.metalness=.25;
    applyPackedMaterial(material);copies.set(source,material);
   }
   return material;
  };
  node.material=Array.isArray(node.material)?node.material.map(black):black(node.material);
 });
 return [...copies.values()];
}
