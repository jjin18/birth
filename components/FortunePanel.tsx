'use client';
import { useEffect,useState } from 'react';
import { Cookie,Paperclip,Check,RotateCcw } from 'lucide-react';
import Modal from './Modal';
import FortuneSlip from './FortuneSlip';
import FortuneCrack from './FortuneCrack';
import { type SavedFortune } from '@/lib/fortunes';
import { getFortunes,openFortune } from '@/lib/fortune-api';
import { COOKIE_REVEAL_MS } from '@/lib/cookie-motion';
export default function FortunePanel({mode,requestId,close,onCollection,onOpenClip,onAnother}:{mode:'fortune'|'paperclip';requestId:string;close:()=>void;onCollection:(count:number)=>void;onOpenClip:()=>void;onAnother:()=>void}){
 const [note,setNote]=useState<SavedFortune|null>(null),[saved,setSaved]=useState<SavedFortune[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState(''),[exhausted,setExhausted]=useState(false),[retry,setRetry]=useState(0),[revealed,setRevealed]=useState(false),[collectionUnavailable,setCollectionUnavailable]=useState(false);
 useEffect(()=>{let active=true;setBusy(true);setError('');setNote(null);setExhausted(false);setRevealed(false);setCollectionUnavailable(false);
  async function load(){try{
   if(mode==='fortune'){
    const data=await openFortune(requestId);if(!active)return;setNote(data.fortune||null);setExhausted(!!data.exhausted);setBusy(false);
    // The POST has already saved the note. A later collection refresh must
    // not hide that successful opening behind a network/parser error.
    try{const archive=await getFortunes();if(active){setSaved(archive.fortunes);onCollection(archive.fortunes.length)}}catch{if(active)setCollectionUnavailable(true)}
   }else{const data=await getFortunes();if(active){setSaved(data.fortunes);onCollection(data.fortunes.length)}}
  }catch(e){if(active)setError((e as Error).message)}finally{if(active)setBusy(false)}}
  void load();
  const interval=mode==='paperclip'?setInterval(()=>{if(document.visibilityState==='visible')getFortunes().then(data=>{if(active){setSaved(data.fortunes);onCollection(data.fortunes.length)}}).catch(()=>{})},15000):null;
  return()=>{active=false;if(interval)clearInterval(interval)};
 },[mode,requestId,retry]);
 useEffect(()=>{if(busy||!note)return;const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const timer=setTimeout(()=>setRevealed(true),reduced?0:COOKIE_REVEAL_MS);return()=>clearTimeout(timer)},[busy,note]);
 return <Modal title={mode==='paperclip'?'A few good words.':'A little good fortune.'} eyebrow={mode==='paperclip'?'THE PAPER CLIP':'PANDA EXPRESS · AFTER DINNER'} close={close} wide={mode==='paperclip'} className={mode==='fortune'?'fortune-game':'fortune-archive'}>
  {busy?<div className="fortune-loading"><img className="fortune-cookie" src="/textures/fortune-cookie.png" alt="" width={280} height={210}/><p>{mode==='fortune'?'Cracking your cookie…':'Gathering your notes…'}</p></div>:error?<div className="empty"><p role="alert">{error}</p><button className="gold-button" onClick={()=>setRetry(x=>x+1)}><RotateCcw size={15}/>Try again</button></div>:mode==='fortune'?<>
   {note?<FortuneCrack key={requestId} note={note}/>:exhausted?<div className="empty"><Cookie size={38}/><p>Every cookie, opened.<br/>Every good word is waiting on your paper clip.</p></div>:null}
   <p className="fortune-saved" role="status">{(!note||revealed)&&<Check size={15}/>} {note?(revealed?'Saved to your shared paper clip.':'Opening your fortune…'):'Your collection is complete.'}</p>
   {collectionUnavailable&&<p className="panel-description" role="status">Your saved notes will refresh when you open the paper clip.</p>}
   <div className="fortune-actions"><button className="secondary-button" disabled={!!note&&!revealed} onClick={onOpenClip}><Paperclip size={16}/>Your notes{!collectionUnavailable&&` · ${saved.length}`}</button>{!exhausted&&<button className="gold-button" disabled={!!note&&!revealed} onClick={onAnother}>One more cookie</button>}</div>
  </>:<><p className="panel-description">{saved.length} notes kept, across your devices.</p>{saved.length?<div className="fortune-collection">{saved.map(n=><FortuneSlip key={n.id} note={n} clipped/>)}</div>:<div className="empty"><Paperclip size={36}/><p>Nothing clipped yet.<br/>There’s a cookie waiting in the Panda Express box.</p><button className="gold-button" onClick={onAnother}><Cookie size={16}/>Open your first cookie</button></div>}</>}
 </Modal>
}
