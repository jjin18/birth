'use client';
import { useEffect,useState } from 'react';
import { Cookie,Paperclip,Check,RotateCcw } from 'lucide-react';
import Modal from './Modal';
import { fortunes,type SavedFortune } from '@/lib/fortunes';
import { getFortunes,openFortune } from '@/lib/fortune-api';
export default function FortunePanel({mode,requestId,close,onCollection,onOpenClip,onAnother}:{mode:'fortune'|'paperclip';requestId:string;close:()=>void;onCollection:(count:number)=>void;onOpenClip:()=>void;onAnother:()=>void}){
 const [note,setNote]=useState<SavedFortune|null>(null),[saved,setSaved]=useState<SavedFortune[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState(''),[exhausted,setExhausted]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setBusy(true);setError('');setNote(null);setExhausted(false);
  async function load(){try{
   if(mode==='fortune'){const data=await openFortune(requestId);if(!active)return;setNote(data.fortune||null);setExhausted(!!data.exhausted)}
   const data=await getFortunes();if(active){setSaved(data.fortunes);onCollection(data.fortunes.length)}
  }catch(e){if(active)setError((e as Error).message)}finally{if(active)setBusy(false)}}
  void load();
  const interval=mode==='paperclip'?setInterval(()=>{if(document.visibilityState==='visible')getFortunes().then(data=>{if(active){setSaved(data.fortunes);onCollection(data.fortunes.length)}}).catch(()=>{})},15000):null;
  return()=>{active=false;if(interval)clearInterval(interval)};
 },[mode,requestId,retry]);
 return <Modal title={mode==='paperclip'?'A few good words.':'A little good fortune.'} eyebrow={mode==='paperclip'?'THE PAPER CLIP':'PANDA EXPRESS · AFTER DINNER'} close={close} wide={mode==='paperclip'}>
  {busy?<div className="fortune-loading"><Cookie size={38}/><p>{mode==='fortune'?'Cracking your cookie…':'Gathering your notes…'}</p></div>:error?<div className="empty"><p role="alert">{error}</p><button className="gold-button" onClick={()=>setRetry(x=>x+1)}><RotateCcw size={15}/>Try again</button></div>:mode==='fortune'?<>
   {note?<article className="fortune-slip"><span className="fortune-number">FORTUNE {String(note.id+1).padStart(3,'0')} / 200</span><p>{fortunes[note.id]}</p><span className="fortune-signature">a little place for us.</span></article>:exhausted?<div className="empty"><Cookie size={38}/><p>All 200 cookies, opened.<br/>Every good word is waiting on your paper clip.</p></div>:null}
   <p className="fortune-saved" role="status"><Check size={15}/>{note?'Saved to your shared paper clip.':'Your collection is complete.'}</p>
   <div className="fortune-actions"><button className="secondary-button" onClick={onOpenClip}><Paperclip size={16}/>Your notes · {saved.length}</button>{saved.length<fortunes.length&&<button className="gold-button" onClick={onAnother}>One more cookie</button>}</div>
  </>:<><p className="panel-description">{saved.length} of 200 fortunes opened. Kept here, across your devices.</p>{saved.length?<div className="fortune-collection">{saved.map(n=><article className="fortune-slip" key={n.id}><Paperclip className="slip-clip" size={24}/><span className="fortune-number">NO. {String(n.id+1).padStart(3,'0')}</span><p>{fortunes[n.id]}</p><time dateTime={n.openedAt}>{new Date(n.openedAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</time></article>)}</div>:<div className="empty"><Paperclip size={36}/><p>Nothing clipped yet.<br/>There’s a cookie waiting in the Panda Express box.</p><button className="gold-button" onClick={onAnother}><Cookie size={16}/>Open your first cookie</button></div>}</>}
 </Modal>
}
