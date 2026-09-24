'use client';
import { Clock3,Sun,Sunset,Moon } from 'lucide-react';
import { skyLabels,type SkyMode,type SkyChoice } from '@/lib/daylight';
const choices=[{value:'auto',label:'Auto',Icon:Clock3},{value:'day',label:'Day',Icon:Sun},{value:'sunset',label:'Sunset',Icon:Sunset},{value:'dark',label:'Dark',Icon:Moon}] as const;
export default function SkyControls({choice,mode,city,onChange,unavailable}:{choice:SkyChoice;mode:SkyMode;city:string;unavailable:boolean;onChange:(choice:SkyChoice)=>void}){
 return <section className="sky-controls" aria-label="City lighting">
  <p className="sky-caption" aria-live="polite">{unavailable?'Skyline unavailable — try another view.':<>{skyLabels[mode]} <span>· {choice==='auto'?`${city} local time`:'preview'}</span></>}</p>
  <div className="sky-options" role="group" aria-label="Sky mode">{choices.map(({value,label,Icon})=><button key={value} aria-pressed={choice===value} onClick={()=>onChange(value)} title={value==='auto'?'Follow local daylight and the seasons':`Preview the ${label.toLowerCase()} view`}><Icon size={15}/>{label}</button>)}</div>
 </section>;
}
