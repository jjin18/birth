import { Paperclip } from 'lucide-react';
import { fortunes,type SavedFortune } from '@/lib/fortunes';

export default function FortuneSlip({note,clipped=false}:{note:SavedFortune;clipped?:boolean}){
 return <article className={`fortune-note${clipped?' fortune-note-clipped':''}`}>
  <div className="fortune-slip">
   <span className="fortune-edge fortune-edge-left" aria-hidden="true"/>
   <p>{fortunes[note.id]}</p>
   <span className="fortune-signature">Panda Express</span>
   <span className="fortune-edge fortune-edge-right" aria-hidden="true"/>
   {clipped&&<Paperclip className="slip-clip" size={28} aria-hidden="true"/>}
  </div>
  {clipped&&<div className="fortune-meta"><time dateTime={note.openedAt}>{new Date(note.openedAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</time></div>}
 </article>;
}
