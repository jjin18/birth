'use client';
import {useEffect,useRef} from 'react';
import Modal from './Modal';
import {mountGoodDog} from '@/lib/good-dog/ui';
import {assetUrl} from '@/lib/asset-url';
import '@/app/good-dog.css';
export default function DogGame({close}:{close:()=>void}){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(host.current)return mountGoodDog(host.current,{spriteUrl:assetUrl('/dog/poses.webp'),offlineUrl:assetUrl('/good-dog.html')})},[]);
 return <Modal title="" eyebrow="Good Dog" ariaLabel="Good Dog" close={close} className="good-dog-panel"><div ref={host}/></Modal>;
}
