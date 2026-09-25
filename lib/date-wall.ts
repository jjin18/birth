import photos from './date-wall-data.json';
export type DatePhoto=typeof photos[number];
export const datePhotos:DatePhoto[]=photos;
export const dateGroups=Array.from(new Set(photos.map(photo=>photo.date))).map(date=>({date,photos:photos.filter(photo=>photo.date===date)}));
const dateFormat=new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
export function dateLabel(date:string|null){return date?dateFormat.format(new Date(date+'T12:00:00Z')):'Undated'}
