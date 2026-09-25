// Explicit, local-only import. Originals never enter public/ or Git.
import sharp from 'sharp';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';

const photos=[
 ['image17.jpeg','curry','Curry date','Curry, rice and naan on the table.'],
 ['image18.jpeg','sushi','Sushi night','Two platters of colorful sushi rolls.'],
 ['image3 (1).jpeg','seafood','Seafood date','Crab, bread and a seafood picnic.'],
 ['image7 (1).jpeg','night-walk','A night out','An illuminated rotunda reflected in the water at night.'],
 ['image13.jpeg','matcha','Matcha together','An iced matcha drink on a cafe table.'],
 ['image31.jpeg','us','Just us','The two of us taking a selfie together.'],
 ['image11 (1).jpeg','burger','Burger stop','A burger and sides in a basket.'],
 ['image30.jpeg','dinner-crispy','Something crispy','A plate of crispy bites with a shredded topping.'],
 ['image28.jpeg','dinner-flowers','Almost too pretty to eat','A colorful dish with herbs and edible flowers.'],
 ['image11.jpeg','dinner','Dinner together','A shared dinner plate with seared slices and dipping sauce.'],
 ['image32.jpeg','flame','A little extra heat','A cheesy skillet being finished with a cooking torch.']
];

// Read only the original capture timestamp, never GPS, device IDs or file dates.
function captureTime(exif){
 if(!exif)return null;
 const start=exif.subarray(0,6).toString()==='Exif\0\0'?6:0;
 const t=exif.subarray(start),little=t.toString('ascii',0,2)==='II';
 const u16=p=>little?t.readUInt16LE(p):t.readUInt16BE(p);
 const u32=p=>little?t.readUInt32LE(p):t.readUInt32BE(p);
 if(t.length<8||u16(2)!==42)return null;
 function tag(ifd,id){
  for(let i=0;i<u16(ifd);i++){
   const p=ifd+2+i*12;
   if(u16(p)!==id)continue;
   if(u16(p+2)===4)return u32(p+8);
   if(u16(p+2)===2){const n=u32(p+4),offset=n<=4?p+8:u32(p+8);return t.toString('ascii',offset,offset+n).replace(/\0+$/,'')}
  }
  return null;
 }
 const sub=tag(u32(4),0x8769);
 if(typeof sub!=='number')return null;
 const value=tag(sub,0x9003);
 return typeof value==='string'&&/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(value)?value:null;
}

const source=resolve(process.argv.find(a=>a.startsWith('--source='))?.slice(9)||'../Downloads');
const output=resolve('public/memories'),write=process.argv.includes('--write');
const records=[];
for(const [file,id,title,alt] of photos){
 const input=join(source,file),metadata=await sharp(input).metadata(),taken=captureTime(metadata.exif);
 const image=await sharp(input).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:88,effort:5}).toBuffer({resolveWithObject:true});
 const small=Math.max(image.info.width,image.info.height)<=480;
 const thumb=small?image:await sharp(input).rotate().resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:80,effort:5}).toBuffer({resolveWithObject:true});
 if(write){await mkdir(output,{recursive:true});await writeFile(join(output,id+'.webp'),image.data);if(!small)await writeFile(join(output,id+'-thumb.webp'),thumb.data)}
 records.push({id,title,alt,date:taken?taken.slice(0,10).replaceAll(':','-'):null,src:`/memories/${id}.webp`,thumbnail:`/memories/${id}${small?'':'-thumb'}.webp`,width:image.info.width,height:image.info.height,taken});
 console.log(JSON.stringify({file,date:taken?.slice(0,10)||null,width:image.info.width,height:image.info.height,webBytes:image.data.length,thumbnailBytes:small?0:thumb.data.length}));
}
records.sort((a,b)=>(a.taken??'9999').localeCompare(b.taken??'9999'));
assert.equal(records.filter(p=>p.date).length,8,'Expected eight original capture dates; inspect changes before importing');
if(write){
 const featured=['matcha','us','dinner','night-walk','sushi'];
 const tiles=await Promise.all(featured.map(async(id,index)=>({input:await sharp(join(output,id+'.webp')).resize(128,128,{fit:'cover'}).toBuffer(),left:index%3*128,top:Math.floor(index/3)*128})));
 await sharp({create:{width:384,height:256,channels:3,background:'#eee5ce'}}).composite(tiles).webp({quality:86,effort:5}).toFile(join(output,'wall-atlas.webp'));
 await writeFile('lib/date-wall-data.json',JSON.stringify(records.map(({taken,...publicPhoto})=>publicPhoto),null,2)+'\n');
 const assets=JSON.parse(await readFile('lib/site-assets.json','utf8'));
 assets.memoryWallImages=[...new Set(records.flatMap(p=>[p.src.slice(1),p.thumbnail.slice(1)])),'memories/wall-atlas.webp'];
 await writeFile('lib/site-assets.json',JSON.stringify(assets,null,2)+'\n');
}
