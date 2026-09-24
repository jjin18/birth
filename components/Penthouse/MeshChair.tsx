'use client';
import { useEffect,useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
type V=[number,number,number];
type Surface=(u:number,v:number)=>THREE.Vector3;
const back:Surface=(u,v)=>new THREE.Vector3(u*(.293+.11*Math.sin(v*Math.PI*.83)),-.44+v*1.045-.064*u*u*(2*v-1),.035+.063*Math.sin(v*Math.PI)+.036*(1-u*u));
const seat:Surface=(u,v)=>new THREE.Vector3(u*(.344+.036*Math.sin(v*Math.PI)),.59+.036*u*u-.018*Math.sin(v*Math.PI),-.345+v*.695);
function makeWeave(surface:Surface,columns:number,rows:number){
 const positions:number[]=[];
 const add=(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3)=>positions.push(...a.toArray(),...b.toArray(),...c.toArray());
 const strip=(u0:number,v0:number,u1:number,v1:number)=>{const a=surface(u0,v0),b=surface(u1,v0),c=surface(u0,v1),d=surface(u1,v1);add(a,b,c);add(b,d,c)};
 for(let col=0;col<=columns;col++){const u=-1+col*2/columns,w=.19/columns;for(let j=0;j<20;j++)strip(Math.max(-1,u-w),j/20,Math.min(1,u+w),(j+1)/20)}
 for(let row=0;row<=rows;row++){const v=row/rows,w=.105/rows;for(let j=0;j<30;j++)strip(-1+j*2/30,Math.max(0,v-w),-1+(j+1)*2/30,Math.min(1,v+w))}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;
}
function outline(surface:Surface){const p:THREE.Vector3[]=[];for(let i=0;i<=20;i++)p.push(surface(-1,i/20));for(let i=1;i<=24;i++)p.push(surface(-1+i/12,1));for(let i=1;i<=20;i++)p.push(surface(1,1-i/20));for(let i=1;i<24;i++)p.push(surface(1-i/12,0));return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p,true),160,.024,10,true)}
function Tube({points,r=.024,color='#212526'}:{points:V[];r?:number;color?:string}){
 const geometry=useMemo(()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,r,10,false),[JSON.stringify(points),r]);useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.53} metalness={.2}/></mesh>;
}
function Pad({p,s,r=.035}:{p:V;s:V;r?:number}){return <RoundedBox position={p} args={s} radius={r} smoothness={5} castShadow receiveShadow><meshStandardMaterial color="#202323" roughness={.65}/></RoundedBox>}
export default function MeshChair(){
 const geometry=useMemo(()=>({back:makeWeave(back,65,47),seat:makeWeave(seat,60,42),backFrame:outline(back),seatFrame:outline(seat)}),[]);
 useEffect(()=>()=>Object.values(geometry).forEach(g=>g.dispose()),[geometry]);
 return <group name="aeron-style-mesh-chair" position={[-.32,0,1.14]} rotation={[0,-.22,0]}>
  {[0,1,2,3,4].map(i=>{const a=i*Math.PI*2/5,x=Math.sin(a)*.46,z=Math.cos(a)*.46;return <group key={i}>
   <Tube points={[[0,.22,0],[x*.5,.19,z*.5],[x,.115,z]]} r={.04}/>
   <group position={[x,.075,z]} rotation={[0,a,Math.PI/2]}>{[-.04,.04].map(y=><mesh key={y} position={[0,y,0]} castShadow><cylinderGeometry args={[.073,.073,.031,24]}/><meshStandardMaterial color="#222628" roughness={.7}/></mesh>)}<mesh><cylinderGeometry args={[.025,.025,.12,16]}/><meshStandardMaterial color="#484e50" metalness={.7} roughness={.35}/></mesh></group>
  </group>})}
  <mesh position={[0,.345,0]} castShadow><cylinderGeometry args={[.044,.053,.29,24]}/><meshStandardMaterial color="#343a3c" metalness={.55} roughness={.4}/></mesh>
  <mesh position={[0,.452,.05]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.082,.082,.40,32]}/><meshStandardMaterial color="#202526" roughness={.6}/></mesh>
  <Tube points={[[0,.44,.09],[0,.65,.35],[0,1.14,.395]]} r={.035}/>
  {[-1,1].map(side=><group key={side}>
   <Tube points={[[0,.78,.37],[side*.18,.90,.39],[side*.29,1.20,.35]]} r={.023}/>
   <Tube points={[[side*.31,.62,.20],[side*.45,.71,.19],[side*.47,.89,.035]]} r={.026}/>
   <Pad p={[side*.465,.917,-.013]} s={[.15,.065,.40]} r={.031}/>
   <mesh position={[side*.342,.656,.257]} rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.067,.067,.035,32]}/><meshStandardMaterial color="#303638" roughness={.5}/></mesh>
  </group>)}
  <mesh geometry={geometry.seatFrame} castShadow receiveShadow><meshStandardMaterial color="#292d2d" roughness={.6}/></mesh>
  <mesh geometry={geometry.seat} receiveShadow><meshStandardMaterial color="#444947" roughness={.92} side={THREE.DoubleSide}/></mesh>
  <group position={[0,1.075,.245]} rotation={[.125,0,0]}>
   <mesh geometry={geometry.backFrame} castShadow receiveShadow><meshStandardMaterial color="#262b2c" roughness={.53}/></mesh>
   <mesh geometry={geometry.back} receiveShadow><meshStandardMaterial color="#4d524d" roughness={.92} side={THREE.DoubleSide}/></mesh>
   <Tube points={[[-.30,-.12,.12],[0,-.095,.18],[.30,-.12,.12]]} r={.028}/>
   <Pad p={[0,-.145,.15]} s={[.47,.092,.037]} r={.014}/>
  </group>
  <Tube points={[[.19,.46,-.03],[.36,.435,-.06],[.42,.46,-.08]]} r={.011}/>
  <Pad p={[.418,.47,-.08]} s={[.085,.025,.051]} r={.01}/>
 </group>;
}
