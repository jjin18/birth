'use client';
import { useEffect,useMemo,useState } from 'react';
import * as THREE from 'three';
type V=[number,number,number];
function cartonGeometry(inset=0){
 const bottom=.17-inset,top=.23-inset,depthBottom=.145-inset,depthTop=.205-inset;
 const p:number[]=[];const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
 for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4];const v=[[a[0]*bottom,0,a[1]*depthBottom],[b[0]*bottom,0,b[1]*depthBottom],[a[0]*top,.38,a[1]*depthTop],[b[0]*top,.38,b[1]*depthTop]];p.push(...v[0],...v[2],...v[1],...v[1],...v[2],...v[3])}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.computeVertexNormals();return geometry;
}
function ChickenPiece({p,seed,map}:{p:V;seed:number;map:THREE.Texture|null}){
 const geometry=useMemo(()=>{const g=new THREE.SphereGeometry(1,24,16),a=g.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i);const r=1+.13*Math.sin(x*14+seed)*Math.sin(z*11+y*8)+.075*Math.sin(y*22+z*17+seed);a.setXYZ(i,x*r*(.065+seed%3*.008),y*r*.061,z*r*(.06+seed%4*.006))}g.computeVertexNormals();return g},[seed]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);return <mesh geometry={geometry} position={p} rotation={[seed*.37,seed*.63,seed*.19]} castShadow receiveShadow><meshPhysicalMaterial key={map?.uuid??'gold'} map={map} color={map?'#fff0d6':'#d9902d'} roughness={.3} clearcoat={.65} clearcoatRoughness={.28}/></mesh>;
}
export default function PandaTakeout({click}:{click:()=>void}){
 const [textures,setTextures]=useState<{logo:THREE.Texture|null;food:THREE.Texture|null}>({logo:null,food:null});
 const geometry=useMemo(()=>({outer:cartonGeometry(),inner:cartonGeometry(.003)}),[]);
 const flap=useMemo(()=>{const shape=new THREE.Shape();shape.moveTo(-.23,0);shape.lineTo(.23,0);shape.lineTo(.205,.135);shape.lineTo(.155,.175);shape.lineTo(-.19,.168);shape.closePath();return new THREE.ShapeGeometry(shape)},[]);
 useEffect(()=>{let active=true;const loaded:THREE.Texture[]=[];new THREE.TextureLoader().load('/textures/panda-box-reference.png',image=>{if(!active){image.dispose();return}image.colorSpace=THREE.SRGBColorSpace;image.anisotropy=4;const logo=image.clone(),food=image.clone();logo.repeat.set(108/679,108/450);logo.offset.set(308/679,(450-355)/450);food.repeat.set(102/679,96/450);food.offset.set(280/679,(450-177)/450);logo.needsUpdate=food.needsUpdate=true;loaded.push(image,logo,food);setTextures({logo,food})});return()=>{active=false;loaded.forEach(t=>t.dispose())}},[]);
 useEffect(()=>()=>{geometry.outer.dispose();geometry.inner.dispose();flap.dispose()},[geometry,flap]);
 return <group name="panda-express" position={[-.45,1.22,0]} rotation={[0,-.24,0]} onClick={e=>{e.stopPropagation();click()}}>
  <mesh geometry={geometry.outer} castShadow receiveShadow><meshPhysicalMaterial color="#c51c27" roughness={.47} clearcoat={.18} side={THREE.DoubleSide}/></mesh>
  <mesh geometry={geometry.inner} receiveShadow><meshStandardMaterial color="#f3f0e8" roughness={.92} side={THREE.DoubleSide}/></mesh>
  <mesh position={[0,.003,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.334,.284]}/><meshStandardMaterial color="#eee9de" roughness={1}/></mesh>
  {[[0,.38,.205,0],[0,.38,-.205,Math.PI],[-.23,.38,0,-Math.PI/2],[.23,.38,0,Math.PI/2]].map(([x,y,z,angle],i)=><group key={i} position={[x,y,z]} rotation={[0,angle,0]}><mesh geometry={flap} rotation={[.95,0,0]} scale={[i>1?.88:1,1,1]} castShadow receiveShadow><meshStandardMaterial color="#f5f3eb" roughness={.9} side={THREE.DoubleSide}/></mesh></group>)}
  {[-1,0,1].flatMap((x,i)=>[-1,0,1].map((z,j)=><ChickenPiece key={i*3+j} p={[x*.133,.369+((i+j)%2)*.021,z*.114]} seed={i*3+j+1} map={textures.food}/>))}
  {[[-.08,.467,-.045],[.065,.462,-.047],[-.048,.47,.08],[.09,.458,.073],[0,.526,.007]].map((p,i)=><ChickenPiece key={i+10} p={p as V} seed={i+13} map={textures.food}/>)}
  <mesh position={[0,.186,.178]} rotation={[.157,0,0]}><circleGeometry args={[.09,64]}/><meshStandardMaterial color="#f5f0e6" roughness={.78}/></mesh>
  <mesh position={[0,.186,.180]} rotation={[.157,0,0]}><circleGeometry args={[.086,64]}/><meshStandardMaterial key={textures.logo?.uuid??'logo'} map={textures.logo} color="#ffffff" roughness={.7}/></mesh>
 </group>;
}
