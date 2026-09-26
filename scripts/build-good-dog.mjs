import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export async function buildGoodDogOffline(){
 const assets={};for(const [key,file] of Object.entries({spriteUrl:'poses',ballSpriteUrl:'ball-poses',ryanUrl:'ryan',ryanCrouchUrl:'ryan-crouching',ryanTreatUrl:'ryan-treat',tennisUrl:'tennis-ball',playUrl:'play-ball'}))assets[key]='data:image/webp;base64,'+(await readFile(`public/dog/${file}.webp`)).toString('base64');
 const bark='data:audio/mpeg;base64,'+(await readFile('public/dog/bark.mp3')).toString('base64');
 const bundle=await build({stdin:{contents:`import {mountGoodDog} from './lib/good-dog/ui';mountGoodDog(document.getElementById('game'),${JSON.stringify(assets)},${JSON.stringify(bark)});`,resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,minify:true,format:'iife',target:'es2020'});
 const script=bundle.outputFiles[0].text,hash=createHash('sha256').update(script).digest('base64');
 const css=await readFile('app/good-dog.css','utf8');
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; media-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>Good Dog</title><style>body{margin:0;background:#20292d;min-height:100svh;display:grid;place-items:center;padding:16px;box-sizing:border-box}main{width:min(580px,100%)}h1{font:500 16px/1.4 system-ui;color:#d6ba89;margin:0 0 12px}${css}</style></head><body><main><h1>Good Dog</h1><div id="game"></div></main><script>${script}</script></body></html>`;
 // Includes the user's 33.5 KB MP3 as base64 so this preview remains fully offline.
 if(Buffer.byteLength(html)>425000)throw Error('Offline dog game exceeded its 425 KB audio-inclusive budget');
 await writeFile('public/good-dog.html',html.replaceAll('<title>Good Dog</title>','<title>Dog RL environment</title>').replaceAll('<h1>Good Dog</h1>','<h1>Dog RL environment</h1>'));console.log('Dog RL environment offline:',Buffer.byteLength(html),'bytes; zero external runtime requests.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await buildGoodDogOffline();
