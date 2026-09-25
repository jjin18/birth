import {SaveManager,serialize} from './save';
import {SKILLS} from './training';

/** Shared by the lazy website popup and the dependency-free offline build. */
export function mountGoodDog(host:HTMLElement,options:{spriteUrl:string;offlineUrl?:string}){
 let storage:Storage|null=null;try{storage=window.localStorage}catch{}
 const saves=new SaveManager(storage);let world=saves.load(),timer:ReturnType<typeof setInterval>|null=null,disposed=false,lastRevision=-1,lastSave=0;
 host.classList.add('good-dog');
 host.innerHTML=`<div class="gd-stage" role="img" aria-label="A Maltese dog in a small grassy training area">
 <div class="gd-grass"></div><svg class="gd-human" viewBox="0 0 32 64" aria-hidden="true"><circle cx="16" cy="9" r="7"/><path d="M16 20v23M5 34l11-14 11 14M16 43L7 62m9-19 9 19" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>
 <div class="gd-puppy"><svg viewBox="0 0 384 214" aria-hidden="true"><image width="1536" height="1024"/></svg><span class="gd-mouth-ball" hidden></span><span class="gd-treat" hidden>♥</span></div>
 <span class="gd-ball" hidden></span><span class="gd-owner-label">you</span></div>
 <div class="gd-status"><span data-behavior>Waiting for you</span><span data-show></span></div>
 <p class="gd-message" role="status" aria-live="polite"></p>
 <div class="gd-buttons" aria-label="Dog training controls"><button type="button" data-action="start">Start Training</button><button type="button" data-action="throw">Throw Ball</button><button type="button" data-action="call">Call</button><button type="button" data-action="sit">Sit</button><button type="button" data-action="roll">Roll</button><button type="button" data-action="treat">Treat ♥</button><button type="button" data-action="show">Dog Show</button></div>
 <div class="gd-progress" aria-label="Training progress">${SKILLS.map(skill=>`<span data-skill="${skill}">${skill==='roll'?'Roll over':skill[0].toUpperCase()+skill.slice(1)} <i></i></span>`).join('')}</div>
 <p class="gd-result" hidden></p>
 <details class="gd-details"><summary>Help &amp; saved dog</summary><p>Reward good choices as they happen: approach → pick up → return → drop. Treats reinforce whatever your dog is doing. Sit and Roll work the same way.</p><p>Keys: B throw · C call · S sit · R roll · T treat · D show. Training pauses when this window is hidden. No sound, no network, no account.</p><p data-save role="status"></p><div class="gd-save-actions"><button type="button" data-action="export">Export dog</button><label>Import dog<input type="file" accept="application/json,.json" data-import></label><a data-offline hidden download="Good Dog.html">Download offline game</a></div><p>Website and offline saves are separate. Export/import to move your dog between them.</p></details>`;
 const find=<T extends Element=HTMLElement>(selector:string)=>host.querySelector<T>(selector)!;
 const sprite=find<SVGImageElement>('image');sprite.setAttribute('href',options.spriteUrl);
 const puppy=find('.gd-puppy'),stage=find('.gd-stage'),ball=find('.gd-ball'),mouth=find('.gd-mouth-ball'),heart=find('.gd-treat');
 const behavior=find('[data-behavior]'),message=find('.gd-message'),show=find('[data-show]'),result=find('.gd-result'),saveStatus=find('[data-save]');
 const buttons=Object.fromEntries(Array.from(host.querySelectorAll<HTMLButtonElement>('[data-action]'),button=>[button.dataset.action!,button]));
 const progress=SKILLS.map(skill=>({skill,element:find(`[data-skill="${skill}"]`),dots:find(`[data-skill="${skill}"] i`)}));
 if(options.offlineUrl){const link=find<HTMLAnchorElement>('[data-offline]');link.href=options.offlineUrl;link.hidden=false}
 const text=(el:Element,value:string)=>{if(el.textContent!==value)el.textContent=value};
 function save(force=false){if(force||(world.revision!==lastRevision&&world.time-lastSave>=3000)){saves.save(world);lastRevision=world.revision;lastSave=world.time}text(saveStatus,saves.status)}
 function render(){
  const pose=world.pose(),mirror=world.dog.facing<0&&pose!==8;
  sprite.setAttribute('x',String(-(pose%4)*384));sprite.setAttribute('y',String(-Math.floor(pose/4)*256));
  puppy.style.left=`${world.dog.x*100}%`;puppy.style.setProperty('--gd-flip',mirror?'-1':'1');
  mouth.hidden=!world.dog.holding;heart.hidden=world.time-world.lastTreat>=800;
  ball.hidden=!world.ball.visible||world.dog.holding;ball.style.left=`${world.ball.x*100}%`;
  text(behavior,world.behavior());text(message,world.message);
  text(show,world.show?`Show ${world.show.round+1}/4`:world.best?`Best ${world.best}/100`:'');
  text(buttons.start,world.running?'Pause':world.started?'Resume Training':'Start Training');buttons.start.disabled=false;
  for(const action of ['throw','call','sit','roll'])buttons[action].disabled=!world.running||!!world.show||(action==='throw'&&world.dog.holding);
  buttons.treat.disabled=!world.canTreat;buttons.show.disabled=!world.started;text(buttons.show,world.show?'Stop Show':'Dog Show');
  for(const p of progress){const level=world.training.level(p.skill);text(p.dots,'●'.repeat(level)+'○'.repeat(3-level));p.element.setAttribute('aria-label',`${p.skill}: ${level} of 3`)}
  result.hidden=!world.result;if(world.result)text(result,`${world.result.score}/100 · Fetch ${world.result.fetches}/2 · Tricks ${world.result.tricks}/2 · ${world.result.seconds}s`);
  host.dataset.behavior=world.current?.action??world.dog.posture;
 }
 function halt(){if(timer){clearInterval(timer);timer=null}save(true)}
 function schedule(){if(disposed||document.hidden||!world.running){halt();return}if(!timer)timer=setInterval(()=>{world.tick(100);save();render();if(!world.running)halt()},100)}
 function download(name:string,content:string){const url=URL.createObjectURL(new Blob([content],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),0)}
 function act(action:string){
  if(action==='start'){if(world.running){world.running=false;world.message='A little breather. Your dog will wait.'}else world.start()}
  if(action==='throw')world.throwBall();
  if(action==='call'||action==='sit'||action==='roll')world.command(action);
  if(action==='treat')world.treat();
  if(action==='show'){if(world.show)world.stopShow();else world.startShow()}
  if(action==='export'){save(true);download('good-dog-save.json',serialize(world))}
  save(true);render();schedule();
 }
 const click=(event:Event)=>{const button=(event.target as Element).closest<HTMLElement>('[data-action]');if(button&&!button.hasAttribute('disabled'))act(button.dataset.action!)};
 const keys=(event:KeyboardEvent)=>{if(event.ctrlKey||event.metaKey||event.altKey||event.repeat||(event.target as Element).closest('input,textarea,select,[contenteditable]'))return;const action=({b:'throw',c:'call',s:'sit',r:'roll',t:'treat',d:'show'} as Record<string,string>)[event.key.toLowerCase()];if(action&&!buttons[action].disabled){event.preventDefault();act(action)}};
 const aim=(event:MouseEvent)=>{const bounds=stage.getBoundingClientRect();world.throwBall((event.clientX-bounds.left)/bounds.width);render();schedule()};
 const visibility=()=>{if(document.hidden)halt();else schedule()};
 const focus=()=>schedule();
 const input=find<HTMLInputElement>('[data-import]');
 const importDog=async()=>{const file=input.files?.[0];if(!file)return;world.running=false;halt();try{if(file.size>65536)throw Error('Save file is too large');const raw=await file.text();if(disposed)return;world=saves.import(raw);lastRevision=-1;lastSave=0;world.message='Your dog is back. Ready when you are.'}catch{world.message='Could not read that dog save. Your current dog is unchanged.'}input.value='';text(saveStatus,saves.status);render()};
 host.addEventListener('click',click);host.addEventListener('keydown',keys);stage.addEventListener('click',aim);input.addEventListener('change',importDog);
 document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',halt);window.addEventListener('focus',focus);window.addEventListener('pagehide',halt);
 render();text(saveStatus,saves.status);
 return()=>{disposed=true;halt();host.removeEventListener('click',click);host.removeEventListener('keydown',keys);stage.removeEventListener('click',aim);input.removeEventListener('change',importDog);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',halt);window.removeEventListener('focus',focus);window.removeEventListener('pagehide',halt);host.replaceChildren()};
}
