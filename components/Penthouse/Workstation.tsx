'use client';
import { useEffect,useMemo,useState } from 'react';
import AeronChair from './AeronChair';
import { ImportedDesk } from './ImportedFurniture';
import { RoundedBox } from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import { Surface,type SurfaceKind } from './Materials';
import {keyboardColors,keyboardKeyColor} from '@/lib/room-finishes';
type V=[number,number,number];
function Part({p,s,c,kind='paint',r=.018,rotation}:{p:V;s:V;c:string;kind?:SurfaceKind;r?:number;rotation?:V}){return <RoundedBox position={p} args={s} radius={r} smoothness={4} rotation={rotation} castShadow receiveShadow><Surface color={c} kind={kind}/></RoundedBox>}
function Bar({from,to,r=.025,c='#34383a'}:{from:V;to:V;r?:number;c?:string}){const start=new THREE.Vector3(...from),end=new THREE.Vector3(...to),direction=end.clone().sub(start),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());return <mesh position={start.add(end).multiplyScalar(.5)} quaternion={q} castShadow><cylinderGeometry args={[r,r,direction.length(),16]}/><Surface color={c} kind="metal"/></mesh>}
function Screen({laptop=false,music=false}:{laptop?:boolean;music?:boolean}){
 const map=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=music?256:768;canvas.height=music?144:432;const ctx=canvas.getContext('2d')!;
  if(music){
   ctx.fillStyle='#101817';ctx.fillRect(0,0,256,144);ctx.fillStyle='#222f2a';ctx.fillRect(12,30,66,66);
   ctx.fillStyle='#b9cabc';ctx.font='40px Georgia';ctx.fillText('♫',26,77);ctx.fillStyle='#eef1e9';ctx.font='bold 12px Arial';ctx.fillText('Music for work',90,43);
   ctx.fillStyle='#9eaca5';ctx.font='9px Arial';ctx.fillText('Take a little break',90,58);ctx.fillStyle='#a9c4ae';
   for(let i=0;i<14;i++)ctx.fillRect(91+i*10,93-[8,18,12,25,19,29,14][i%7],5,[8,18,12,25,19,29,14][i%7]);
   ctx.fillStyle='#405148';ctx.fillRect(14,115,228,3);ctx.fillStyle='#b6cdb8';ctx.fillRect(14,115,88,3);
   ctx.fillStyle='#c6d8cb';ctx.beginPath();ctx.moveTo(124,124);ctx.lineTo(124,136);ctx.lineTo(135,130);ctx.closePath();ctx.fill();
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;return texture;
  }
  const bg=ctx.createLinearGradient(0,0,768,432);bg.addColorStop(0,'#102434');bg.addColorStop(1,'#284847');ctx.fillStyle=bg;ctx.fillRect(0,0,768,432);
  ctx.fillStyle='#0c1724';ctx.fillRect(40,43,688,345);ctx.fillStyle='#263849';ctx.fillRect(40,43,688,35);['#cb7968','#d5bd7b','#83a98c'].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(58+i*17,60,5,0,Math.PI*2);ctx.fill()});
  ctx.fillStyle='#182939';ctx.fillRect(40,78,125,310);ctx.font='15px monospace';ctx.fillStyle='#b5c5cd';ctx.fillText(laptop?'OUR NEXT CHAPTER':'PENTHOUSE 22',197,123);
  for(let line=0;line<12;line++){ctx.fillStyle=['#81b4b9','#c6ad85','#78919d'][line%3];ctx.fillRect(197+(line%3)*20,150+line*15,80+(line*73)%300,4)}
  ctx.fillStyle='#cad9d2';ctx.fillRect(339,410,90,3);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
 },[laptop,music]);useEffect(()=>()=>map.dispose(),[map]);
 return <mesh><planeGeometry args={music?[1.014,.563]:laptop?[.65,.405]:[1.17,.66]}/>{music?<meshBasicMaterial map={map} toneMapped={false}/>:<meshPhysicalMaterial map={map} emissiveMap={map} emissive="#ffffff" emissiveIntensity={.28} roughness={.18} metalness={.06} clearcoat={.65}/>}</mesh>;
}
function BlueIMac(){
 return <group name="blue-imac" position={[.76,1.11,-.35]}>
  <Part p={[0,.014,.025]} s={[.30,.024,.255]} c="#86aec8" kind="metal" r={.009}/>
  <Part p={[0,.177,-.041]} s={[.241,.325,.023]} c="#79a9c6" kind="metal" r={.009} rotation={[-.14,0,0]}/>
  <group position={[0,.627,-.067]} rotation={[-.025,0,0]}>
   <Part p={[0,0,0]} s={[1.09,.743,.039]} c="#477fa7" kind="metal" r={.018}/>
   <Part p={[0,.050,.023]} s={[1.064,.623,.008]} c="#edf2f5" r={.004}/>
   <Part p={[0,-.306,.024]} s={[1.064,.116,.008]} c="#93b4c9" kind="metal" r={.005}/>
   <group name="blue-imac-screen" position={[0,.044,.03]}><Screen music/></group>
   <mesh position={[0,.347,.031]}><sphereGeometry args={[.0045,10,8]}/><meshBasicMaterial color="#1d2935"/></mesh>
  </group>
 </group>;
}
export default function Workstation({onLaptop,onChair,onKeyboard}:{onLaptop:()=>void;onChair:()=>void;onKeyboard:()=>void}){const [deskSurface,setDeskSurface]=useState(1.2646);const [keyboardHover,setKeyboardHover]=useState(false);const {gl}=useThree();useEffect(()=>{if(!keyboardHover)return;gl.domElement.style.cursor='pointer';return()=>{gl.domElement.style.cursor='auto'}},[keyboardHover,gl]);return <group name="detailed-workstation" position={[3.15,0,-1.88]}>
 <group name="music-desk" onClick={event=>{event.stopPropagation();onLaptop()}}>
 <ImportedDesk onSurface={setDeskSurface}/>
 <group name="desktop-accessories" position={[0,deskSurface-1.0975,0]}>
 <Part p={[.02,1.107,.16]} s={[1.26,.012,.59]} c="#141a20" kind="leather" r={.005}/>
 <group name="desktop-monitor" position={[-.64,1.11,-.30]}>
  <Part p={[0,.015,.05]} s={[.42,.023,.31]} c="#444949" kind="metal" r={.012}/><Bar from={[0,.03,-.045]} to={[0,.38,-.08]} r={.028}/>
  <group position={[0,.66,-.04]} rotation={[-.04,0,0]}><Part p={[0,0,0]} s={[1.26,.75,.043]} c="#292e2f" kind="metal" r={.018}/><group position={[0,.015,.024]}><Screen/></group><mesh position={[.53,-.345,.027]}><sphereGeometry args={[.008,12,8]}/><meshBasicMaterial color="#b9dacf"/></mesh></group>
 </group>
 <BlueIMac/>
 <group name="laptop" position={[.91,1.12,.32]} rotation={[0,-.19,0]}>
  <Part p={[0,0,0]} s={[.72,.032,.5]} c="#b6b9b8" kind="metal" r={.014}/>
  <Part p={[0,.021,-.047]} s={[.64,.007,.24]} c="#2f3637" r={.003}/>
  {Array.from({length:4},(_,row)=>Array.from({length:11},(_,col)=><Part key={row+'-'+col} p={[-.276+col*.055,.027,-.135+row*.051]} s={[.043,.006,.036]} c="#687173" r={.002}/>))}
  <Part p={[0,.019,.154]} s={[.23,.003,.117]} c="#999fa0" kind="metal" r={.006}/>
  <group position={[0,.236,-.244]} rotation={[-.16,0,0]}><Part p={[0,0,0]} s={[.72,.46,.022]} c="#a8aeaf" kind="metal" r={.009}/><group position={[0,0,.015]}><Screen laptop/></group><mesh position={[0,.215,.015]}><sphereGeometry args={[.005,8,8]}/><meshBasicMaterial color="#111718"/></mesh></group>
 </group>
 <group name="mechanical-keyboard" position={[-.56,1.14,.30]} rotation={[.03,0,0]} onClick={event=>{event.stopPropagation();setKeyboardHover(false);onKeyboard()}} onPointerOver={event=>{event.stopPropagation();setKeyboardHover(true)}} onPointerOut={()=>setKeyboardHover(false)}>
  <mesh name="keyboard-click-target" position={[0,.025,0]}><boxGeometry args={[.96,.1,.42]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
  <Part p={[0,0,0]} s={[.85,.036,.315]} c={keyboardColors.case} kind="metal" r={.014}/>
  {Array.from({length:4},(_,row)=>Array.from({length:14},(_,col)=><Part key={row+'-'+col} p={[-.387+col*.059,.027,-.11+row*.053]} s={[.049,.021,.043]} c={keyboardKeyColor(row,col)} r={.005}/>))}
  {[-.35,-.285,-.22,.23,.295,.36].map(x=><Part key={x} p={[x,.027,.115]} s={[.053,.021,.044]} c={keyboardColors.modifier} r={.005}/>)}
  <Part p={[0,.027,.115]} s={[.345,.021,.044]} c={keyboardColors.space} r={.005}/>
 </group>
 <mesh position={[.24,1.15,.34]} scale={[.061,.036,.102]} castShadow><sphereGeometry args={[1,24,16]}/><Surface color="#d3d4ca"/></mesh>
 <Bar from={[-.64,1.21,-.45]} to={[-.64,.93,-.52]} r={.008} c="#242929"/>
 </group>
 </group>
 <group name="chair-message-trigger" onClick={event=>{event.stopPropagation();onChair()}}><AeronChair/></group>
</group>}
