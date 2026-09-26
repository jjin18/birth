'use client';
import {useEffect,useRef,useState,type PointerEvent,type KeyboardEvent} from 'react';
import {Droplets,PenLine,Undo2,Redo2,RotateCcw} from 'lucide-react';
import Modal from './Modal';
import {CUP,MATCHA_SAVE_KEY,MAX_POINTS,canAddStroke,cupPoint,inTea,pointCount,parseArt,serializeArt,type Point,type Stroke,type Tool,type Pattern} from '@/lib/matcha-art';
import {makeArtCanvas,paintTea,paintCup,replayArt,drawStrokePoint} from '@/lib/matcha-render';
import '@/app/matcha.css';

export default function MatchaGame({close}:{close:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),art=useRef<HTMLCanvasElement|null>(null);
 const strokes=useRef<Stroke[]>([]),undone=useRef<Stroke[]>([]),active=useRef<Stroke|null>(null),pointer=useRef<number|null>(null),lift=useRef(false),frame=useRef(0),blocked=useRef(false);
 const keyboardPoint=useRef<Point>({x:.5,y:.5}),keyboardDrawing=useRef(false);
 const [tool,setTool]=useState<Tool>('milk'),[size,setSize]=useState(28),[guide,setGuide]=useState<Pattern|null>(null);
 const guideRef=useRef<Pattern|null>(null);
 const [count,setCount]=useState(0),[redoCount,setRedoCount]=useState(0),[ready,setReady]=useState(false);
 const [error,setError]=useState(''),[saveError,setSaveError]=useState(''),[keyCursor,setKeyCursor]=useState<Point|null>(null);
 function paint(){const ctx=canvas.current?.getContext('2d');if(ctx&&art.current)paintCup(ctx,art.current,guideRef.current)}
 function schedule(){if(!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;paint()})}
 function persist(){
  if(blocked.current)return;
  try{localStorage.setItem(MATCHA_SAVE_KEY,serializeArt(strokes.current));setSaveError('')}catch{setSaveError('This drawing cannot be saved after you leave this page.')}
 }
 function sync(){setCount(strokes.current.length);setRedoCount(undone.current.length);persist()}
 function finish(){
  const stroke=active.current;active.current=null;pointer.current=null;keyboardDrawing.current=false;
  if(stroke?.points.length){strokes.current.push(stroke);undone.current=[];sync()}
  schedule();
 }
 useEffect(()=>{
  const offscreen=makeArtCanvas(),ctx=offscreen.getContext('2d',{willReadFrequently:true});
  if(!ctx||!canvas.current?.getContext('2d')){setError('Your browser could not open the drawing canvas. Try a different browser.');return}
  art.current=offscreen;
  try{const raw=localStorage.getItem(MATCHA_SAVE_KEY);if(raw){strokes.current=parseArt(raw);setCount(strokes.current.length)}}catch{blocked.current=true;setSaveError('Your previous drawing could not be loaded. It has been kept unchanged.')}
  replayArt(ctx,strokes.current);paint();setReady(true);
  return()=>{
   cancelAnimationFrame(frame.current);frame.current=0;
   if(active.current?.points.length&&!blocked.current){try{localStorage.setItem(MATCHA_SAVE_KEY,serializeArt([...strokes.current,active.current]))}catch{}}
   active.current=null;art.current=null;
  };
 },[]);
 useEffect(()=>{guideRef.current=guide;paint()},[guide]);
 function begin(point:Point){
  if(!ready||!inTea(point))return false;
  if(!canAddStroke(strokes.current)){setError('This cup has reached its drawing limit. Undo a stroke or start a fresh cup.');return false}
  active.current={tool,size:tool==='etch'?Math.max(10,size*.55):size,points:[point]};lift.current=false;
  drawStrokePoint(art.current!.getContext('2d')!,active.current,0);schedule();return true;
 }
 function extend(point:Point){
  const stroke=active.current;if(!stroke)return;
  if(!inTea(point)){lift.current=true;return}
  if(pointCount(strokes.current)+stroke.points.length>=MAX_POINTS){finish();setError('This cup has reached its drawing limit. Undo a stroke or start a fresh cup.');return}
  const last=stroke.points[stroke.points.length-1];if(Math.hypot(last.x-point.x,last.y-point.y)<.001&&!lift.current)return;
  stroke.points.push({...point,...(lift.current?{lift:true}:{})});lift.current=false;
  drawStrokePoint(art.current!.getContext('2d')!,stroke,stroke.points.length-1);schedule();
 }
 function down(event:PointerEvent<HTMLCanvasElement>){
  if(event.button!==0||pointer.current!==null)return;
  if(active.current)finish();
  const point=cupPoint(event.clientX,event.clientY,event.currentTarget.getBoundingClientRect());
  if(begin(point)){pointer.current=event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault();setKeyCursor(null)}
 }
 function move(event:PointerEvent<HTMLCanvasElement>){
  if(pointer.current!==event.pointerId)return;
  const events=event.nativeEvent.getCoalescedEvents?.();
  for(const point of events?.length?events:[event.nativeEvent])extend(cupPoint(point.clientX,point.clientY,event.currentTarget.getBoundingClientRect()));
 }
 function release(event:PointerEvent<HTMLCanvasElement>){if(pointer.current!==event.pointerId)return;finish();if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}
 function selectTool(next:Tool){finish();setTool(next)}
 function history(redo=false){
  finish();const from=redo?undone.current:strokes.current,to=redo?strokes.current:undone.current,stroke=from.pop();
  if(stroke){to.push(stroke);replayArt(art.current!.getContext('2d')!,strokes.current);paint();sync();setError('')}
 }
 function clear(){
  finish();
  strokes.current=[];undone.current=[];blocked.current=false;paintTea(art.current!.getContext('2d')!);paint();sync();setError('');
 }
 function keys(event:KeyboardEvent<HTMLCanvasElement>){
  if(event.key==='Escape')return;
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();history(event.shiftKey);return}
  if(event.key===' '||event.key==='Enter'){event.preventDefault();if(keyboardDrawing.current)finish();else{keyboardDrawing.current=begin(keyboardPoint.current)}setKeyCursor({...keyboardPoint.current});return}
  const direction:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},delta=direction[event.key];
  if(!delta)return;event.preventDefault();const step=event.shiftKey?.006:.02,point={x:keyboardPoint.current.x+delta[0]*step,y:keyboardPoint.current.y+delta[1]*step};
  if(inTea(point)){keyboardPoint.current=point;setKeyCursor(point);if(keyboardDrawing.current)extend(point)}
 }
 return <Modal title="" eyebrow="Your daily matcha" ariaLabel="Your daily matcha" close={close} wide className="matcha-panel">
  <div className="matcha-workspace">
   <div className="matcha-left">
    <div className="matcha-stage">
     <div className="matcha-canvas-wrap">
      <canvas ref={canvas} width={CUP.width} height={CUP.height} tabIndex={0} role="application" aria-label="Draw latte art inside the matcha cup" aria-describedby="matcha-canvas-help" onPointerDown={down} onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={()=>{if(pointer.current!==null)finish()}} onKeyDown={keys} onBlur={()=>{if(keyboardDrawing.current)finish();setKeyCursor(null)}}>Draw milk foam with your mouse, touch, or arrow keys. Optional heart and leaf guides help you trace a design by hand.</canvas>
      {keyCursor&&<span className="matcha-key-cursor" style={{left:`${(CUP.x+(keyCursor.x-.5)*CUP.radius*2)/CUP.width*100}%`,top:`${(CUP.y+(keyCursor.y-.5)*CUP.radius*2)/CUP.height*100}%`}}/>}
     </div>
     <span className="matcha-stage-bottom"><span>ceremonial matcha</span><span>made by you</span></span>
    </div>
    <div className="matcha-history"><div><button type="button" onClick={()=>history()} disabled={!ready||!count} aria-label="Undo last stroke"><Undo2 size={16}/>Undo</button><button type="button" onClick={()=>history(true)} disabled={!ready||!redoCount} aria-label="Redo last stroke"><Redo2 size={16}/>Redo</button></div><button type="button" onClick={clear} disabled={!ready}><RotateCcw size={14}/>Fresh cup</button></div>
   </div>
   <aside className="matcha-tools" aria-label="Latte art tools">
    <section><div className="matcha-tool-buttons"><button type="button" aria-pressed={tool==='milk'} disabled={!ready} onClick={()=>selectTool('milk')} title="Draw milk foam"><Droplets size={15}/><span>Pour milk</span></button><button type="button" aria-pressed={tool==='etch'} disabled={!ready} onClick={()=>selectTool('etch')} title="Pull and shape the foam"><PenLine size={15}/><span>Etch</span></button></div>
     <label className="matcha-size" htmlFor="matcha-size"><span>{tool==='milk'?'Pour size':'Needle size'}</span><span>{size<20?'Fine':size<38?'Medium':'Wide'}</span></label><input id="matcha-size" aria-label={tool==='milk'?'Pour size':'Needle size'} type="range" min={10} max={54} value={size} onChange={event=>setSize(Number(event.target.value))}/>
    </section>
    <section aria-label="Tracing guides"><div className="matcha-guide"><span>Trace a guide</span><div>{([null,'heart','leaf'] as const).map(item=><button key={item??'none'} type="button" aria-pressed={guide===item} onClick={()=>setGuide(item)}>{item==='heart'?'Heart':item==='leaf'?'Leaf':'Off'}</button>)}</div></div></section>
    {error&&<p className="matcha-feedback" role="alert">{error}</p>}
    {saveError&&<p className="matcha-feedback" role="alert">{saveError}</p>}
   </aside>
  </div>
  <p id="matcha-canvas-help" className="matcha-sr-only">Drag inside the green tea to draw. Etch pulls the milk that is already there. Keyboard: use arrows to move and Space or Enter to start or stop drawing. Hold Shift for finer movement. Ctrl/Cmd + Z undoes a stroke.</p>
 </Modal>;
}
