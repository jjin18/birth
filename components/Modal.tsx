'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import RoomNavigation from './RoomNavigation';

export default function Modal({title,eyebrow,close,children,wide=false,className='',ariaLabel,open=true,headerActions}:{title:React.ReactNode;eyebrow:string;close:()=>void;children:React.ReactNode;wide?:boolean;className?:string;ariaLabel?:string;open?:boolean;headerActions?:React.ReactNode}) {
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=dialog.current;if(open){el?.showModal();el?.focus({preventScroll:true})}else el?.close();return()=>el?.close()},[open]);
 return <dialog ref={dialog} tabIndex={-1} autoFocus aria-label={ariaLabel} className={`panel ${wide?'panel-wide':''} ${className}`} onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===dialog.current)close()}}>
  <RoomNavigation/>
  <div className="panel-inner"><header className="panel-head"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}{title&&<h2>{title}</h2>}</div>{headerActions}<button aria-label="Close panel" className="icon-button" onClick={close}><X size={18}/></button></header>{children}</div>
 </dialog>;
}
