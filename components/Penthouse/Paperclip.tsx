'use client';
import { useEffect,useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
export default function Paperclip({count,click}:{count:number;click:()=>void}){
 const curve=useMemo(()=>new THREE.CatmullRomCurve3([
  new THREE.Vector3(-.05,.014,.13),new THREE.Vector3(-.05,.014,-.1),new THREE.Vector3(0,.014,-.15),new THREE.Vector3(.055,.014,-.1),new THREE.Vector3(.055,.014,.14),new THREE.Vector3(-.015,.014,.21),new THREE.Vector3(-.095,.014,.14),new THREE.Vector3(-.095,.014,-.16),new THREE.Vector3(-.025,.014,-.225),new THREE.Vector3(.11,.014,-.16),new THREE.Vector3(.11,.014,.11)
 ],false,'catmullrom',.45),[]);
 const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=256;canvas.height=384;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#eee1bd';ctx.fillRect(0,0,256,384);ctx.fillStyle='#84724e';ctx.textAlign='center';ctx.font='18px Georgia';ctx.fillText('OUR FORTUNES',128,138);ctx.font='52px Georgia';ctx.fillText(String(count),128,220);ctx.font='15px Georgia';ctx.fillText('little words, kept.',128,270);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t},[count]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <group name="fortune-paperclip" position={[3.0,1.225,1.83]} rotation={[0,.22,0]} onClick={e=>{e.stopPropagation();click()}}>
  {[0,1,2].map(i=><RoundedBox key={i} args={[.47,.013,.66]} position={[i*.013,i*.014,0]} radius={.006} smoothness={2} rotation={[0,i*.035,0]} castShadow><meshStandardMaterial color={i%2?'#d4c6a8':'#eee1bd'} roughness={1}/></RoundedBox>)}
  <mesh rotation={[-Math.PI/2,0,0]} position={[.026,.039,0]}><planeGeometry args={[.45,.64]}/><meshStandardMaterial map={texture} roughness={1}/></mesh>
  <mesh position={[-.03,.055,-.24]} castShadow><tubeGeometry args={[curve,48,.011,8,false]}/><meshStandardMaterial color="#c6b28d" roughness={.28} metalness={.75}/></mesh>
 </group>
}
