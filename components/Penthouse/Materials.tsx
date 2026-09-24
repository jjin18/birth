'use client';
import { createContext,useContext,useEffect,useMemo,useState } from 'react';
import * as THREE from 'three';
type Maps={wood:THREE.Texture|null;fabric:THREE.Texture|null};
const Materials=createContext<Maps>({wood:null,fabric:null});
export function RoomMaterials({children}:{children:React.ReactNode}){
 const [maps,setMaps]=useState<Maps>({wood:null,fabric:null});
 useEffect(()=>{let active=true;const loaded:THREE.Texture[]=[];const loader=new THREE.TextureLoader();
  for(const [kind,path,repeats] of [['wood','/textures/wood-oak.jpg',1],['fabric','/textures/fabric-linen.jpg',5]] as const){loader.load(path,texture=>{if(!active){texture.dispose();return}texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.MirroredRepeatWrapping;texture.repeat.set(repeats,repeats);texture.anisotropy=4;loaded.push(texture);setMaps(old=>({...old,[kind]:texture}))})}
  return()=>{active=false;loaded.forEach(texture=>texture.dispose())};
 },[]);
 return <Materials.Provider value={maps}>{children}</Materials.Provider>;
}
export type SurfaceKind='wood'|'fabric'|'metal'|'leather'|'paint'|'stone';
export function Surface({color,kind='paint'}:{color:string;kind?:SurfaceKind}){
 const maps=useContext(Materials),map=kind==='wood'?maps.wood:kind==='fabric'?maps.fabric:null;
 const tint=useMemo(()=>kind==='wood'?new THREE.Color(color).lerp(new THREE.Color('#fff4df'),.58):new THREE.Color(color),[color,kind]);
 return <meshPhysicalMaterial key={kind+'-'+(map?.uuid??'plain')} color={tint} map={map} bumpMap={map} bumpScale={kind==='wood'?.018:kind==='fabric'?.012:0} roughness={kind==='metal'?.3:kind==='wood'?.47:kind==='leather'?.56:kind==='stone'?.28:kind==='fabric'?.95:.68} metalness={kind==='metal'?.8:0} clearcoat={kind==='wood'?.17:kind==='leather'?.06:0} clearcoatRoughness={.45} sheen={kind==='fabric'?1:0} sheenRoughness={.85} sheenColor={color}/>;
}
