'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export default function Modal({title,eyebrow,close,children,wide=false}:{title:string;eyebrow:string;close:()=>void;children:React.ReactNode;wide?:boolean}){const dialog=useRef<HTMLDialogElement>(null);useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close()},[]);return <dialog ref={dialog} className={`panel ${wide?'panel-wide':''}`} onCancel={e=>{e.preventDefault();close()}} onClick={e=>{if(e.target===dialog.current)close()}}><div className="panel-inner"><header className="panel-head"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div><button aria-label="Close panel" className="icon-button" onClick={close}><X size={18}/></button></header>{children}</div></dialog>}
