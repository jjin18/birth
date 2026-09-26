'use client';
import {useEffect,useRef} from 'react';
import Modal from './Modal';
import {mountGoodDog} from '@/lib/good-dog/ui';
import {assetUrl} from '@/lib/asset-url';
import '@/app/good-dog.css';
export default function DogGame({close}:{close:()=>void}){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(host.current)return mountGoodDog(host.current,{spriteUrl:assetUrl('/dog/poses.webp'),ballSpriteUrl:assetUrl('/dog/ball-poses.webp'),ryanUrl:assetUrl('/dog/ryan.webp'),ryanCrouchUrl:assetUrl('/dog/ryan-crouching.webp'),ryanTreatUrl:assetUrl('/dog/ryan-treat.webp'),tennisUrl:assetUrl('/dog/tennis-ball.webp'),playUrl:assetUrl('/dog/play-ball.webp')})},[]);
 return <Modal title="" eyebrow="Dog RL environment" ariaLabel="Dog RL environment" close={close} className="good-dog-panel"><div ref={host}/></Modal>;
}
