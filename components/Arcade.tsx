'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Modal from './Modal';
import MiniFighter from './MiniFighter';
import {SCORE_KEY,parseScores,addWin,matchWinner,type Scores} from '@/lib/fighter-score';
import type {FighterName} from '@/lib/fighter-game';
import '@/app/arcade.css';

export default function Arcade({close}:{close:()=>void}) {
 const [scores,setScores]=useState<Scores>({Jia:0,Ryan:0}),current=useRef(scores);
 const [winner,setWinner]=useState<FighterName|null>(null);
 useEffect(()=>{
  const read=()=>{try{current.current=parseScores(localStorage.getItem(SCORE_KEY));setScores(current.current)}catch{}};
  read();const sync=(event:StorageEvent)=>{if(event.key===SCORE_KEY)read()};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);
 },[]);
 const finish=useCallback((result:string)=>{
  const won=matchWinner(result);setWinner(won);if(!won)return;
  try{current.current=parseScores(localStorage.getItem(SCORE_KEY))}catch{}
  current.current=addWin(current.current,won);setScores(current.current);
  try{localStorage.setItem(SCORE_KEY,JSON.stringify(current.current))}catch{/* Play still works when browser storage is unavailable. */}
 },[]);
 const begin=useCallback(()=>setWinner(null),[]);
 return <Modal title={<span className="fighter-tally" title="All-time wins saved on this device" aria-label={`All-time wins on this device: Jia ${scores.Jia}, Ryan ${scores.Ryan}`}><span>{winner==='Jia'&&<span aria-label="Winner">👑 </span>}Jia <b>{scores.Jia}</b></span><span className="fighter-tally-divider">—</span><span>{winner==='Ryan'&&<span aria-label="Winner">👑 </span>}Ryan <b>{scores.Ryan}</b></span></span>} eyebrow="Fight Mode" ariaLabel="Local multiplayer boxing" close={close} wide className="arcade-panel">
  <MiniFighter onFinish={finish} onStart={begin}/>
 </Modal>;
}
