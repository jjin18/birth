'use client';
import { useEffect,useMemo,useRef,useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { cities } from '@/lib/cities';
import { skyAtmosphere,skylinePath,type SkyMode } from '@/lib/daylight';

/** Keep the last valid texture until its replacement is decoded. One reusable
 * loader and explicit disposal avoid a blank window or a suspended whole room.
 */
export default function Backdrop({city,mode,onUnavailable}:{city:number;mode:SkyMode;onUnavailable:(unavailable:boolean)=>void}){
 const [texture,setTexture]=useState<THREE.Texture|null>(null);
 const current=useRef<THREE.Texture|null>(null),light=useRef<THREE.RectAreaLight>(null);
 const target=skyAtmosphere[mode],targetColor=useMemo(()=>new THREE.Color(target.color),[target.color]);
 const path=skylinePath(cities[city],mode);
 useEffect(()=>{
  let active=true;const loader=new THREE.TextureLoader();
  onUnavailable(false);
  loader.load(path,next=>{
   if(!active){next.dispose();return}
   next.colorSpace=THREE.SRGBColorSpace;next.repeat.set(1,.48);next.offset.set(0,.18);
   const old=current.current;current.current=next;setTexture(next);old?.dispose();
  },undefined,()=>{if(active)onUnavailable(true)});
  return()=>{active=false};
 },[path,onUnavailable]);
 useEffect(()=>()=>{current.current?.dispose();current.current=null},[]);
 useFrame((_,delta)=>{if(light.current){const blend=1-Math.exp(-delta*3);light.current.color.lerp(targetColor,blend);light.current.intensity=THREE.MathUtils.lerp(light.current.intensity,target.windowLight,blend)}});
 return <group name={`skyline-${cities[city].id}-${mode}`}>
  <mesh position={[0,1.84,-3.64]}><planeGeometry args={[10.02,3.1]}/>{texture?<meshBasicMaterial key="image" map={texture} color="#ffffff" toneMapped={false}/>:<meshBasicMaterial key="waiting" color={target.color}/>}</mesh>
  <rectAreaLight ref={light} position={[0,2.8,-3.3]} intensity={target.windowLight} color={target.color} width={10} height={3}/>
 </group>;
}
