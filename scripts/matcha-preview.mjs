// Local-only preview of the room and games. No production API or database
// writes. Typing uses an isolated local database; other game data is untouched.
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {mkdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {resolve,sep} from 'node:path';
import {total} from './fortune-test-data.mjs';
// The real shared typing API, backed by its own LOCAL preview database.
// It never contacts the live site or opens fortune/date-wall storage.
const typingBundle=await build({entryPoints:['server/typing.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {createTyping}=await import('data:text/javascript;base64,'+Buffer.from(typingBundle.outputFiles[0].contents).toString('base64'));
mkdirSync('.local-data',{recursive:true});
const typingDb=new DatabaseSync(resolve('.local-data/typing-preview.sqlite'));
const typingApi=createTyping(typingDb);
const result=await build({stdin:{contents:`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import Experience from './components/Experience';import MatchaGame from './components/MatchaGame';import TypingGame from './components/TypingGame';
import './app/globals.css';import './app/panels.css';import './app/fortunes.css';import './app/interior.css';
function Preview(){const [open,setOpen]=useState(true);return location.pathname==='/typing'?<main style={{minHeight:'100svh',background:'#182127',padding:24}}><button className="secondary-button" onClick={()=>setOpen(true)}>Open typing game</button><a style={{marginLeft:20,color:'#dbb984'}} href="/">Back to the room</a>{open&&<TypingGame close={()=>setOpen(false)}/>}</main>:location.pathname==='/matcha'?<main style={{minHeight:'100svh',background:'#182620',padding:24}}><button className="secondary-button" onClick={()=>setOpen(true)}>Open Your daily matcha</button><a style={{marginLeft:20,color:'#dbb984'}} href="/">See the teacup in the room</a>{open&&<MatchaGame close={()=>setOpen(false)}/>}</main>:<Experience/>}
createRoot(document.getElementById('root')).render(<Preview/>);
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outdir:'.local-data/matcha-preview',loader:{'.woff2':'dataurl'},external:['/textures/*'],format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NEXT_PUBLIC_SUPABASE_URL':'undefined','process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY':'undefined','process.env.NODE_ENV':'"production"'},plugins:[{name:'local-dynamic',setup(build){
 build.onResolve({filter:/^next\/dynamic$/},()=>({path:'dynamic',namespace:'fixture'}));
 build.onLoad({filter:/.*/,namespace:'fixture'},()=>({loader:'tsx',resolveDir:process.cwd(),contents:`import React,{lazy,Suspense} from 'react';export default function dynamic(load){const Component=lazy(load);return props=><Suspense fallback={null}><Component {...props}/></Suspense>}`}));
}}]});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).contents,css=result.outputFiles.find(f=>f.path.endsWith('.css')).contents,root=resolve('public');
createServer(async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const path=new URL(req.url,'http://127.0.0.1').pathname;
 if(path==='/api/typing'||path.startsWith('/api/typing/'))return typingApi(req,res,new URL(req.url,'http://127.0.0.1:3110'));
 // Local-only phone-sized frame for checking popup overflow, without changing
 // the user's browser viewport or any deployed application markup.
 if(path==='/typing-compact-check'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html><head><title>Typing layout check</title></head><body style="margin:0;background:#0d171d"><iframe title="Phone-sized typing preview" src="/typing" style="display:block;width:400px;height:400px;border:0"></iframe></body></html>');return}
 if(path==='/bundle.js'||path==='/bundle.css'){res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':'text/css');res.end(path.endsWith('.js')?js:css);return}
 if(path==='/api/fortunes'&&req.method==='GET'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({fortunes:[],total}));return}
 if(path.startsWith('/api/')){res.writeHead(503,{'Content-Type':'application/json'}).end(JSON.stringify({error:'This local matcha preview does not change shared game data.'}));return}
 if(path==='/'||path==='/matcha'||path==='/typing'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+ (path==='/typing'?'Typing speedrun':path==='/matcha'?'Your daily matcha':'Birthday room') +' · local preview</title><link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="/bundle.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');return}
 const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+sep)){res.writeHead(403).end();return}
 const mime={webp:'image/webp',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml',glb:'model/gltf-binary',wasm:'application/wasm',js:'text/javascript',mp3:'audio/mpeg',ico:'image/x-icon'};
 try{res.setHeader('Content-Type',mime[file.split('.').pop()]||'application/octet-stream');res.end(await readFile(file))}catch{res.writeHead(404).end()}
}).listen(3110,'127.0.0.1',()=>console.log('Local room: http://127.0.0.1:3110/\nYour daily matcha: http://127.0.0.1:3110/matcha'));
