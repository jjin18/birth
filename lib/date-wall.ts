import photos from './date-wall-data.json';
export type DatePhoto={id:string;title:string;note:string;alt:string;date:string|null;src:string|null;thumbnail:string|null;width:number;height:number;version:number};
export const datePhotos:DatePhoto[]=photos.map(photo=>({...photo,note:'',version:1}));
export const dateGroups=groupDates(datePhotos);
export function groupDates(entries:DatePhoto[]){return Array.from(new Set(entries.map(photo=>photo.date))).sort((a,b)=>(a??'9999').localeCompare(b??'9999')).map(date=>({date,photos:entries.filter(photo=>photo.date===date)}))}
const dateFormat=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
export function dateLabel(date:string|null){return date?dateFormat.format(new Date(date+'T12:00:00Z')):'Undated'}
