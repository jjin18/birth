import type { SavedFortune } from './fortunes';
async function result<T>(response:Response):Promise<T>{const data=await response.json();if(!response.ok)throw Error(data.error||'The paper clip is unavailable. Please try again.');return data as T}
export function getFortunes(){return fetch('/api/fortunes',{credentials:'same-origin',cache:'no-store'}).then(r=>result<{fortunes:SavedFortune[];total:number}>(r))}
export function openFortune(requestId:string){return fetch('/api/fortunes',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId})}).then(r=>result<{fortune?:SavedFortune;exhausted?:boolean;total:number}>(r))}
