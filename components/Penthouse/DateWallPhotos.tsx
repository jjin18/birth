'use client';
import {useEffect,useMemo} from 'react';
import {useTexture} from '@react-three/drei';
import * as THREE from 'three';

function configureAtlas(atlas:THREE.Texture){atlas.colorSpace=THREE.SRGBColorSpace;atlas.generateMipmaps=false;atlas.minFilter=THREE.LinearFilter;atlas.needsUpdate=true}
export default function DateWallPhotos(){
 const atlas=useTexture('/memories/wall-atlas.webp',configureAtlas);
 const geometry=useMemo(()=>{
  return Array.from({length:5},(_,i)=>{
   const tile=new THREE.PlaneGeometry(.4,.37),uv=tile.getAttribute('uv');
   for(let n=0;n<uv.count;n++)uv.setXY(n,(i%3+uv.getX(n))/3,(1-Math.floor(i/3)+uv.getY(n))/2);
   return tile;
  });
 },[]);
 useEffect(()=>()=>geometry.forEach(item=>item.dispose()),[geometry]);
 return <>{[[-.72,.26,.09],[-.04,.28,-.1],[.67,.21,.05],[-.55,-.4,-.09],[.31,-.38,.07]].map(([x,y,r],i)=><group key={i} position={[x,y,.02]} rotation={[0,0,r]}><mesh position={[0,.055,.041]} geometry={geometry[i]}><meshBasicMaterial map={atlas} toneMapped={false}/></mesh></group>)}</>;
}
