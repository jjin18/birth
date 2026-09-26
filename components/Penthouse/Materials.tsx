'use client';
import { assetUrl } from '@/lib/asset-url';
import { createContext,useContext,useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import {tintFloorShader,floorProgramKey} from '@/lib/room-finishes';
type Maps={wood:THREE.Texture|null;fabric:THREE.Texture|null};
const Materials=createContext<Maps>({wood:null,fabric:null});
const texturePaths=[assetUrl('/textures/wood-oak.jpg'),assetUrl('/textures/fabric-linen.jpg')];
if(typeof window!=='undefined')useTexture.preload(texturePaths);
export function RoomMaterials({children}:{children:React.ReactNode}){
 // Suspend this room group until the real maps are ready. A plain material
 // followed by a textured one visibly changes the floor's colour on slow loads.
 const textures=useTexture(texturePaths);
 const maps=useMemo(()=>{
  textures.forEach((texture,index)=>{texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.MirroredRepeatWrapping;texture.repeat.set(index===0?1:5,index===0?1:5);texture.anisotropy=4;texture.needsUpdate=true});
  return {wood:textures[0],fabric:textures[1]};
 },[textures]);
 return <Materials.Provider value={maps}>{children}</Materials.Provider>;
}
export type SurfaceKind='wood'|'floor'|'fabric'|'metal'|'leather'|'paint'|'stone';
export function Surface({color,kind='paint'}:{color:string;kind?:SurfaceKind}){
 const maps=useContext(Materials),isFloor=kind==='floor',isWood=kind==='wood'||isFloor,map=isWood?maps.wood:kind==='fabric'?maps.fabric:null;
 const tint=useMemo(()=>kind==='wood'?new THREE.Color(color).lerp(new THREE.Color('#fff4df'),.58):new THREE.Color(color),[color,kind]);
 return <meshPhysicalMaterial key={kind+'-'+(map?.uuid??'plain')} color={tint} map={map} bumpMap={map} bumpScale={isWood?.018:kind==='fabric'?.012:0} roughness={isFloor?.58:kind==='metal'?.3:kind==='wood'?.47:kind==='leather'?.56:kind==='stone'?.28:kind==='fabric'?.95:.68} metalness={kind==='metal'?.8:0} clearcoat={isWood?.17:kind==='leather'?.06:0} clearcoatRoughness={.45} sheen={kind==='fabric'?1:0} sheenRoughness={.85} sheenColor={color} {...(isFloor?{onBeforeCompile:tintFloorShader,customProgramCacheKey:floorProgramKey}:{})}/>;
}
