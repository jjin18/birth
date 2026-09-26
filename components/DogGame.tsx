'use client';
import {useEffect,useRef} from 'react';
import Modal from './Modal';
import {mountGoodDog} from '@/lib/good-dog/ui';
import {dogGameAssets,dogBarkUrl} from '@/lib/good-dog/assets';
import '@/app/good-dog.css';
export default function DogGame({close}:{close:()=>void}){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(host.current)return mountGoodDog(host.current,dogGameAssets,dogBarkUrl)},[]);
 return <Modal title="" eyebrow="Dog RL environment" ariaLabel="Dog RL environment" close={close} className="good-dog-panel"><div ref={host}/></Modal>;
}
