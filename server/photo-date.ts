// Only DateTimeOriginal is used. Bounds checks keep malformed EXIF harmless.
export function validDate(value: unknown): value is string {
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const parsed=new Date(value+'T12:00:00Z');
 return Number.isFinite(parsed.valueOf())&&parsed.toISOString().slice(0,10)===value&&value>='1900-01-01'&&value<='2199-12-31';
}
export function photoDate(exif?:Buffer):string|null{
 if(!exif)return null;
 try{
  const t=exif.subarray(exif.subarray(0,6).toString()==='Exif\0\0'?6:0);
  const endian=t.toString('ascii',0,2);if(t.length<8||!['II','MM'].includes(endian))return null;
  const little=endian==='II',u16=(p:number)=>little?t.readUInt16LE(p):t.readUInt16BE(p),u32=(p:number)=>little?t.readUInt32LE(p):t.readUInt32BE(p);
  if(u16(2)!==42)return null;
  const tag=(ifd:number,id:number):number|string|null=>{
   if(ifd<8||ifd+2>t.length)return null;
   const count=u16(ifd);if(count>512||ifd+2+count*12>t.length)return null;
   for(let i=0;i<count;i++){
    const p=ifd+2+i*12;if(u16(p)!==id)continue;
    if(u16(p+2)===4&&u32(p+4)===1)return u32(p+8);
    if(u16(p+2)===2){const n=u32(p+4),at=n<=4?p+8:u32(p+8);if(n>64||at+n>t.length)return null;return t.toString('ascii',at,at+n).replace(/\0+$/,'')}
   }return null;
  };
  const sub=tag(u32(4),0x8769);if(typeof sub!=='number')return null;
  const raw=tag(sub,0x9003);if(typeof raw!=='string'||!/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(raw))return null;
  const date=raw.slice(0,10).replaceAll(':','-');return validDate(date)?date:null;
 }catch{return null}
}
