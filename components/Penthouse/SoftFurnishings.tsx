'use client';
import { useEffect,useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Surface } from './Materials';
type V=[number,number,number];
function Frame({p,s,c,r=.025}:{p:V;s:V;c:string;r?:number}){return <RoundedBox position={p} args={s} radius={r} smoothness={5} castShadow receiveShadow><Surface color={c} kind="wood"/></RoundedBox>}
export function Cushion({p,s,c,rotation}:{p:V;s:V;c:string;rotation?:V}){
 const geometry=useMemo(()=>{const g=new THREE.SphereGeometry(1,40,24);const vertices=g.attributes.position;const power=(n:number)=>Math.sign(n)*Math.pow(Math.abs(n),.43);for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i);const wrinkle=1+.014*Math.sin(x*29+z*7)*Math.sin(z*23-y*3);vertices.setXYZ(i,power(x)*s[0]/2,power(y)*s[1]/2*wrinkle,power(z)*s[2]/2)}g.computeVertexNormals();return g},[s[0],s[1],s[2]]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh geometry={geometry} position={p} rotation={rotation} castShadow receiveShadow><Surface color={c} kind="fabric"/></mesh>;
}
function Duvet(){
 const geometry=useMemo(()=>{const g=new THREE.PlaneGeometry(2.48,2.24,72,64);const a=g.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),z=-a.getY(i);const sideDrop=Math.pow(Math.max(0,Math.abs(x)-1.01)/.23,1.4)*.26;const footDrop=Math.pow(Math.max(0,z-.96)/.16,1.6)*.21;const folds=.019*Math.sin(x*17+z*5)+.013*Math.sin(z*24-x*7)+.009*Math.sin(x*32+z*29);a.setXYZ(i,x,.035+folds-sideDrop-footDrop,z)}g.computeVertexNormals();return g},[]);useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} position={[0,.78,.47]} castShadow receiveShadow><Surface color="#b9b8aa" kind="fabric"/></mesh>;
}
export function DetailedBed({click}:{click:()=>void}){return <group position={[-2.5,0,-.35]} onClick={e=>{e.stopPropagation();click()}}>
 <Frame p={[0,.25,0]} s={[2.46,.27,3.17]} c="#66513d" r={.045}/>{[-1.02,1.02].flatMap(x=>[-1.26,1.26].map(z=><Frame key={x+':'+z} p={[x,.13,z]} s={[.10,.23,.10]} c="#453d34"/>))}
 <Cushion p={[0,.48,-.02]} s={[2.32,.27,2.99]} c="#e5dfcf"/>
 <Frame p={[0,1.00,-1.51]} s={[2.62,1.49,.15]} c="#776047" r={.045}/>
 <Cushion p={[-.65,1.03,-1.405]} s={[1.23,1.31,.14]} c="#969887"/><Cushion p={[.65,1.03,-1.405]} s={[1.23,1.31,.14]} c="#969887"/>
 <Cushion p={[0,.69,.44]} s={[2.27,.25,2.09]} c="#b8b7aa"/><Duvet/>
 {[-.59,.59].map(x=><group key={x}><Cushion p={[x,.715,-1.02]} s={[1.01,.25,.68]} c="#d1cbbc" rotation={[-.10,0,.02]}/><Cushion p={[x,.825,-.89]} s={[.97,.25,.63]} c="#eeebdf" rotation={[-.15,x*.05,x*.04]}/></group>)}
 <Cushion p={[0,.85,1.08]} s={[2.34,.09,.67]} c="#707969"/>
 {Array.from({length:21},(_,i)=><mesh key={i} position={[-1.12+i*.112,.784,1.427]} rotation={[.15,0,0]}><cylinderGeometry args={[.006,.008,.065+(i%3)*.009,5]}/><meshStandardMaterial color="#899180" roughness={1}/></mesh>)}
</group>}
export function DetailedSofa(){return <group position={[-2.6,0,2.44]}>
 {[-1.02,1.02].flatMap(x=>[-.31,.31].map(z=><Frame key={x+':'+z} p={[x,.19,z]} s={[.09,.28,.09]} c="#564839" r={.008}/>))}
 <Cushion p={[0,.43,0]} s={[2.5,.36,.93]} c="#a4987d"/>
 <Cushion p={[0,.89,.37]} s={[2.48,.89,.24]} c="#9d9177"/>
 {[-.55,.55].map(x=><Cushion key={x} p={[x,.63,-.065]} s={[1.04,.2,.72]} c="#b0a488"/>)}
 {[-1.14,1.14].map(x=><Cushion key={x} p={[x,.72,0]} s={[.26,.65,1.02]} c="#a69b81"/>)}
 <Cushion p={[-.73,.95,.18]} s={[.49,.49,.2]} c="#6f7b6d" rotation={[.12,0,.18]}/><Cushion p={[.64,.94,.19]} s={[.47,.45,.22]} c="#c4b99e" rotation={[.18,0,-.18]}/>
</group>}
