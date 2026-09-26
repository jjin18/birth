export type Point={x:number;y:number;lift?:boolean};
export type Tool='milk'|'etch';
export type Pattern='heart'|'leaf';
export type Stroke={tool:Tool|Pattern;size:number;points:Point[]};
export const MATCHA_SAVE_KEY='ryans-22nd-matcha-art-v1';
export const MAX_STROKES=160;
export const MAX_POINTS=16000;
export const CUP={width:800,height:700,x:367,y:342,radius:218} as const;
export function inTea(point:Point){return Math.hypot(point.x-.5,point.y-.5)<=.498}
export function cupPoint(clientX:number,clientY:number,rect:{left:number;top:number;width:number;height:number}):Point{
 return {x:((clientX-rect.left)/rect.width*CUP.width-CUP.x)/(CUP.radius*2)+.5,y:((clientY-rect.top)/rect.height*CUP.height-CUP.y)/(CUP.radius*2)+.5};
}
export function pointCount(strokes:Stroke[]){return strokes.reduce((n,stroke)=>n+stroke.points.length,0)}
export function canAddStroke(strokes:Stroke[]){return strokes.length<MAX_STROKES&&pointCount(strokes)<MAX_POINTS}
export function serializeArt(strokes:Stroke[]){return JSON.stringify({version:1,strokes})}
// A bounded, versioned draft. No dog progress, fortune data, or shared-board data
// is ever read or written by this game.
export function parseArt(raw:string):Stroke[]{
 if(raw.length>1500000)throw Error('Drawing is too large');
 const data=JSON.parse(raw);
 if(data?.version!==1||!Array.isArray(data.strokes)||data.strokes.length>MAX_STROKES)throw Error('Invalid drawing');
 let total=0;
 return data.strokes.map((stroke:Stroke)=>{
  if(!stroke||!['milk','etch','heart','leaf'].includes(stroke.tool)||!Number.isFinite(stroke.size)||stroke.size<8||stroke.size>64||!Array.isArray(stroke.points)||!stroke.points.length)throw Error('Invalid stroke');
  total+=stroke.points.length;if(total>MAX_POINTS)throw Error('Drawing is too large');
  return {tool:stroke.tool,size:stroke.size,points:stroke.points.map(point=>{
   if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||!inTea(point)||(point.lift!==undefined&&typeof point.lift!=='boolean'))throw Error('Invalid point');
   return {x:point.x,y:point.y,...(point.lift?{lift:true}:{})};
  })};
 });
}
export function between(a:Point,b:Point,spacing:number):Point[]{
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/spacing));
 return Array.from({length:steps},(_,i)=>({x:a.x+(b.x-a.x)*(i+1)/steps,y:a.y+(b.y-a.y)*(i+1)/steps}));
}
