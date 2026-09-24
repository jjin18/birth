'use client';
import { useEffect,useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Surface,type SurfaceKind } from './Materials';
type V=[number,number,number];
function Part({p,s,c,kind='paint',r=.018,rotation}:{p:V;s:V;c:string;kind?:SurfaceKind;r?:number;rotation?:V}){return <RoundedBox position={p} args={s} radius={r} smoothness={4} rotation={rotation} castShadow receiveShadow><Surface color={c} kind={kind}/></RoundedBox>}
function Bar({from,to,r=.025,c='#34383a'}:{from:V;to:V;r?:number;c?:string}){const start=new THREE.Vector3(...from),end=new THREE.Vector3(...to),direction=end.clone().sub(start),q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());return <mesh position={start.add(end).multiplyScalar(.5)} quaternion={q} castShadow><cylinderGeometry args={[r,r,direction.length(),16]}/><Surface color={c} kind="metal"/></mesh>}
function Screen({laptop=false}:{laptop?:boolean}){
 const map=useMemo(()=>{const canvas=document.createElement('canvas');canvas.width=768;canvas.height=432;const ctx=canvas.getContext('2d')!;
  const bg=ctx.createLinearGradient(0,0,768,432);bg.addColorStop(0,'#102434');bg.addColorStop(1,'#284847');ctx.fillStyle=bg;ctx.fillRect(0,0,768,432);
  ctx.fillStyle='#0c1724';ctx.fillRect(40,43,688,345);ctx.fillStyle='#263849';ctx.fillRect(40,43,688,35);['#cb7968','#d5bd7b','#83a98c'].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(58+i*17,60,5,0,Math.PI*2);ctx.fill()});
  ctx.fillStyle='#182939';ctx.fillRect(40,78,125,310);ctx.font='15px monospace';ctx.fillStyle='#b5c5cd';ctx.fillText(laptop?'OUR NEXT CHAPTER':'PENTHOUSE 22',197,123);
  for(let line=0;line<12;line++){ctx.fillStyle=['#81b4b9','#c6ad85','#78919d'][line%3];ctx.fillRect(197+(line%3)*20,150+line*15,80+(line*73)%300,4)}
  ctx.fillStyle='#cad9d2';ctx.fillRect(339,410,90,3);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
 },[laptop]);useEffect(()=>()=>map.dispose(),[map]);
 return <mesh><planeGeometry args={laptop?[.65,.405]:[1.17,.66]}/><meshPhysicalMaterial map={map} emissiveMap={map} emissive="#ffffff" emissiveIntensity={.28} roughness={.18} metalness={.06} clearcoat={.65}/></mesh>;
}
function Chair(){
 const shell=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-.32,-.46);shape.bezierCurveTo(-.48,-.13,-.39,.33,-.25,.59);shape.quadraticCurveTo(0,.69,.25,.59);shape.bezierCurveTo(.39,.33,.48,-.13,.32,-.46);shape.quadraticCurveTo(0,-.55,-.32,-.46);const geometry=new THREE.ExtrudeGeometry(shape,{depth:.11,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.04,bevelThickness:.035,curveSegments:20});return geometry},[]);
 useEffect(()=>()=>shell.dispose(),[shell]);
 return <group name="ergonomic-chair" position={[.08,0,1.12]} rotation={[0,-.25,0]}>
  {[0,1,2,3,4].map(i=>{const a=i*Math.PI*2/5;const x=Math.sin(a)*.48,z=Math.cos(a)*.48;return <group key={i}><Bar from={[0,.19,0]} to={[x,.115,z]} r={.035}/><group position={[x,.075,z]} rotation={[0,a,Math.PI/2]}><mesh castShadow><cylinderGeometry args={[.07,.07,.10,20]}/><Surface color="#25272a"/></mesh><mesh><cylinderGeometry args={[.032,.032,.105,20]}/><Surface color="#6b6f70" kind="metal"/></mesh></group></group>})}
  <Bar from={[0,.18,0]} to={[0,.51,0]} r={.044} c="#858b8d"/>
  <Part p={[0,.55,0]} s={[.76,.15,.72]} c="#514a3d" kind="leather" r={.07}/>
  <Part p={[0,.62,-.03]} s={[.67,.09,.6]} c="#6b5f4c" kind="fabric" r={.045}/>
  <group position={[0,1.09,.27]} rotation={[.13,0,0]}><mesh geometry={shell} castShadow receiveShadow><Surface color="#393c37" kind="leather"/></mesh><Part p={[0,.01,-.052]} s={[.51,.79,.065]} c="#716957" kind="fabric" r={.03}/><Part p={[0,.48,-.063]} s={[.38,.19,.11]} c="#5d5749" kind="leather" r={.05}/><Part p={[0,-.27,-.08]} s={[.46,.15,.075]} c="#615e50" kind="leather" r={.035}/>{[-.22,.22].map(x=><Part key={x} p={[x,.07,-.1]} s={[.015,.6,.016]} c="#aaa28c" r={.006}/>)}</group>
  {[-.44,.44].map(x=><group key={x}><Bar from={[x,.52,.16]} to={[x,.86,.08]} r={.022}/><Part p={[x,.88,.02]} s={[.12,.067,.48]} c="#3d403a" kind="leather" r={.03}/></group>)}
  <Bar from={[.26,.45,.05]} to={[.43,.42,.05]} r={.014}/>
 </group>;
}
export default function Workstation(){return <group name="detailed-workstation" position={[3.15,0,-1.88]}>
 <Part p={[0,1.04,0]} s={[2.6,.115,1.32]} c="#b38a60" kind="wood" r={.025}/>
 <Part p={[-.94,.5,.015]} s={[.62,.94,1.09]} c="#ddd9cd" r={.026}/>
 {[.22,.48,.74].map(y=><group key={y}><Part p={[-.94,y,.581]} s={[.565,.229,.035]} c="#e8e4d9" r={.008}/><Part p={[-.94,y+.057,.606]} s={[.21,.013,.022]} c="#777a74" kind="metal" r={.005}/></group>)}
 {[-.47,.47].map(z=><Part key={z} p={[1.11,.52,z]} s={[.05,.98,.055]} c="#3d403a" kind="metal" r={.008}/>)}
 <Part p={[1.11,.12,0]} s={[.05,.045,1.06]} c="#373b38" kind="metal" r={.008}/>
 <Part p={[.02,1.107,.16]} s={[1.26,.012,.59]} c="#39453f" kind="leather" r={.005}/>
 <group name="desktop-monitor" position={[-.36,1.11,-.30]}>
  <Part p={[0,.015,.05]} s={[.42,.023,.31]} c="#444949" kind="metal" r={.012}/><Bar from={[0,.03,-.045]} to={[0,.38,-.08]} r={.028}/>
  <group position={[0,.66,-.04]} rotation={[-.04,0,0]}><Part p={[0,0,0]} s={[1.26,.75,.043]} c="#292e2f" kind="metal" r={.018}/><group position={[0,.015,.024]}><Screen/></group><mesh position={[.53,-.345,.027]}><sphereGeometry args={[.008,12,8]}/><meshBasicMaterial color="#b9dacf"/></mesh></group>
 </group>
 <group name="laptop" position={[.83,1.12,.10]} rotation={[0,-.19,0]}>
  <Part p={[0,0,0]} s={[.72,.032,.5]} c="#b6b9b8" kind="metal" r={.014}/>
  <Part p={[0,.021,-.047]} s={[.64,.007,.24]} c="#2f3637" r={.003}/>
  {Array.from({length:4},(_,row)=>Array.from({length:11},(_,col)=><Part key={row+'-'+col} p={[-.276+col*.055,.027,-.135+row*.051]} s={[.043,.006,.036]} c="#687173" r={.002}/>))}
  <Part p={[0,.019,.154]} s={[.23,.003,.117]} c="#999fa0" kind="metal" r={.006}/>
  <group position={[0,.236,-.244]} rotation={[-.16,0,0]}><Part p={[0,0,0]} s={[.72,.46,.022]} c="#a8aeaf" kind="metal" r={.009}/><group position={[0,0,.015]}><Screen laptop/></group><mesh position={[0,.215,.015]}><sphereGeometry args={[.005,8,8]}/><meshBasicMaterial color="#111718"/></mesh></group>
 </group>
 <group position={[-.31,1.14,.30]} rotation={[.03,0,0]}><Part p={[0,0,0]} s={[.75,.037,.27]} c="#242d2d" kind="metal" r={.016}/>{Array.from({length:4},(_,row)=>Array.from({length:13},(_,col)=><Part key={row+'-'+col} p={[-.336+col*.056,.025,-.092+row*.055]} s={[.043,.018,.041]} c={col===0?'#988c75':'#b5b8b2'} r={.005}/>))}</group>
 <mesh position={[.24,1.15,.34]} scale={[.061,.036,.102]} castShadow><sphereGeometry args={[1,24,16]}/><Surface color="#d3d4ca"/></mesh>
 <group position={[-1.02,1.12,.24]}><mesh position={[0,.105,0]} castShadow><cylinderGeometry args={[.078,.065,.2,40,1,true]}/><meshPhysicalMaterial color="#e3dfd4" roughness={.25} side={THREE.DoubleSide}/></mesh><mesh position={[0,.19,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.070,32]}/><meshPhysicalMaterial color="#382416" roughness={.2}/></mesh><mesh position={[.085,.105,0]} rotation={[0,Math.PI/2,0]}><torusGeometry args={[.05,.012,12,24]}/><meshPhysicalMaterial color="#e3dfd4" roughness={.25}/></mesh></group>
 <Bar from={[-.36,1.21,-.45]} to={[-.36,.93,-.52]} r={.008} c="#242929"/>
 <Chair/>
</group>}
