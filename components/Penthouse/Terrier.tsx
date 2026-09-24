'use client';
import { useEffect,useMemo,useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type V=[number,number,number];
const ivory='#efede4';
function rng(seed:number){let state=seed>>>0;return()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296)}
function sculpt(x:number,y:number,z:number){return 1+.013*Math.sin(x*23+y*11)*Math.sin(z*19-x*9)+.009*Math.sin(y*31+z*17)}
function Fur({p,s,seed=1,count=400,length=.034,flow=[0,-1,-.2],rotation,color=ivory}:{p:V;s:V;seed?:number;count?:number;length?:number;flow?:V;rotation?:V;color?:string}){
 const {core,coat}=useMemo(()=>{
  const core=new THREE.SphereGeometry(1,36,26),a=core.attributes.position;
  for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),r=sculpt(x,y,z);a.setXYZ(i,x*s[0]*r,y*s[1]*r,z*s[2]*r)}
  core.computeVertexNormals();
  const random=rng(seed),positions:number[]=[],colors:number[]=[];
  const furFlow=new THREE.Vector3(...flow).normalize();
  const tint=new THREE.Color(color),rootColor=tint.clone().multiplyScalar(.89),tipColor=tint.clone().lerp(new THREE.Color('#fffefa'),.35);
  function vertex(point:THREE.Vector3,t:number,shade:number){positions.push(point.x,point.y,point.z);const c=rootColor.clone().lerp(tipColor,t).multiplyScalar(shade);colors.push(c.r,c.g,c.b)}
  function triangle(a:THREE.Vector3,b:THREE.Vector3,c:THREE.Vector3,ta:number,tb:number,tc:number,shade:number){vertex(a,ta,shade);vertex(b,tb,shade);vertex(c,tc,shade)}
  for(let i=0;i<count;i++){
   const y=1-2*(i+.5)/count,angle=i*Math.PI*(3-Math.sqrt(5))+random()*.22,radius=Math.sqrt(1-y*y),x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
   const unit=new THREE.Vector3(x,y,z),surface=new THREE.Vector3(x*s[0],y*s[1],z*s[2]).multiplyScalar(sculpt(x,y,z));
   const normal=new THREE.Vector3(x/s[0],y/s[1],z/s[2]).normalize();
   let tangent=furFlow.clone().addScaledVector(normal,-furFlow.dot(normal));
   if(tangent.lengthSq()<.01)tangent=new THREE.Vector3(1,0,0).addScaledVector(normal,-normal.x);
   tangent.normalize();
   const width=normal.clone().cross(tangent).normalize(),l=length*(.65+random()*.7),w=l*(.11+random()*.055),shade=.96+random()*.055;
   const root=surface.clone().addScaledVector(normal,-.0015);
   const mid=surface.clone().addScaledVector(normal,l*.27).addScaledVector(tangent,l*.4);
   const tip=surface.clone().addScaledVector(normal,l*.22).addScaledVector(tangent,l);
   const l0=root.clone().addScaledVector(width,-w),r0=root.clone().addScaledVector(width,w);
   const l1=mid.clone().addScaledVector(width,-w*.8),r1=mid.clone().addScaledVector(width,w*.8);
   triangle(l0,r0,l1,0,0,.55,shade);triangle(r0,r1,l1,0,.55,.55,shade);triangle(l1,r1,tip,.55,.55,1,shade);
   // A raised central ridge gives each soft lock volume, without cone-like spikes.
   const ridge=mid.clone().addScaledVector(normal,w*.75);
   triangle(l1,tip,ridge,.55,1,.65,shade);triangle(ridge,tip,r1,.65,1,.55,shade);
  }
  const coat=new THREE.BufferGeometry();coat.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));coat.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));coat.computeVertexNormals();
  return {core,coat};
 },[s[0],s[1],s[2],seed,count,length,flow[0],flow[1],flow[2],color]);
 useEffect(()=>()=>{core.dispose();coat.dispose()},[core,coat]);
 return <group position={p} rotation={rotation}><mesh geometry={core} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.95}/></mesh><mesh geometry={coat} castShadow><meshStandardMaterial vertexColors roughness={1} side={THREE.DoubleSide}/></mesh></group>;
}
function Smooth({p,s,color,roughness=.7}:{p:V;s:V;color:string;roughness?:number}){return <mesh position={p} scale={s} castShadow><sphereGeometry args={[1,28,20]}/><meshStandardMaterial color={color} roughness={roughness}/></mesh>}
function Ear({side}:{side:1|-1}){
 const {outer,inner}=useMemo(()=>{
  const shape=new THREE.Shape();shape.moveTo(-.084,0);shape.bezierCurveTo(-.083,.1,-.036,.205,-.002,.256);shape.bezierCurveTo(.028,.239,.071,.125,.086,.015);shape.quadraticCurveTo(.008,-.021,-.084,0);
  const outer=new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.012,bevelThickness:.012,curveSegments:18});
  const pink=new THREE.Shape();pink.moveTo(-.046,.034);pink.quadraticCurveTo(-.03,.137,0,.208);pink.quadraticCurveTo(.037,.115,.047,.043);pink.quadraticCurveTo(0,.019,-.046,.034);
  return {outer,inner:new THREE.ShapeGeometry(pink,18)};
 },[]);
 useEffect(()=>()=>{outer.dispose();inner.dispose()},[outer,inner]);
 return <group position={[side*.163,.133,-.018]} rotation={[.04,side*.12,-side*.16]}>
  <mesh geometry={outer} castShadow receiveShadow><meshStandardMaterial color="#ebe8dd" roughness={1}/></mesh>
  <mesh geometry={inner} position={[0,0,.059]}><meshStandardMaterial color="#ba9a90" roughness={1}/></mesh>
  <Fur p={[-side*.058,.079,.012]} s={[.035,.086,.043]} count={110} seed={side+31} length={.025} flow={[side*.25,.9,.1]}/>
  <Fur p={[0,.02,.035]} s={[.071,.041,.041]} count={85} seed={side+40} length={.032} flow={[0,.8,.3]}/>
 </group>;
}
function Paw({p,seed}:{p:V;seed:number}){return <group position={p}>
 <Fur p={[0,0,0]} s={[.08,.055,.105]} count={150} seed={seed} length={.019} flow={[0,-.3,1]}/>
 {[-.041,0,.041].map(x=><Smooth key={x} p={[x,-.01,.081]} s={[.014,.012,.025]} color="#b1a89a"/>)}
</group>}

export default function Terrier({reaction}:{reaction:number}){
 const torso=useRef<THREE.Group>(null),head=useRef<THREE.Group>(null),tail=useRef<THREE.Group>(null),eyes=useRef<THREE.Group>(null),jaw=useRef<THREE.Group>(null),ears=useRef<THREE.Group>(null);
 const excitedUntil=useRef(0),reduced=useRef(false);
 useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>{reduced.current=query.matches};update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[]);
 useEffect(()=>{if(reaction)excitedUntil.current=performance.now()+1500},[reaction]);
 useFrame(({clock},delta)=>{
  const t=clock.elapsedTime,excited=performance.now()<excitedUntil.current,calm=reduced.current;
  if(torso.current)torso.current.scale.y=1+(calm?0:Math.sin(t*1.7)*.012);
  if(head.current){head.current.position.y=THREE.MathUtils.lerp(head.current.position.y,excited?.635:.59,1-Math.exp(-delta*9));head.current.rotation.y=calm?0:Math.sin(t*.6)*.075;head.current.rotation.z=calm?0:excited?-.055:Math.sin(t*.42)*.022}
  if(tail.current){tail.current.rotation.z=calm?0:Math.sin(t*(excited?19:3.4))*(excited?.47:.10);tail.current.rotation.x=-.24}
  if(ears.current)ears.current.rotation.x=calm?0:Math.pow(Math.max(0,Math.sin(t*.53)),18)*-.045;
  if(eyes.current)eyes.current.scale.y=!calm&&!excited&&t%5.7<.13?.12:1;
  if(jaw.current)jaw.current.rotation.x=excited?(calm?.12:.14+Math.max(0,Math.sin(t*19))*.28):.025;
 });
 return <group name="custom-white-terrier" scale={.9}>
  <group ref={torso}>
   <Fur p={[0,.405,-.08]} s={[.235,.255,.39]} seed={3} count={1750} length={.038} flow={[0,-1,-.25]}/>
   <Fur p={[0,.405,.18]} s={[.211,.245,.204]} seed={7} count={650} length={.049} flow={[0,-1,.15]}/>
   {[-1,1].flatMap(side=>[false,true].map(front=><group key={side+':'+front} position={[side*(front?.149:.17),0,front?.19:-.31]}>
    <Fur p={[0,.218,0]} s={[front?.074:.091,.18,front?.087:.116]} count={260} seed={(side+2)*10+(front?1:2)} length={.025} flow={[0,-1,.1]}/>
    <Paw p={[0,.105,.038]} seed={(side+2)*20+(front?1:2)}/>
   </group>))}
   <group ref={tail} position={[0,.51,-.437]} rotation={[-.24,0,0]}>
    <Fur p={[0,.105,0]} s={[.05,.16,.048]} count={240} seed={51} length={.022} flow={[0,1,0]}/>
   </group>
   <Fur p={[0,.555,.24]} s={[.177,.187,.17]} count={380} seed={61} length={.037} flow={[0,-1,.2]}/>
   <group ref={head} position={[0,.59,.335]}>
    <Fur p={[0,.023,-.015]} s={[.227,.223,.206]} count={1050} seed={71} length={.029} flow={[0,-1,.28]}/>
    <group ref={ears}><Ear side={-1}/><Ear side={1}/></group>
    <Fur p={[-.148,-.046,.12]} s={[.091,.11,.093]} count={200} seed={81} length={.039} flow={[-.3,-1,.2]}/>
    <Fur p={[.148,-.046,.12]} s={[.091,.11,.093]} count={200} seed={82} length={.039} flow={[.3,-1,.2]}/>
    <group ref={eyes} position={[0,.061,.176]}>
     {[-1,1].map(side=><group key={side} position={[side*.115,0,0]}>
      <Smooth p={[0,0,0]} s={[.043,.035,.025]} color="#5c584f"/>
      <Smooth p={[0,.001,.012]} s={[.029,.027,.022]} color="#201d17" roughness={.14}/>
      <Smooth p={[-.008,.009,.032]} s={[.006,.007,.003]} color="#fff8e8" roughness={.1}/>
     </group>)}
    </group>
    {[-1,1].map(side=><Fur key={side} p={[side*.116,.104,.156]} s={[.086,.035,.061]} count={135} seed={side+95} length={.027} flow={[side*.2,-.15,1]} rotation={[0,0,side*.13]}/>)}
    <Fur p={[0,-.049,.197]} s={[.146,.09,.131]} count={460} seed={101} length={.019} flow={[0,-.6,1]}/>
    <Smooth p={[0,-.058,.32]} s={[.066,.046,.04]} color="#292822" roughness={.37}/>
    <Smooth p={[-.032,-.063,.349]} s={[.011,.009,.004]} color="#10100e" roughness={.35}/>
    <Smooth p={[.032,-.063,.349]} s={[.011,.009,.004]} color="#10100e" roughness={.35}/>
    <Smooth p={[-.011,-.04,.35]} s={[.015,.007,.004]} color="#77766c" roughness={.4}/>
    <Smooth p={[0,-.115,.236]} s={[.107,.018,.074]} color="#494137"/>
    <group ref={jaw} position={[0,-.102,.155]}>
     <Smooth p={[0,-.015,.089]} s={[.086,.012,.055]} color="#b38b85"/>
     <Fur p={[0,-.054,.078]} s={[.119,.055,.094]} count={300} seed={111} length={.038} flow={[0,-1,.8]}/>
    </group>
   </group>
  </group>
 </group>;
}
