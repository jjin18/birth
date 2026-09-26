import {CUP,between,type Point,type Stroke,type Pattern} from './matcha-art';
const SIZE=512;
type Context=CanvasRenderingContext2D;
function circle(ctx:Context,x:number,y:number,r:number){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2)}
function gradient(ctx:Context,x:number,y:number,r:number,colors:[number,string][]){const g=ctx.createRadialGradient(x-r*.2,y-r*.25,r*.02,x,y,r);for(const [stop,color]of colors)g.addColorStop(stop,color);return g}
function random(seed:number){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
export function paintTea(ctx:Context){
 ctx.clearRect(0,0,SIZE,SIZE);ctx.fillStyle=gradient(ctx,256,256,260,[[0,'#9fb967'],[.55,'#8fa84f'],[.9,'#7f983e'],[1,'#50652b']]);ctx.fillRect(0,0,SIZE,SIZE);
 const rand=random(22);
 for(let i=0;i<2100;i++){const x=rand()*SIZE,y=rand()*SIZE,r=.35+rand()*1.1;ctx.fillStyle=i%3?'rgba(230,235,166,.10)':'rgba(37,70,22,.06)';circle(ctx,x,y,r);ctx.fill()}
 for(let i=0;i<150;i++){const angle=rand()*Math.PI*2,radius=240+rand()*13,x=256+Math.cos(angle)*radius,y=256+Math.sin(angle)*radius;circle(ctx,x,y,.7+rand()*1.8);ctx.strokeStyle='#cad49188';ctx.lineWidth=.6;ctx.stroke()}
}
function milk(ctx:Context,p:Point,size:number){
 const x=p.x*SIZE,y=p.y*SIZE,r=size/2;
 ctx.fillStyle=gradient(ctx,x,y,r,[[0,'#fff9e9'],[.75,'#fff8e7'],[.9,'#f4efcf'],[1,'rgba(242,238,206,0)']]);circle(ctx,x,y,r);ctx.fill();
}
function etch(ctx:Context,a:Point,b:Point,size:number){
 // Advect the existing milk and tea locally under the needle. This really
 // pulls the foam, rather than painting a green line or moving the whole cup.
 const cx=b.x*SIZE,cy=b.y*SIZE,r=size*.62,dx=(b.x-a.x)*SIZE,dy=(b.y-a.y)*SIZE;
 const left=Math.max(0,Math.floor(cx-r-2)),top=Math.max(0,Math.floor(cy-r-2));
 const width=Math.min(SIZE-left,Math.ceil(r*2+4)),height=Math.min(SIZE-top,Math.ceil(r*2+4));
 const patch=ctx.getImageData(left,top,width,height),copy=new Uint8ClampedArray(patch.data);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const distance=Math.hypot(left+x-cx,top+y-cy)/r;if(distance>=1)continue;
  const weight=(1-distance*distance)**2;
  const sx=Math.max(0,Math.min(width-1,x-dx*weight*.92)),sy=Math.max(0,Math.min(height-1,y-dy*weight*.92));
  const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),fx=sx-x0,fy=sy-y0,index=(y*width+x)*4;
  for(let c=0;c<3;c++)patch.data[index+c]=copy[(y0*width+x0)*4+c]*(1-fx)*(1-fy)+copy[(y0*width+x1)*4+c]*fx*(1-fy)+copy[(y1*width+x0)*4+c]*(1-fx)*fy+copy[(y1*width+x1)*4+c]*fx*fy;
 }
 ctx.putImageData(patch,left,top);
}
export function patternPath(ctx:Context,pattern:Pattern){
 ctx.beginPath();
 if(pattern==='heart'){
  ctx.moveTo(256,365);ctx.bezierCurveTo(205,329,151,281,163,231);ctx.bezierCurveTo(175,182,230,182,256,222);ctx.bezierCurveTo(282,182,337,182,349,231);ctx.bezierCurveTo(361,281,307,329,256,365);
 }else{
  for(let i=0;i<7;i++){const y=172+i*27,w=16+i*6;ctx.moveTo(253,y+25);ctx.bezierCurveTo(253-w*1.4,y+18,244-w,y-21,253,y+4);ctx.moveTo(259,y+25);ctx.bezierCurveTo(259+w*1.4,y+18,268+w,y-21,259,y+4)}
  ctx.moveTo(254,154);ctx.bezierCurveTo(252,220,252,322,255,375);ctx.lineTo(262,375);ctx.bezierCurveTo(258,290,260,220,258,154);ctx.closePath();
 }
}
export function drawStrokePoint(ctx:Context,stroke:Stroke,index:number){
 const point=stroke.points[index],previous=stroke.points[index-1];
 if(stroke.tool==='heart'||stroke.tool==='leaf'){
  if(index)return;ctx.save();ctx.translate((point.x-.5)*SIZE,(point.y-.5)*SIZE);patternPath(ctx,stroke.tool);
  ctx.fillStyle=gradient(ctx,256,265,140,[[0,'#fffbed'],[.8,'#fcf4da'],[1,'#e9e5bf']]);ctx.fill();ctx.restore();return;
 }
 if(!previous||point.lift){if(stroke.tool==='milk')milk(ctx,point,stroke.size);return}
 let last=previous;
 for(const next of between(previous,point,(stroke.tool==='milk'?Math.max(1,stroke.size*.07):2)/SIZE)){
  if(stroke.tool==='milk')milk(ctx,next,stroke.size);else etch(ctx,last,next,stroke.size);
  last=next;
 }
}
export function replayArt(ctx:Context,strokes:Stroke[]){paintTea(ctx);for(const stroke of strokes)stroke.points.forEach((_,i)=>drawStrokePoint(ctx,stroke,i))}
export function makeArtCanvas(){const canvas=document.createElement('canvas');canvas.width=canvas.height=SIZE;return canvas}
export function paintCup(ctx:Context,art:HTMLCanvasElement,guide:Pattern|null=null){
 const {width,height,x,y,radius}=CUP;ctx.clearRect(0,0,width,height);
 ctx.save();ctx.shadowColor='#35392f35';ctx.shadowBlur=35;ctx.shadowOffsetX=11;ctx.shadowOffsetY=24;
 circle(ctx,x,y+7,279);ctx.fillStyle='#d5cebc';ctx.fill();ctx.restore();
 circle(ctx,x,y,279);ctx.fillStyle=gradient(ctx,x,y,285,[[0,'#fcfaf1'],[.76,'#eeeadc'],[.84,'#d8d4c5'],[.92,'#f9f7ed'],[1,'#c9c6b8']]);ctx.fill();
 circle(ctx,x,y,264);ctx.strokeStyle='#ffffff9c';ctx.lineWidth=2;ctx.stroke();
 // Handle opening is genuinely hollow, revealing the saucer underneath.
 ctx.save();ctx.translate(x+246,y+3);ctx.rotate(-.12);ctx.shadowBlur=10;ctx.shadowColor='#45483d44';ctx.shadowOffsetY=8;
 ctx.beginPath();ctx.ellipse(0,0,75,56,0,0,Math.PI*2);ctx.ellipse(0,0,47,32,0,0,Math.PI*2,true);
 const handle=ctx.createLinearGradient(0,-58,0,58);handle.addColorStop(0,'#fffcf0');handle.addColorStop(.45,'#e9e4d5');handle.addColorStop(1,'#c1bdaf');ctx.fillStyle=handle;ctx.fill('evenodd');ctx.restore();
 ctx.save();ctx.shadowColor='#22291955';ctx.shadowBlur=17;ctx.shadowOffsetX=5;ctx.shadowOffsetY=10;circle(ctx,x,y,245);ctx.fillStyle='#e1dcca';ctx.fill();ctx.restore();
 circle(ctx,x,y,245);ctx.fillStyle=gradient(ctx,x-5,y-6,251,[[0,'#f0e9d6'],[.84,'#d1cab8'],[.925,'#fdfcf4'],[.962,'#f2eddf'],[1,'#b8b5a7']]);ctx.fill();
 ctx.save();circle(ctx,x,y,radius);ctx.clip();ctx.drawImage(art,x-radius,y-radius,radius*2,radius*2);
 if(guide){ctx.save();ctx.translate(x-radius,y-radius);ctx.scale(radius*2/SIZE,radius*2/SIZE);patternPath(ctx,guide);ctx.strokeStyle='#faffde8c';ctx.lineWidth=1.5;ctx.setLineDash([5,7]);ctx.stroke();ctx.restore()}
 const shine=ctx.createLinearGradient(x-radius,y-radius,x+radius,y+radius);shine.addColorStop(0,'#ffffe714');shine.addColorStop(.4,'#ffffff00');shine.addColorStop(1,'#17301212');ctx.fillStyle=shine;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);ctx.restore();
 circle(ctx,x,y,radius+1);ctx.strokeStyle='#535a3844';ctx.lineWidth=3;ctx.stroke();
 ctx.beginPath();ctx.arc(x,y,235,Math.PI*1.05,Math.PI*1.75);ctx.strokeStyle='#ffffffb0';ctx.lineWidth=3;ctx.lineCap='round';ctx.stroke();
}
