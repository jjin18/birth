import { total,genericFortuneIds,jokeFortuneIds } from './fortune-test-data.mjs';
// Loopback-only interaction harness. Uses the real experience, camera and panels
// with lightweight scenery and an in-memory API; never touches shared notes.
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {resolve,sep} from 'node:path';
const result=await build({stdin:{contents:`
import React from 'react';import {createRoot} from 'react-dom/client';
import Experience from './components/Experience';
import './app/globals.css';import './app/panels.css';import './app/fortunes.css';import './app/interior.css';
createRoot(document.getElementById('root')).render(<Experience/>);
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,external:['/textures/*'],write:false,outdir:'.local-data/room-controls-preview',format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NEXT_PUBLIC_SUPABASE_URL':'undefined','process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY':'undefined','process.env.NODE_ENV':'"production"'},plugins:[{name:'lightweight-room-fixtures',setup(build){
 build.onResolve({filter:/^next\/dynamic$/},()=>({path:'dynamic',namespace:'fixture'}));
 build.onResolve({filter:/^\.\/Penthouse\/Scene$/},()=>({path:'scene',namespace:'fixture'}));
 build.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'tsx',resolveDir:process.cwd(),contents:args.path==='dynamic'?`
import React,{lazy,Suspense} from 'react';export default function dynamic(load){const Component=lazy(load);return props=><Suspense fallback={null}><Component {...props}/></Suspense>}
`:`
import React,{useState,useCallback} from 'react';import {Canvas} from '@react-three/fiber';
import CameraRig from './components/Penthouse/CameraRig';
export default function Fixture(props){const [away,setAway]=useState(false);const change=useCallback(value=>{setAway(value);props.onViewChange(value)},[props.onViewChange]);return <>
<Canvas dpr={1} camera={{position:[4.4,2.35,5.4],fov:59}}><CameraRig focus={props.focus} reset={props.reset} interior={props.interior} onViewChange={change}/><ambientLight intensity={2}/><mesh><boxGeometry/><meshStandardMaterial color="#bbb"/></mesh></Canvas>
<section style={{position:'absolute',left:12,bottom:100,zIndex:4,padding:12,background:'#20303c'}} aria-label="Test object controls"><p>Camera {away?'away from':'at'} original view</p>{['bed','wall','gloves','fortune','paperclip','window','laptop'].map(f=><button key={f} onClick={()=>props.onInteract(f)}>Focus {f}</button>)}</section></>}
`}));
}}]});
const js=result.outputFiles.find(file=>file.path.endsWith('.js')).contents,css=result.outputFiles.find(file=>file.path.endsWith('.css')).contents;
const root=resolve('public'),notes=[],requests=new Map();
let wall;
if(process.env.WALL_QA==='1'){
 await build({entryPoints:['server/wall.ts'],outfile:'.local-data/wall-qa.mjs',bundle:true,platform:'node',format:'esm',external:['sharp']});
 const data=await mkdtemp(resolve(tmpdir(),'birthday-wall-browser-'));
 const {createWall}=await import(pathToFileURL(resolve('.local-data/wall-qa.mjs')).href);
 process.env.WALL_EDIT_PASSCODE='local-browser-qa-only';
 wall=createWall(new DatabaseSync(resolve(data,'test.sqlite')),data);
 console.log('Disposable date-wall browser database: '+data);
}
createServer(async(req,res)=>{
 const path=new URL(req.url,'http://127.0.0.1').pathname;
 if(wall&&(path==='/api/wall'||path.startsWith('/api/wall/')))return wall(req,res,new URL(req.url,'http://'+req.headers.host));
 if(path==='/responsive'){
  res.setHeader('Content-Type','text/html');
  res.end('<!doctype html><title>Responsive activity QA</title><body style="margin:0;background:#141b20;color:white;font:16px Arial">'+[['laptop',1280,720],['phone',390,667],['landscape',844,390]].map(([name,width,height])=>`<h2>${name} ${width} × ${height}</h2><iframe id="${name}" title="${name} activity test" src="/" width="${width}" height="${height}" style="display:block;border:0"></iframe>`).join(''));
  return;
 }
 if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Room controls QA</title><link rel="stylesheet" href="/bundle.css"><div id="root"></div><script src="/bundle.js"></script>');return}
 if(path==='/bundle.js'||path==='/bundle.css'){res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':'text/css');res.end(path.endsWith('.js')?js:css);return}
 if(path==='/api/fortunes'){
  res.setHeader('Content-Type','application/json');
  if(req.method==='POST'){
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const body=JSON.parse(Buffer.concat(chunks).toString());
   let fortune=requests.get(body.requestId);
   if(!fortune){const pool=body.kind==='joke'?jokeFortuneIds:genericFortuneIds;const id=pool.find(id=>!notes.some(note=>note.id===id));if(id!==undefined){fortune={id,openedAt:new Date().toISOString()};notes.push(fortune);requests.set(body.requestId,fortune)}}
   res.end(JSON.stringify(fortune?{fortune,total}:{exhausted:true,total}));
  }else res.end(JSON.stringify({fortunes:notes,total}));return;
 }
 const file=resolve(root,'.'+decodeURIComponent(path));if(!file.startsWith(root+sep)){res.writeHead(403).end();return}
 try{res.setHeader('Content-Type',file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':'image/svg+xml');res.end(await readFile(file))}catch{res.writeHead(404).end()}
}).listen(3106,'127.0.0.1',()=>console.log('Room controls QA: http://127.0.0.1:3106/ (fixture notes only)'));
