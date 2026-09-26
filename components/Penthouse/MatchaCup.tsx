'use client';
import {useEffect,useMemo,useState} from 'react';
import {useThree,type ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';

// A real hollow ceramic cup, not an image plane. Both sides of the rim have
// thickness, so the teacup reads correctly from either room camera.
export default function MatchaCup({position,click}:{position:[number,number,number];click:()=>void}){
 const {gl}=useThree();
 const [hover,setHover]=useState(false);
 useEffect(()=>{if(!hover)return;gl.domElement.style.cursor='pointer';return()=>{gl.domElement.style.cursor='auto'}},[gl,hover]);
 const {bowl,saucer,handle}=useMemo(()=>({
  bowl:[[.001,.052],[.105,.052],[.138,.068],[.172,.105],[.2,.158],[.225,.225],[.239,.281],[.239,.296],[.235,.303],[.226,.303],[.22,.294],[.214,.25],[.196,.192],[.17,.139],[.131,.105],[.085,.094],[.001,.094]].map(([x,y])=>new THREE.Vector2(x,y)),
  saucer:[[0,.014],[.17,.014],[.235,.018],[.315,.028],[.363,.046],[.378,.06],[.374,.071],[.355,.075],[.303,.054],[.235,.042],[.15,.036],[0,.036]].map(([x,y])=>new THREE.Vector2(x,y)),
  handle:new THREE.CatmullRomCurve3([new THREE.Vector3(.219,.257,0),new THREE.Vector3(.33,.277,0),new THREE.Vector3(.386,.218,0),new THREE.Vector3(.359,.137,0),new THREE.Vector3(.176,.107,0)])
 }),[]);
 const ceramic=<meshPhysicalMaterial color="#eee5d2" roughness={.22} metalness={0} clearcoat={.6} clearcoatRoughness={.17}/>;
 return <group name="matcha-teacup" position={position} scale={.8} rotation={[0,-.4,0]} onClick={e=>{e.stopPropagation();click()}} onPointerOver={(e:ThreeEvent<PointerEvent>)=>{e.stopPropagation();setHover(true)}} onPointerOut={()=>setHover(false)}>
  <mesh castShadow receiveShadow><latheGeometry args={[saucer,64]}/>{ceramic}</mesh>
  <mesh castShadow receiveShadow><latheGeometry args={[bowl,64]}/>{ceramic}</mesh>
  <mesh castShadow><tubeGeometry args={[handle,36,.026,10,false]}/>{ceramic}</mesh>
  <mesh position={[0,.043,0]} rotation={[Math.PI/2,0,0]} castShadow><torusGeometry args={[.099,.014,10,48]}/>{ceramic}</mesh>
  <mesh position={[0,.273,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><circleGeometry args={[.221,64]}/><meshPhysicalMaterial color="#758d37" roughness={.3} clearcoat={.45}/></mesh>
  <mesh position={[0,.276,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[.212,.0045,8,64]}/><meshStandardMaterial color="#9cad62" roughness={.6}/></mesh>
  <mesh position={[0,.12,0]}><cylinderGeometry args={[.4,.4,.34,16]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
 </group>;
}
