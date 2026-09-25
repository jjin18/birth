// Loopback-only visual test harness; never included in the production build.
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
const result=await build({stdin:{contents:`
import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import Arcade from './components/Arcade';
import './app/globals.css';import './app/panels.css';import './app/arcade.css';
import {createMatch,ARENA} from './lib/fighter-game';
import {loadSprites,paintMatch} from './lib/fighter-sprites';
function Pose({pose}){const ref=useRef(null);useEffect(()=>{loadSprites().then(sprites=>{const match=createMatch(pose==='tpose'?'lobby':'fight');for(const f of match.fighters){if(pose==='punch')f.attack=.2;if(pose==='hurt')f.hurt=.2;if(pose==='jump')f.y=120;if(pose==='fall')f.fallen=true;}paintMatch(ref.current.getContext('2d'),match,sprites,0,true);});},[]);return <article style={{width:480}}><h2>{pose}</h2><canvas ref={ref} width={ARENA.width} height={ARENA.height} style={{width:'100%'}}/></article>}
function Preview(){const [open,setOpen]=useState(true);return location.pathname==='/poses'?<main style={{display:'grid',gridTemplateColumns:'repeat(2,480px)',gap:16,padding:20}}>{['tpose','ready','punch','jump','hurt','fall'].map(pose=><Pose key={pose} pose={pose}/>)}</main>:<><button onClick={()=>setOpen(true)}>Open arcade</button>{open&&<Arcade close={()=>setOpen(false)}/>}</>}
createRoot(document.getElementById('root')).render(<Preview/>);
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outdir:'.local-data/arcade-preview',format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).contents,css=result.outputFiles.find(f=>f.path.endsWith('.css')).contents;
const root=resolve('public');
createServer(async(req,res)=>{
 const path=new URL(req.url,'http://127.0.0.1').pathname;
 if(path==='/bundle.js'){res.setHeader('Content-Type','text/javascript');res.end(js);return;}
 if(path==='/bundle.css'){res.setHeader('Content-Type','text/css');res.end(css);return;}
 if(path==='/'||path==='/poses'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arcade local QA</title><link rel="stylesheet" href="/bundle.css"><div id="root"></div><script src="/bundle.js"></script>');return;}
 const file=resolve(root,'.'+decodeURIComponent(path));
 if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
 try{res.setHeader('Content-Type',file.endsWith('.webp')?'image/webp':'image/svg+xml');res.end(await readFile(file));}catch{res.writeHead(404).end();}
}).listen(3105,'127.0.0.1',()=>console.log('Arcade QA http://127.0.0.1:3105 and /poses'));
