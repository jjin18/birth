// Mechanical atlas packing after background extraction. Never redraws the dog.
// Usage: node scripts/pack-dog-sprites.mjs <transparent-tricks.png> <transparent-ball.png>
import sharp from 'sharp';
import assert from 'node:assert/strict';
const [tricks,ball]=process.argv.slice(2);
assert(tricks&&ball,'Pass both transparent source sheets');
// Measured empty gutters, NOT uniform 256px rows. The ball-holding head starts
// above y=768, so slicing a regular grid removes its ears and forehead.
const edges=[0,262,496,725,1024];
const headHeights=[88,95,75,89,85,87,100,84,87,78,70,70,85,86,88,90];
for(const [name,path] of [['poses',tricks],['ball-poses',ball]]){
 const meta=await sharp(path).metadata();assert(meta.hasAlpha&&meta.width===1536&&meta.height===1024);
 const layers=[],start=name==='poses'?0:12;
 for(let i=start;i<16;i++){
  const row=Math.floor(i/4);
  const input=await sharp(path).extract({left:i%4*384,top:edges[row],width:384,height:edges[row+1]-edges[row]}).toBuffer();
  const trimmed=await sharp(input).trim({background:'#00000000',threshold:12}).png().toBuffer({resolveWithObject:true});
  const head=name==='poses'?headHeights[i]:[100,100,105,82][i-12];
  // Equal head scale, with enough cell padding for a stretched running body.
  // Normalizing total height alone makes a low running pose look like a puppy.
  const scale=Math.min(85/head,348/trimmed.info.width,202/trimmed.info.height);
  const packed=await sharp(trimmed.data).resize(Math.round(trimmed.info.width*scale),Math.round(trimmed.info.height*scale)).png().toBuffer({resolveWithObject:true});
  layers.push({input:packed.data,left:i%4*384+Math.round((384-packed.info.width)/2),top:Math.floor((i-start)/4)*216+210-packed.info.height});
 }
 // Resize only AFTER compositing; sharp otherwise resizes the base before layers.
 const atlas=await sharp({create:{width:1536,height:name==='poses'?864:216,channels:4,background:'#00000000'}}).composite(layers).png().toBuffer();
 await sharp(atlas).resize(1152).webp({quality:80,alphaQuality:80,effort:6}).toFile(`public/dog/${name}.webp`);
 console.log(name,'foreground intact, matched head scale, shared foot baseline');
}
