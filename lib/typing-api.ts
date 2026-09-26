export type SharedChallenge={id:string;text:string};
export type TypingBest={wpm:number;accuracy:number}|null;
export type TypingCollection={challenges:SharedChallenge[];best:TypingBest};

async function request<T>(path:string,data?:unknown):Promise<T>{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
  try{
    const response=await fetch('/api/typing'+path,{method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json',...(data===undefined?{}:{'Content-Type':'application/json'})},body:data===undefined?undefined:JSON.stringify(data)});
    if(!(response.headers.get('content-type')||'').includes('application/json'))throw Error('Shared typing is unavailable.');
    const value=await response.json();
    if(!response.ok)throw Error(typeof value.error==='string'?value.error:'Could not save. Please try again.');
    return value;
  }catch(error){if(error instanceof Error&&error.name!=='AbortError')throw error;throw Error('Connection timed out. Try again.')}
  finally{clearTimeout(timeout)}
}
function validBest(value:TypingBest){return value===null||(value&&Number.isInteger(value.wpm)&&value.wpm>=0&&value.wpm<=400&&Number.isInteger(value.accuracy)&&value.accuracy>=0&&value.accuracy<=100)}
function collection<T extends TypingCollection>(value:T):T{
  if(!value||!validBest(value.best)||!Array.isArray(value.challenges)||!value.challenges.length||value.challenges.length>200||value.challenges.some(p=>!p||typeof p.id!=='string'||!p.id||typeof p.text!=='string'||!p.text.trim()||p.text.length>400)||new Set(value.challenges.map(p=>p.id)).size!==value.challenges.length)throw Error('Shared typing is unavailable.');
  return value;
}
export function getTyping(){return request<TypingCollection>('').then(collection)}
export function addTypingChallenge(text:string){return request<TypingCollection&{id:string}>('/challenges',{text}).then(collection)}
export function startTypingRound(challengeId:string,id:string){return request<{id:string}>('/start',{challengeId,id})}
export function finishTypingRound(result:{id:string;text:string;attempts:number;mistakes:number;elapsed:number}){return request<{best:TypingBest}>('/finish',result).then(value=>{if(!validBest(value?.best))throw Error('Score not saved.');return value})}
