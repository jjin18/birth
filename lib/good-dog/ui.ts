import {SaveManager} from './save';
import {SKILLS} from './training';
import {POSE_ROWS,dogSprite,fetchPhase,feedback,ballFlight,activityLabel,isPettingReward} from './presentation';

export type DogAssets={spriteUrl:string;ballSpriteUrl:string;ryanUrl:string;ryanCrouchUrl:string;ryanTreatUrl:string;tennisUrl:string;playUrl:string};
/** Shared by the lazy popup and the dependency-free, completely offline build. */
export function mountGoodDog(host:HTMLElement,options:DogAssets){
 let storage:Storage|null=null;try{storage=window.localStorage}catch{}
 const saves=new SaveManager(storage);
 let world=saves.load(),timer:ReturnType<typeof setInterval>|null=null,disposed=false,lastRevision=-1,lastSave=0,aimX=.76;
 host.classList.add('good-dog');
 host.innerHTML=`<div class="gd-intro"><span>Train your dog!</span><span data-returns>0 returns</span></div>
 <div class="gd-stage" role="button" tabindex="0" aria-label="Aim and throw the tennis ball. Click the grass or press Enter.">
  <div class="gd-grass" aria-hidden="true"><svg viewBox="0 0 580 90" preserveAspectRatio="none"><defs><pattern id="gd-blades" width="37" height="22" patternUnits="userSpaceOnUse"><path d="M5 22q2-8-2-13m2 13q3-5 6-6M26 10q1-6-2-9m2 9 4-4" fill="none" stroke="#a2b37b" stroke-opacity=".38" stroke-width="1.3" stroke-linecap="round"/></pattern></defs><path fill="url(#gd-blades)" d="M0 0h580v90H0z"/></svg></div>
  <div class="gd-human" data-pose="standing"><img data-ryan-standing alt="Ryan standing" draggable="false"><img data-ryan-crouching alt="Ryan crouching to train the dog" draggable="false" hidden></div><span class="gd-owner-label">Ryan</span>
  <img class="gd-petting" alt="Ryan rewarding and petting the dog" draggable="false" hidden>
  <span class="gd-aim" aria-hidden="true"></span>
  <div class="gd-puppy"><svg class="gd-sprite" viewBox="0 0 384 216" aria-hidden="true"><svg class="gd-crop" overflow="hidden"><image width="1536" height="864"/></svg></svg><img class="gd-play" alt="Dog with a tennis ball" draggable="false" hidden><span class="gd-treat" hidden>♥</span></div>
  <img class="gd-ball" alt="Tennis ball" draggable="false" hidden>
  <span class="gd-stage-hint">Click the grass to aim</span>
 </div>
 <ol class="gd-steps" aria-label="How to play"><li data-step="aim"><b>1</b> Throw</li><li data-step="fetch"><b>2</b> Fetch &amp; return</li><li data-step="reward"><b>3</b> Reward</li></ol>
 <div class="gd-status"><span data-behavior>Ready to play</span><span data-show></span></div>
 <p class="gd-message" role="status" aria-live="polite"></p>
 <div class="gd-primary"><button type="button" data-action="throw">Throw ball</button><button type="button" data-action="treat">Reward with treat ♥</button></div>
 <div class="gd-secondary" aria-label="More dog commands"><button type="button" data-action="call">Come here</button><button type="button" data-action="sit">Sit</button><button type="button" data-action="roll">Roll</button><button type="button" data-action="show" title="Teach fetch, sit and roll first, then evaluate what he learned.">Dog show (train first)</button><button type="button" data-action="start" hidden>Pause</button></div>
 <div class="gd-progress" aria-label="Learned skills">${SKILLS.map(skill=>`<span data-skill="${skill}">${skill==='roll'?'Roll':skill[0].toUpperCase()+skill.slice(1)} <i></i></span>`).join('')}</div>
 <p class="gd-result" hidden></p>
 <details class="gd-details"><summary>How he learns</summary>
  <p>Throw → watch → reward. He uses <strong>tabular Q-learning</strong>: a small table scores which action is useful in each situation. He usually chooses a promising move, but sometimes explores. Practice improves those scores; treats reinforce the move you reward.</p>
  <dl><dt>State space · 160 combinations</dt><dd>His current goal (wait, fetch, come here, sit or roll), plus whether the ball is visible, he is holding it, he is near it, he is near Ryan, and he is lying down.</dd>
  <dt>Action space · 10 moves</dt><dd>Wait, walk, run, pick up, return, drop, sit, lie down, look around and roll. Only moves possible in the current situation are available.</dd>
  <dt>Rewards</dt><dd>Progress and completing a cue earn automatic rewards; delays or an early drop can lose points. Give a treat during a good move, or after a completed trick, to reinforce it. Wait if he is distracted — treats can teach that too.</dd>
  <dt>Dog show · train, then evaluate</dt><dd>Think of practice as training an agent: teach fetch, sit and roll with rewards first. Dog show is the evaluation run — two fetches, a sit and a roll. His learned Q-table is frozen during the show, so there are no treats or learning updates. Use the results to see what needs more practice.</dd></dl>
  <p><strong>Controls:</strong> Click the grass to aim and throw. B throw · C come here · S sit · R roll · T treat · D Dog show. Enter or Space throws when the grass is focused. Pause takes a break.</p>
  <p>The Q-table is just 6.25 KiB. Learning runs locally and saves automatically in this browser.</p>
 </details>`;
 const find=<T extends Element=HTMLElement>(selector:string)=>host.querySelector<T>(selector)!;
 const sprite=find<SVGImageElement>('image'),crop=find<SVGSVGElement>('.gd-crop'),spriteBox=find<SVGSVGElement>('.gd-sprite');
 const puppy=find('.gd-puppy'),stage=find('.gd-stage'),ball=find<HTMLImageElement>('.gd-ball'),heart=find('.gd-treat'),play=find<HTMLImageElement>('.gd-play'),target=find('.gd-aim');
 const ryan=find('.gd-human'),standing=find<HTMLImageElement>('[data-ryan-standing]'),crouching=find<HTMLImageElement>('[data-ryan-crouching]');
 const pettingImage=find<HTMLImageElement>('.gd-petting');pettingImage.src=options.ryanTreatUrl;
 standing.src=options.ryanUrl;crouching.src=options.ryanCrouchUrl;ball.src=options.tennisUrl;play.src=options.playUrl;
 const behavior=find('[data-behavior]'),message=find('.gd-message'),show=find('[data-show]'),result=find('.gd-result'),returns=find('[data-returns]');
 const buttons=Object.fromEntries(Array.from(host.querySelectorAll<HTMLButtonElement>('[data-action]'),button=>[button.dataset.action!,button]));
 const progress=SKILLS.map(skill=>({skill,element:find(`[data-skill="${skill}"]`),dots:find(`[data-skill="${skill}"] i`)}));
 const text=(el:Element,value:string)=>{if(el.textContent!==value)el.textContent=value};
 const canThrow=()=>!world.show&&!world.dog.holding&&world.goal!=='fetch';
 let ballWasVisible=false,renderedThrow=-10000;
 function save(force=false){if(force||(world.revision!==lastRevision&&world.time-lastSave>=3000)){saves.save(world);lastRevision=world.revision;lastSave=world.time}}
 function render(){
  const petting=isPettingReward(world);pettingImage.hidden=!petting;ryan.hidden=petting;
  ryan.dataset.pose=world.started?'crouching':'standing';standing.hidden=world.started;crouching.hidden=!world.started;
  const spec=dogSprite(world),row=POSE_ROWS[spec.sheet==='ball'?0:Math.floor(spec.pose/4)],phase=fetchPhase(world),flight=ballFlight(world);
  const celebrating=world.current?.action==='drop';
  const url=spec.sheet==='ball'?options.ballSpriteUrl:options.spriteUrl;
  if(sprite.getAttribute('href')!==url)sprite.setAttribute('href',url);
  sprite.setAttribute('height',spec.sheet==='ball'?'216':'864');
  // Nested viewport really clips, including letterboxed padding. Masking alone
  // lets the printed labels bleed through under the belly-up and running poses.
  crop.setAttribute('viewBox',`${spec.pose%4*384} ${row.top} 384 ${row.height}`);
  crop.setAttribute('x','0');crop.setAttribute('y',String(216-row.height));crop.setAttribute('width','384');crop.setAttribute('height',String(row.height));
  spriteBox.style.display=celebrating||petting?'none':'';play.hidden=!celebrating||petting;
  play.style.setProperty('--gd-play-flip',world.dog.facing<0?'1':'-1');
  puppy.style.left=`${world.dog.x*100}%`;puppy.style.setProperty('--gd-flip',spec.mirror?'-1':'1');
  heart.hidden=world.time-world.lastTreat>=1100;
  // The carrying/dropping artwork includes its own ball. Never draw a second.
  ball.hidden=!world.ball.visible||world.dog.holding||spec.sheet==='ball'||celebrating;
  // A new round starts a new throw, never a CSS slide from the previous ball.
  ball.style.transition=!ballWasVisible||renderedThrow!==world.lastThrow?'none':'';
  ball.style.left=`calc(${flight.x*100}% + var(--gd-muzzle)*${world.ball.side})`;
  ball.style.bottom=`calc(var(--gd-ground) + ${flight.lift}px)`;
  ballWasVisible=!ball.hidden;renderedThrow=world.lastThrow;
  stage.dataset.ready=String(canThrow());stage.setAttribute('aria-disabled',String(!canThrow()));
  target.style.left=`calc(${aimX*100}% + var(--gd-muzzle))`;
  for(const step of ['aim','fetch','reward'])find(`[data-step="${step}"]`).dataset.active=String((phase==='return'?'fetch':phase)===step);
  text(behavior,activityLabel(world));text(message,feedback(world));
  const count=world.training.skills.fetch.successes;text(returns,`${count} ${count===1?'return':'returns'}`);
  text(show,world.show?`Show ${world.show.round+1}/4`:world.best?`Best ${world.best}/100`:'');
  buttons.start.hidden=!world.started;text(buttons.start,world.running?'Pause':'Resume');
  buttons.throw.disabled=!canThrow();
  for(const action of ['call','sit','roll'])buttons[action].disabled=!!world.show||(world.dog.holding&&action!=='call');
  buttons.treat.disabled=!world.canTreat;buttons.treat.dataset.good=String(world.canTreat&&(['walk','run','pickup','return','drop'].includes(world.current?.action??'')||!!world.treatCredit?.success));
  buttons.treat.title=world.canTreat?`Reward: ${world.behavior().toLowerCase()}`:'Wait for a move to reward';
  buttons.show.disabled=!world.started;text(buttons.show,world.show?'Stop show':'Dog show (train first)');
  for(const p of progress){const level=world.training.level(p.skill);text(p.dots,'●'.repeat(level)+'○'.repeat(3-level));p.element.setAttribute('aria-label',`${p.skill}: ${level} of 3`)}
  result.hidden=!world.result;if(world.result)text(result,`${world.result.score}/100 · Fetch ${world.result.fetches}/2 · Tricks ${world.result.tricks}/2 · ${world.result.seconds}s`);
  host.dataset.behavior=world.current?.action??world.dog.posture;host.dataset.phase=phase;host.dataset.sprite=petting?'petting':celebrating?'play-ball':`${spec.sheet}-${spec.pose}`;
 }
 function halt(){if(timer){clearInterval(timer);timer=null}save(true)}
 function schedule(){if(disposed||document.hidden||!world.running){halt();return}if(!timer)timer=setInterval(()=>{world.tick(100);save();render();if(!world.running)halt()},100)}
 function act(action:string){
  if(action==='start'){if(world.running){world.running=false;world.message='A little breather. Your dog will wait.'}else world.start()}
  if(action==='throw'&&canThrow()){if(!world.running)world.start();world.throwBall(aimX)}
  if(action==='call'||action==='sit'||action==='roll'){if(!world.running)world.start();world.command(action)}
  if(action==='treat'&&world.treat()&&isPettingReward(world))world.restUntil=Math.max(world.restUntil,world.time+1100);
  if(action==='show'){if(world.show)world.stopShow();else world.startShow()}
  save(true);render();schedule();
 }
 const click=(event:Event)=>{const button=(event.target as Element).closest<HTMLElement>('[data-action]');if(button&&!button.hasAttribute('disabled'))act(button.dataset.action!)};
 const keys=(event:KeyboardEvent)=>{if(event.ctrlKey||event.metaKey||event.altKey||event.repeat||(event.target as Element).closest('input,textarea,select,[contenteditable]'))return;if(event.target===stage&&(event.key==='Enter'||event.key===' ')){event.preventDefault();act('throw');return}const action=({b:'throw',c:'call',s:'sit',r:'roll',t:'treat',d:'show'} as Record<string,string>)[event.key.toLowerCase()];if(action&&!buttons[action].disabled){event.preventDefault();act(action)}};
 const aim=(event:MouseEvent)=>{const bounds=stage.getBoundingClientRect();aimX=Math.max(.5,Math.min(.84,(event.clientX-bounds.left)/bounds.width));target.style.left=`calc(${aimX*100}% + var(--gd-muzzle))`};
 const toss=(event:MouseEvent)=>{aim(event);act('throw')};
 const visibility=()=>{if(document.hidden)halt();else schedule()};
 const focus=()=>schedule();
 host.addEventListener('click',click);host.addEventListener('keydown',keys);stage.addEventListener('click',toss);stage.addEventListener('mousemove',aim);
 document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',halt);window.addEventListener('focus',focus);window.addEventListener('pagehide',halt);
 render();
 return()=>{disposed=true;halt();host.removeEventListener('click',click);host.removeEventListener('keydown',keys);stage.removeEventListener('click',toss);stage.removeEventListener('mousemove',aim);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',halt);window.removeEventListener('focus',focus);window.removeEventListener('pagehide',halt);host.replaceChildren()};
}
