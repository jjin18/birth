'use client';
import { useEffect,useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBox } from '@react-three/drei';
export default function Paperclip({count,click,position,scale=1}:{count:number;click:()=>void;position:[number,number,number];scale?:number}){
 const curve=useMemo(()=>new THREE.CatmullRomCurve3([
  new THREE.Vector3(-.05,.014,.13),new THREE.Vector3(-.05,.014,-.1),new THREE.Vector3(0,.014,-.15),new THREE.Vector3(.055,.014,-.1),new THREE.Vector3(.055,.014,.14),new THREE.Vector3(-.015,.014,.21),new THREE.Vector3(-.095,.014,.14),new THREE.Vector3(-.095,.014,-.16),new THREE.Vector3(-.025,.014,-.225),new THREE.Vector3(.11,.014,-.16),new THREE.Vector3(.11,.014,.11)
 ],false,'catmullrom',.45),[]);
 const texture=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=512;canvas.height=224;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#e8e7df';ctx.fillRect(0,0,512,224);ctx.fillStyle='#547fab';ctx.fillRect(0,52,35,12);ctx.fillRect(494,167,18,12);ctx.fillStyle='#ad5b50';ctx.textAlign='center';ctx.font='bold 25px Arial';ctx.fillText('OUR LITTLE GOOD FORTUNES',256,91);ctx.font='bold 19px Arial';ctx.fillText('PANDA EXPRESS',256,128);ctx.font='16px Arial';ctx.fillText(String(count)+' NOTES KEPT',256,162);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t},[count]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <group name="fortune-paperclip" position={position} scale={scale} rotation={[0,.22,0]} onClick={e=>{e.stopPropagation();click()}}>
  {[0,1,2].map(i=><RoundedBox key={i} args={[.69,.009,.31]} position={[i*.013,i*.014,0]} radius={.006} smoothness={2} rotation={[0,i*.035,0]} castShadow><meshStandardMaterial color={i%2?'#d8d7cd':'#e8e7df'} roughness={1}/></RoundedBox>)}
  <mesh rotation={[-Math.PI/2,0,0]} position={[.026,.039,0]}><planeGeometry args={[.67,.29]}/><meshStandardMaterial map={texture} roughness={1}/></mesh>
  <mesh position={[-.19,.055,-.02]} rotation={[0,Math.PI/2,0]} castShadow><tubeGeometry args={[curve,48,.011,8,false]}/><meshStandardMaterial color="#c6b28d" roughness={.28} metalness={.75}/></mesh>
 </group>
}
