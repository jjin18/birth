'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

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
 const body=useRef<THREE.Group>(null),head=useRef<THREE.Group>(null),tail=useRef<THREE.Group>(null),eyes=useRef<THREE.Group>(null),jaw=useRef<THREE.Group>(null);
 const excitedUntil=useRef(0);
 const reduced=useMemo(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches,[]);
 useEffect(()=>{if(reaction)excitedUntil.current=performance.now()+1600},[reaction]);
 useFrame(({clock},delta)=>{
  const t=clock.elapsedTime,excited=performance.now()<excitedUntil.current;
  if(body.current)body.current.scale.y=1+(reduced?0:Math.sin(t*1.8)*.025);
  if(tail.current){tail.current.rotation.y=reduced?0:Math.sin(t*(excited?17:4))*(excited?.9:.23);tail.current.rotation.z=reduced?0:Math.sin(t*3)*.11}
  if(head.current){head.current.position.y=THREE.MathUtils.lerp(head.current.position.y,excited?.48:.33,1-Math.exp(-delta*8));head.current.rotation.y=reduced?0:Math.sin(t*.65)*.15;head.current.rotation.z=excited?-.12:Math.sin(t*.9)*.025}
  if(eyes.current)eyes.current.scale.y=!excited&&t%5.3<.17?.08:1;
  if(jaw.current)jaw.current.position.y=excited?-.04-Math.max(0,Math.sin(t*19))*.045:-.035;
 });
 return <group name="white-dog" position={[.2,.17,2.65]} rotation={[0,-.45,0]} {...pointer} onClick={e=>{e.stopPropagation();click()}}>
  <mesh position={[0,.02,0]} receiveShadow><cylinderGeometry args={[.74,.72,.09,40]}/><meshStandardMaterial color="#a49580" roughness={1}/></mesh>
  <group ref={body}>
   <Sphere p={[-.03,.24,0]} s={[.47,.25,.32]} c="#eee7d8"/>
   <Sphere p={[.18,.1,.31]} s={[.24,.075,.09]} c="#fff3dd"/>
   <Sphere p={[.25,.1,-.08]} s={[.23,.075,.085]} c="#f5ead5"/>
   <group ref={tail} position={[-.43,.25,-.08]}><Sphere p={[-.16,.11,0]} s={[.24,.11,.1]} c="#eee7d8" rotation={[0,0,-.35]}/><Sphere p={[-.31,.18,.015]} s={[.11,.11,.1]} c="#f6eedd"/></group>
   <group ref={head} position={[.3,.33,.12]}>
    <Sphere p={[0,0,0]} s={[.25,.24,.23]} c="#f6efdf"/>
    <Sphere p={[.16,-.06,.09]} s={[.17,.11,.13]} c="#faf2de"/>
    <Sphere p={[.285,-.04,.12]} s={[.048,.039,.05]} c="#37352e"/>
    <Sphere p={[-.12,.12,.18]} s={[.115,.19,.08]} c="#d3c6ae" rotation={[0,.2,-.45]}/>
    <Sphere p={[.06,.14,-.15]} s={[.1,.17,.08]} c="#ded3bd" rotation={[0,-.3,.3]}/>
    <group ref={eyes} position={[.09,.048,.185]}><Sphere p={[.005,0,.021]} s={[.031,.033,.027]} c="#302e2a"/><Sphere p={[.121,.009,-.145]} s={[.025,.03,.026]} c="#302e2a"/><Sphere p={[.015,.012,.043]} s={[.009,.01,.006]} c="#ffffff"/></group>
    <group ref={jaw} position={[.17,-.035,.09]}><Sphere p={[.028,-.105,.015]} s={[.12,.026,.07]} c="#4c3d35"/><Sphere p={[.095,-.113,.033]} s={[.05,.016,.03]} c="#bf867f"/></group>
   </group>
  </group>
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
