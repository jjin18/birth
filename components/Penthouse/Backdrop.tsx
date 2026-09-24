'use client';
import { useEffect,useMemo,useRef,useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cities } from '@/lib/cities';
import { skyAtmosphere,skylinePath,type SkyMode } from '@/lib/daylight';
import { windowDimensions } from '@/lib/room-dimensions';

/** Keep the last valid texture until its replacement is decoded. One reusable
 * loader and explicit disposal avoid a blank window or a suspended whole room.
 */
export default function Backdrop({interior,city,mode,onUnavailable}:{interior:boolean;city:number;mode:SkyMode;onUnavailable:(unavailable:boolean)=>void}){
 const [texture,setTexture]=useState<THREE.Texture|null>(null);
 const current=useRef<THREE.Texture|null>(null),light=useRef<THREE.RectAreaLight>(null);
 const target=skyAtmosphere[mode],targetColor=useMemo(()=>new THREE.Color(target.color),[target.color]);
 const path=skylinePath(cities[city],mode);
 const window=windowDimensions(interior);
 useEffect(()=>{
  let active=true;const loader=new THREE.TextureLoader();
  onUnavailable(false);
  loader.load(path,next=>{
   if(!active){next.dispose();return}
   next.colorSpace=THREE.SRGBColorSpace;
   const old=current.current;current.current=next;setTexture(next);old?.dispose();
  },undefined,()=>{if(active)onUnavailable(true)});
  return()=>{active=false};
 },[path,onUnavailable]);
 useEffect(()=>{if(texture){texture.repeat.set(1,window.cropHeight);texture.offset.set(0,window.cropBottom);texture.needsUpdate=true}},[texture,window.cropHeight,window.cropBottom]);
 useEffect(()=>()=>{current.current?.dispose();current.current=null},[]);
 useFrame((_,delta)=>{if(light.current){const blend=1-Math.exp(-delta*3);light.current.color.lerp(targetColor,blend);light.current.intensity=THREE.MathUtils.lerp(light.current.intensity,target.windowLight*3/window.height,blend)}});
 return <group name={`skyline-${cities[city].id}-${mode}`}>
  <mesh position={[0,window.center,-3.64]}><planeGeometry args={[10.02,window.height+.02]}/>{texture?<meshBasicMaterial key="image" map={texture} color="#ffffff" toneMapped={false}/>:<meshBasicMaterial key="waiting" color={target.color}/>}</mesh>
  <rectAreaLight ref={light} position={[0,window.center,-3.3]} intensity={target.windowLight*3/window.height} color={target.color} width={10} height={window.height}/>
 </group>;
}
