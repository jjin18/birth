'use client';
import { useEffect, useState } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import ImportedDog from './ImportedDog';
import ImportedLamp from './ImportedLamp';

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
 return <group name="room-lamp" position={[-.45,.075,-2.65]} {...pointer} onClick={e=>{e.stopPropagation();toggle()}}>
  <ImportedLamp on={on}/>
 </group>;
}

export function Dog({reaction,click}:{reaction:number;click:()=>void}) {
 const pointer=usePointer();
 return <group name="white-dog" position={[-2.7,.075,2.45]} rotation={[0,.35,0]} {...pointer} onClick={e=>{e.stopPropagation();click()}}>
  <ImportedDog reaction={reaction}/>
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

export function BoxingGloves({click,position,scale=1}:{click:()=>void;position:Vec;scale?:number}) {
 const pointer=usePointer();
 return <group name="boxing-gloves" position={position} scale={scale} {...pointer} onClick={e=>{e.stopPropagation();click()}}>
  <Glove p={[-.24,0,.035]} rotation={[0,-.38,.12]}/>
  <Glove p={[.23,.018,-.065]} rotation={[0,.48,-.14]} mirror/>
  <mesh position={[0,.18,.05]}><boxGeometry args={[1,.55,.9]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
 </group>;
}
