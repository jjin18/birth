'use client';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {ArrowLeft,ChevronLeft,ChevronRight,LockKeyhole,Plus,Pencil,NotebookPen} from 'lucide-react';
import Modal from './Modal';
import {groupDates,datePhotos,dateLabel,type DatePhoto} from '@/lib/date-wall';

type Draft={id:string;title:string;note:string;date:string;version?:number;uploadId?:string;thumbnail?:string|null};
type WallResponse={entries:DatePhoto[];canEdit:boolean;editingEnabled:boolean};
async function request(path:string,options:RequestInit={}){
 const response=await fetch(path,{credentials:'same-origin',cache:'no-store',...options});
 const data=await response.json().catch(()=>({error:'The date wall could not be reached. Please try again.'}));
 if(!response.ok)throw Error(data.error||'Please try again.');return data;
}
const jsonBody=(body:unknown)=>({headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

export default function WallPanel({close}:{close:()=>void}){
 const [entries,setEntries]=useState(datePhotos),[selected,setSelected]=useState<string|null>(null);
 const [canEdit,setCanEdit]=useState(false),[editingEnabled,setEditingEnabled]=useState(false),[loaded,setLoaded]=useState(false);
 const [unlock,setUnlock]=useState(false),[passcode,setPasscode]=useState(''),[draft,setDraft]=useState<Draft|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const uploadController=useRef<AbortController|null>(null);
 const selectedIndex=entries.findIndex(entry=>entry.id===selected),photo=entries[selectedIndex];
 const apply=(data:WallResponse)=>{setEntries(data.entries);setCanEdit(data.canEdit);setEditingEnabled(data.editingEnabled);setLoaded(true)};
 useEffect(()=>{
  const controller=new AbortController();
  request('/api/wall',{signal:controller.signal}).then(apply).catch(e=>{if(!controller.signal.aborted)setError(e.message)});
  return()=>{controller.abort();uploadController.current?.abort()};
 },[]);
 useEffect(()=>{
  if(!photo||draft||unlock)return;
  const navigate=(event:KeyboardEvent)=>{
   if(event.target instanceof HTMLElement&&(event.target.matches('input,textarea,select')||event.target.isContentEditable))return;
   if(event.key==='ArrowLeft'){event.preventDefault();setSelected(entries[Math.max(0,selectedIndex-1)].id)}
   if(event.key==='ArrowRight'){event.preventDefault();setSelected(entries[Math.min(entries.length-1,selectedIndex+1)].id)}
  };
  document.addEventListener('keydown',navigate);return()=>document.removeEventListener('keydown',navigate);
 },[photo,draft,unlock,entries,selectedIndex]);
 const begin=(entry?:DatePhoto)=>{setError('');setMessage('');setDraft(entry?{id:entry.id,title:entry.title,note:entry.note,date:entry.date??'',version:entry.version,thumbnail:entry.thumbnail}:{id:crypto.randomUUID(),title:'',note:'',date:''})};
 const change=(key:'title'|'note'|'date',value:string)=>setDraft(current=>current?{...current,[key]:value}:current);
 const upload=async(file?:File)=>{
  if(!file)return;
  if(file.size>12*1024*1024){setError('Choose a photo under 12 MB.');return}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError('Choose a JPEG, PNG or WebP photo. Export HEIC as JPEG first.');return}
  setBusy(true);setError('');setMessage('Preparing a smaller photo and checking its capture date…');
  const controller=new AbortController();uploadController.current=controller;
  try{
   const data=await request('/api/wall/upload',{method:'POST',headers:{'Content-Type':file.type},body:file,signal:controller.signal});
   setDraft(current=>current?{...current,uploadId:data.uploadId,thumbnail:data.thumbnail,date:data.date??current.date}:current);
   setMessage(data.date?`Photo date: ${dateLabel(data.date)}. You can change it below.`:'No capture date was found. Add the date below, or leave it undated.');
  }catch(e){if(!controller.signal.aborted){setError((e as Error).message);setMessage('')}}finally{if(!controller.signal.aborted)setBusy(false)}
 };
 const save=async(event:FormEvent)=>{
  event.preventDefault();if(!draft||busy)return;setBusy(true);setError('');
  try{
   const data=await request(draft.version?'/api/wall/'+draft.id:'/api/wall',{method:draft.version?'PATCH':'POST',...jsonBody({...draft,date:draft.date||null})});
   apply(data);setSelected(draft.id);setDraft(null);setMessage('Saved to your date wall.');
  }catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 const signIn=async(event:FormEvent)=>{
  event.preventDefault();setBusy(true);setError('');
  try{await request('/api/wall/session',{method:'POST',...jsonBody({passcode})});setCanEdit(true);setUnlock(false);setPasscode('');setMessage('Editing unlocked for this browser.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 const lock=async()=>{
  setBusy(true);setError('');try{await request('/api/wall/session',{method:'DELETE'});setCanEdit(false);setMessage('Editing locked.')}catch(e){setError((e as Error).message)}finally{setBusy(false)}
 };
 return <Modal title="Our date wall." eyebrow="" close={close} wide className="date-wall">
  {error&&<p className="error wall-feedback" role="alert">{error}{!loaded&&<button className="text-button" onClick={()=>{setError('');request('/api/wall').then(apply).catch(e=>setError(e.message))}}>Try again</button>}</p>}
  {unlock?<form className="wall-unlock" onSubmit={signIn}>
   <p>Add a photo, write a memory, or edit a date with your shared passcode.</p>
   <label>Shared passcode<input type="password" autoComplete="current-password" value={passcode} maxLength={128} onChange={e=>setPasscode(e.target.value)} required autoFocus/></label>
   <div className="wall-form-actions"><button type="button" className="secondary-button" disabled={busy} onClick={()=>{setUnlock(false);setPasscode('');setError('')}}>Cancel</button><button className="gold-button" disabled={busy}>{busy?'Unlocking…':'Unlock editing'}</button></div>
  </form>:draft?<form className="wall-editor" onSubmit={save}>
   <div className="wall-editor-fields">
    <h3>{draft.version?'Edit this memory':'A new memory'}</h3>
    {!draft.version&&<label className="wall-photo-input">Photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]);e.target.value=''}}/><span>JPEG, PNG or WebP · up to 12 MB. Capture date is filled automatically when included.</span></label>}
    {draft.thumbnail&&<img className="wall-upload-preview" src={draft.thumbnail} alt="Selected memory"/>}
    {message&&<p className="wall-hint" role="status">{message}</p>}
    <label>Title<input value={draft.title} maxLength={120} onChange={e=>change('title',e.target.value)} required disabled={busy} autoFocus/></label>
    <label>Date<input type="date" value={draft.date} min="1900-01-01" max="2199-12-31" onChange={e=>change('date',e.target.value)} disabled={busy}/></label>
    <label>Write a memory<textarea value={draft.note} maxLength={2000} rows={4} onChange={e=>change('note',e.target.value)} placeholder="A little something to remember…" disabled={busy}/></label>
    <p className="wall-hint">Saved memories are public. Location and device metadata are removed from photos.</p>
   </div>
   <div className="wall-form-actions"><button type="button" className="secondary-button" disabled={busy} onClick={()=>{setDraft(null);setError('');setMessage('')}}>Cancel</button><button className="gold-button" disabled={busy}>{busy?'Preparing…':'Save memory'}</button></div>
  </form>:<>
   <div className="date-wall-toolbar">
    {canEdit?<><button className="gold-button" onClick={()=>begin()}><Plus size={15}/>Add or write</button><button className="text-button" onClick={lock} disabled={busy}><LockKeyhole size={14}/>Lock editing</button></>:editingEnabled&&<button className="text-button" onClick={()=>{setUnlock(true);setError('');setMessage('')}}><Pencil size={14}/>Edit wall</button>}
    {message&&<span className="wall-hint" role="status">{message}</span>}
   </div>
   {photo?<article className="date-detail">
    <div className="date-detail-controls"><button className="text-button" onClick={()=>setSelected(null)}><ArrowLeft size={16}/>All dates</button><div>{canEdit&&<button className="text-button" onClick={()=>begin(photo)}><Pencil size={14}/>Edit</button>}<button className="icon-button" aria-label="Previous photo" disabled={selectedIndex===0} onClick={()=>setSelected(entries[selectedIndex-1].id)}><ChevronLeft size={18}/></button><button className="icon-button" aria-label="Next photo" disabled={selectedIndex===entries.length-1} onClick={()=>setSelected(entries[selectedIndex+1].id)}><ChevronRight size={18}/></button></div></div>
    {photo.src&&<div className="date-detail-image"><img key={photo.id} src={photo.src} width={photo.width} height={photo.height} alt={photo.alt||photo.title} decoding="async"/></div>}
    <div className={`date-detail-caption ${!photo.src?'date-text-only':''}`} aria-live="polite"><h3>{photo.title}</h3><time dateTime={photo.date??undefined}>{dateLabel(photo.date)}</time>{photo.note&&<p>{photo.note}</p>}</div>
   </article>:<div className="date-wall-content">{groupDates(entries).map(group=><section className="date-group" key={group.date??'undated'} aria-label={dateLabel(group.date)}>
    <h3><time dateTime={group.date??undefined}>{dateLabel(group.date)}</time></h3>
    <div className="date-photo-grid">{group.photos.map(photo=><button className="date-photo" key={photo.id} aria-label={`View ${photo.title}, ${dateLabel(photo.date)}`} onClick={()=>{setSelected(photo.id);setMessage('')}}>
     {photo.thumbnail?<img src={photo.thumbnail} width={photo.width} height={photo.height} alt={photo.alt||photo.title} loading="lazy" decoding="async"/>:<div className="date-written-preview"><NotebookPen size={25}/><p>{photo.note||'A memory together.'}</p></div>}
     <span>{photo.title}</span>
    </button>)}</div>
   </section>)}</div>}
  </>}
 </Modal>;
}
