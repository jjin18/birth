'use client';
import {useEffect,useState} from 'react';
import {ArrowLeft,ChevronLeft,ChevronRight} from 'lucide-react';
import Modal from './Modal';
import {dateGroups,datePhotos,dateLabel} from '@/lib/date-wall';

export default function WallPanel({close}:{close:()=>void}){
 const [selected,setSelected]=useState<number|null>(null);
 const photo=selected===null?null:datePhotos[selected];
 useEffect(()=>{
  if(selected===null)return;
  const navigate=(event:KeyboardEvent)=>{
   if(event.key==='ArrowLeft'){event.preventDefault();setSelected(value=>Math.max(0,(value??0)-1))}
   if(event.key==='ArrowRight'){event.preventDefault();setSelected(value=>Math.min(datePhotos.length-1,(value??0)+1))}
  };
  document.addEventListener('keydown',navigate);return()=>document.removeEventListener('keydown',navigate);
 },[selected]);
 return <Modal title="Our date wall." eyebrow="" close={close} wide className="date-wall">
  {photo?<article className="date-detail">
   <div className="date-detail-controls"><button className="text-button" onClick={()=>setSelected(null)}><ArrowLeft size={16}/>All dates</button><div><button className="icon-button" aria-label="Previous photo" disabled={selected===0} onClick={()=>setSelected(value=>Math.max(0,(value??0)-1))}><ChevronLeft size={18}/></button><button className="icon-button" aria-label="Next photo" disabled={selected===datePhotos.length-1} onClick={()=>setSelected(value=>Math.min(datePhotos.length-1,(value??0)+1))}><ChevronRight size={18}/></button></div></div>
   <div className="date-detail-image"><img key={photo.id} src={photo.src} width={photo.width} height={photo.height} alt={photo.alt} decoding="async"/></div>
   <div className="date-detail-caption" aria-live="polite"><h3>{photo.title}</h3><time dateTime={photo.date??undefined}>{dateLabel(photo.date)}</time></div>
  </article>:<div className="date-wall-content">{dateGroups.map(group=><section className="date-group" key={group.date??'undated'} aria-label={dateLabel(group.date)}>
   <h3><time dateTime={group.date??undefined}>{dateLabel(group.date)}</time></h3>
   {!group.date&&<p className="undated-note">No capture date was included in these files.</p>}
   <div className="date-photo-grid">{group.photos.map(photo=><button className="date-photo" key={photo.id} aria-label={`View ${photo.title}, ${dateLabel(photo.date)}`} onClick={()=>setSelected(datePhotos.findIndex(item=>item.id===photo.id))}>
    <img src={photo.thumbnail} width={photo.width} height={photo.height} alt={photo.alt} loading="lazy" decoding="async"/>
    <span>{photo.title}</span>
   </button>)}</div>
  </section>)}</div>}
 </Modal>;
}
