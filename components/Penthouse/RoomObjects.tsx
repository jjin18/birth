'use client';
import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import Terrier from './Terrier';

type Vec = [number, number, number];
function Sphere({p,s,c,rotation,roughness=.85}:{p:Vec;s:Vec;c:string;rotation?:Vec;roughness?:number}) {
 return <mesh position={p} scale={s} rotation={rotation} castShadow receiveShadow><sphereGeometry args={[1,24,16]}/><meshStandardMaterial color={c} roughness={roughness}/></mesh>;
}
function usePointer() {
 const [hovered,setHovered]=useState(false);
 const {gl}=useThree();
 useEffect(()=>{if(!hovered)return;gl.domElement.style.cursor='pointer';return()=>{gl.domElement.style.cursor='auto'}},[hovered,gl]);
 return {onPointerOver:(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();setHovered(true)},onPointerOut:()=>setHovered(false)};
}

export function Lamp({on,toggle}:{on:boolean;toggle:()=>void}) {
 const pointer=usePointer();
 const bulb=useRef<THREE.PointLight>(null);
 const shade=useRef<THREE.MeshStandardMaterial>(null);
 useFrame((_,delta)=>{
  const speed=1-Math.exp(-delta*6);
  if(bulb.current)bulb.current.intensity=THREE.MathUtils.lerp(bulb.current.intensity,on?18:0,speed);
  if(shade.current)shade.current.emissiveIntensity=THREE.MathUtils.lerp(shade.current.emissiveIntensity,on?.5:0,speed);
 });
 return <group name="room-lamp" position={[-.45,.08,-2.65]} {...pointer} onClick={e=>{e.stopPropagation();toggle()}}>
  <mesh position={[0,.03,0]} castShadow receiveShadow><cylinderGeometry args={[.23,.23,.06,32]}/><meshStandardMaterial color="#49483a" roughness={.45}/></mesh>
  <mesh position={[0,1.05,0]} castShadow><cylinderGeometry args={[.025,.025,2.1,20]}/><meshStandardMaterial color="#b9a271" roughness={.35} metalness={.45}/></mesh>
  <mesh position={[0,2.1,0]} castShadow><cylinderGeometry args={[.27,.37,.46,48]}/><meshStandardMaterial ref={shade} color="#e5cdaa" emissive="#f3b959" emissiveIntensity={.5} roughness={1} side={THREE.DoubleSide}/></mesh>
  <mesh position={[0,1.91,0]}><sphereGeometry args={[.065,16,12]}/><meshBasicMaterial color={on?'#ffe2ad':'#8b8980'}/></mesh>
  <pointLight ref={bulb} position={[0,1.94,0]} color="#ffcf8e" intensity={18} distance={7} decay={2}/>
 </group>;
}

export function Dog({reaction,click}:{reaction:number;click:()=>void}) {
 const pointer=usePointer();
 return <group name="white-dog" position={[.2,.10,2.65]} rotation={[0,.55,0]} {...pointer} onClick={e=>{e.stopPropagation();click()}}>
  <mesh position={[0,.005,0]} receiveShadow><cylinderGeometry args={[.74,.72,.08,48]}/><meshStandardMaterial color="#a49580" roughness={1}/></mesh>
  <Terrier reaction={reaction}/>
 </group>;
}

function Glove({p,rotation,mirror=false}:{p:Vec;rotation:Vec;mirror?:boolean}) {
 return <group position={p} rotation={rotation} scale={[mirror?-1:1,1,1]}>
  <Sphere p={[0,.18,-.08]} s={[.22,.18,.28]} c="#a33e31" roughness={.36}/>
  <Sphere p={[.18,.105,.045]} s={[.095,.12,.175]} c="#91362d" rotation={[0,-.35,.18]} roughness={.38}/>
  <RoundedBox position={[0,.115,.235]} args={[.34,.2,.25]} radius={.055} smoothness={4} castShadow receiveShadow><meshStandardMaterial color="#6d3029" roughness={.45}/></RoundedBox>
  <RoundedBox position={[0,.224,.245]} args={[.25,.025,.105]} radius={.011} smoothness={2}><meshStandardMaterial color="#ddd4bb" roughness={.8}/></RoundedBox>
  <mesh position={[0,.333,-.07]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.061,28]}/><meshStandardMaterial color="#e3c79b" roughness={.65}/></mesh>
  <mesh position={[0,.116,.367]}><planeGeometry args={[.19,.04]}/><meshStandardMaterial color="#d0ba91" roughness={1}/></mesh>
 </group>;
}

export function BoxingGloves({click}:{click:()=>void}) {
 const pointer=usePointer();
 return <group name="boxing-gloves" position={[-.55,.525,1.55]} {...pointer} onClick={e=>{e.stopPropagation();click()}}>
  <Glove p={[-.24,0,.035]} rotation={[0,-.38,.12]}/>
  <Glove p={[.23,.018,-.065]} rotation={[0,.48,-.14]} mirror/>
  <mesh position={[0,.18,.05]}><boxGeometry args={[1,.55,.9]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
 </group>;
}
