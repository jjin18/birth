/** Sound-only control: deliberately has no access to the world, rewards or saves. */
export function mountBarkAudio(audio:HTMLAudioElement,button:HTMLButtonElement,status:HTMLElement,url:string){
 let active=false,disposed=false,attempt=0;
 const label=button.querySelector<HTMLElement>('[data-bark-label]')!;
 const idle='';
 audio.preload='none';audio.src=url;audio.volume=.65;
 function update(message=idle){
  label.textContent=active?'Stop bark':'Bark';
  button.setAttribute('aria-pressed',String(active));status.textContent=message;
 }
 function stop(message=idle){
  attempt++;active=false;audio.pause();
  try{audio.currentTime=0}catch{/* A failed or unready clip may not be seekable. */}
  if(!disposed)update(message);
 }
 async function toggle(){
  if(disposed||button.disabled)return;
  if(active){stop();return}
  const currentAttempt=++attempt;active=true;update('Playing bark');
  try{await audio.play()}catch{
   if(!disposed&&currentAttempt===attempt)stop('Could not play the bark. Try again.');
  }
 }
 const ended=()=>stop(),failed=()=>stop('Could not play the bark. Try again.');
 const visibility=()=>{if(document.hidden)stop()};
 const pagehide=()=>stop();
 button.addEventListener('click',toggle);audio.addEventListener('ended',ended);audio.addEventListener('error',failed);
 document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pagehide);
 update();
 function setDisabled(disabled:boolean){
  if(button.disabled===disabled)return;
  button.disabled=disabled;
  button.title=disabled?'Wait for the dog to finish.':'Play a bark. Does not affect training.';
  if(disabled)stop();
 }
 function dispose(){
  disposed=true;stop();button.removeEventListener('click',toggle);audio.removeEventListener('ended',ended);audio.removeEventListener('error',failed);
  document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pagehide);
  audio.removeAttribute('src');audio.load();
 }
 return {setDisabled,dispose};
}
