import {DogBrain,encode,type Action,type Goal} from './brain';
import {Dog} from './dog';
import {TrainingManager,type Credit} from './training';
import {Competition,SHOW_ROUNDS,type ShowResult} from './competition';
export const OWNER_X=.26;
export const BEHAVIOR:Record<Action,string>={idle:'Taking a little break',walk:'Walking to the ball',run:'Chasing the ball',pickup:'Picking up the ball',return:'Coming back to you',drop:'Dropping the ball',sit:'Sitting',lie:'Lying down',look:'Looking around',roll:'Rolling over'};
type Step=Credit&{elapsed:number;duration:number;from:number;to:number;ballDistance:number;ownerDistance:number};

export class GameWorld{
 readonly dog=new Dog();
 readonly training=new TrainingManager();
 brain:DogBrain;
 private showBrain:DogBrain|null=null;
 ball={x:.75,visible:false,side:1};goal:Goal='none';running=false;started=false;time=0;restUntil=0;
 current:Step|null=null;lastTreat=-10000;lastThrow=-10000;best=0;shows=0;revision=0;
 message='One little dog. A little patience. A lot of good treats.';
 show:Competition|null=null;result:ShowResult|null=null;
 constructor(seed?:number){this.brain=new DogBrain(seed)}
 get policy(){return this.showBrain??this.brain}
 situation(){return {goal:this.goal,ballVisible:this.ball.visible,holding:this.dog.holding,nearBall:Math.abs(this.dog.x-this.ball.x)<.055,nearOwner:Math.abs(this.dog.x-OWNER_X)<.055,lying:this.dog.posture==='lie'}}
 actions():Action[]{
  const s=this.situation(),actions:Action[]=['idle','look','sit'];
  if(!s.lying&&(this.goal==='roll'||this.goal==='none'))actions.push('lie');
  if(s.lying)actions.push('roll');
  // A resting ball remains part of the scene during tricks, but is only a
  // fetch target when requested. Visibility and the current task are separate.
  if(this.goal==='fetch'&&s.ballVisible&&!s.holding){if(s.nearBall)actions.push('pickup');else actions.push('walk','run')}
  if(!s.nearOwner&&(s.holding||this.goal==='call'||this.goal==='none'))actions.push('return');
  if(s.holding&&(s.nearOwner||this.goal!=='fetch'))actions.push('drop');
  return actions;
 }
 private releaseBall(){
  if(!this.dog.holding)return;
  this.ball={x:this.dog.x,visible:true,side:this.dog.facing};this.dog.holding=false;
 }
 start(){if(this.result){this.releaseBall();this.dog.reset();this.result=null;this.current=null;this.goal='none';this.restUntil=0}this.started=true;this.running=true;this.message='Throw the ball. Reward the moments you want to see again.'}
 command(goal:Exclude<Goal,'none'|'fetch'>){
  if(!this.running||this.show)return;
  if(goal==='call'){
   this.dog.facing=-1; // Ryan stands to the left of the dog's return spot.
   if(Math.abs(this.dog.x-OWNER_X)<.055&&!this.dog.holding){
    this.current=null;this.goal='none';this.dog.posture='sit';this.restUntil=0;
    this.message='Right beside Ryan. Sitting and waiting for your next cue.';return;
   }
  }
  // Calling a dog carrying a fetch must not erase the fetch/drop objective.
  if(goal==='call'&&this.dog.holding){this.goal='fetch';this.current=null;this.restUntil=0;this.message='Bring it back to Ryan!';return}
  this.current=null;this.restUntil=0;this.goal=goal;this.training.recent=[];this.result=null;
  this.message=goal==='call'?'Come here, little one.':goal==='sit'?'Sit! Let’s see what happens.':'Roll over! Lying down is a good first step.';
 }
 throwBall(x=.76){
  if(!this.running||this.show||this.dog.holding)return false;
  this.current=null;this.restUntil=this.time+650;this.dog.posture='stand';this.ball={x:Math.max(.5,Math.min(.84,x)),visible:true,side:1};this.goal='fetch';this.lastThrow=this.time;
  this.training.recent=[];this.result=null;this.message='Go get it! A treat can encourage a good choice.';return true;
 }
 get treatCredit():Credit|undefined{return this.current??this.training.recent.at(-1)}
 get canTreat(){const credit=this.treatCredit;return this.running&&!this.show&&!!credit&&!credit.rewarded&&this.time-this.lastTreat>=1100&&(!!this.current||credit.success||this.time-credit.time<4500)}
 treat(){
  if(!this.canTreat)return false;
  const credit=this.treatCredit!;if(!this.training.treat(this.brain,credit))return false;
  this.lastTreat=this.time;this.revision++;this.message=this.training.milestone()||`Good dog! You rewarded: ${BEHAVIOR[credit.action].toLowerCase()}.`;return true;
 }
 startShow(){
  if(!this.started||this.show)return;
  this.running=true;this.current=null;this.result=null;this.show=new Competition();this.showBrain=this.brain.clone();
  this.showBrain.seed=(this.brain.seed^(this.shows+1)*0x9e3779b9)>>>0||1;this.setupRound();
 }
 stopShow(){if(!this.show)return;this.releaseBall();this.show=null;this.showBrain=null;this.goal='none';this.current=null;this.message='Back to training. No show score saved.'}
 private setupRound(){
  this.releaseBall();this.dog.reset();this.current=null;this.restUntil=0;this.goal=SHOW_ROUNDS[this.show!.round][0];
  if(this.goal==='fetch'){this.ball={x:this.show!.round===0?.73:.81,visible:true,side:1};this.lastThrow=this.time;this.restUntil=this.time+650}
  this.message=`Dog Show · ${this.show!.round+1}/4 · ${this.goal==='fetch'?'Fetch!':this.goal==='sit'?'Sit!':'Roll over!'}`;
 }
 private beginAction(){
  const state=encode(this.situation()),action=this.policy.choose(state,this.actions(),!!this.show);
  let to=this.dog.x,duration=850;
  if(!this.show&&(action==='idle'||action==='look'||(action==='sit'&&this.goal!=='sit')))duration=450;
  if(action==='walk'||action==='run')to=this.ball.x;
  if(action==='return')to=OWNER_X;
  if(to!==this.dog.x){duration=Math.max(500,Math.abs(to-this.dog.x)/(action==='walk'?.25:.46)*1000);this.dog.posture='stand'}
  if(action==='roll')duration=1050;
  this.current={state,action,goal:this.goal,time:this.time,elapsed:0,duration,from:this.dog.x,to,ballDistance:Math.abs(this.dog.x-this.ball.x),ownerDistance:Math.abs(this.dog.x-OWNER_X),rewarded:false,success:false};
 }
 private finishAction(){
  const step=this.current!,dog=this.dog;let reward=-.07,success=false;
  if(step.action==='walk'||step.action==='run'){dog.posture='stand';reward=.24}
  if(step.action==='pickup'){dog.holding=true;dog.posture='down';reward=.9;if(this.show)this.show.picked=true}
  if(step.action==='return'){
   dog.posture='stand';reward=dog.holding?1:step.goal==='call'?.8:-.06;
   if(this.show&&dog.holding)this.show.returned=true;
   success=step.goal==='call';
  }
  if(step.action==='drop'){
   dog.holding=false;this.ball.x=dog.x;this.ball.side=dog.facing;this.ball.visible=true;dog.posture='down';
   success=step.goal==='fetch'&&Math.abs(dog.x-OWNER_X)<.055;
   reward=success?2:-.3;
  }
  if(step.action==='sit'){dog.posture='sit';success=step.goal==='sit';if(success)reward=1}
  if(step.action==='lie'){dog.posture='lie';reward=step.goal==='roll'?.3:-.04}
  if(step.action==='look')dog.posture='look';
  if(step.action==='roll'){dog.posture='roll';success=step.goal==='roll';if(success)reward=1.6}
  step.success=success;step.time=this.time;
  if(success&&!dog.holding&&Math.abs(dog.x-OWNER_X)<.055){dog.posture='sit';dog.facing=-1}
  if(!this.show){
   this.brain.update(step.state,step.action,reward,encode(this.situation()),this.actions(),success);
   this.training.record(step);this.revision++;
   if(success){this.goal='none';this.restUntil=this.time+2400;this.message=this.training.milestone()||(step.goal==='fetch'?'He brought it back! Now is a lovely time for a treat.':step.goal==='sit'?'That’s a sit! A treat helps it stick.':step.goal==='roll'?'A little tumble! Reward that roll.':'Right here with you.')}
  }else if(success){this.show.success=true;this.show.wait=1000;this.restUntil=this.time+1000}
  this.current=null;
 }
 tick(milliseconds:number){
  if(!this.running)return;
  // Fixed, bounded steps: paused/hidden time never fast-forwards a round.
  const dt=Math.max(0,Math.min(200,milliseconds));this.time+=dt;
  if(this.show){
   const show=this.show;show.total+=dt;
   if(show.success){show.wait-=dt;if(show.wait>0)return;show.finishRound()}
   else{show.elapsed+=dt;if(show.elapsed>=SHOW_ROUNDS[show.round][1])show.finishRound()}
   if(show.round>=SHOW_ROUNDS.length){this.result=show.result();this.best=Math.max(this.best,this.result.score);this.shows++;this.revision++;this.show=null;this.showBrain=null;this.current=null;this.goal='none';this.running=false;this.message=this.result.feedback;return}
   if(show.elapsed===0){this.setupRound();return}
  }
  if(this.time<this.restUntil)return;
  // Keep the successful pose available to reward. No random actions overwrite
  // a completed fetch/trick while the player is reading the feedback.
  if(!this.show&&this.goal==='none'&&!this.current)return;
  if(!this.current){this.beginAction();return}
  const step=this.current;step.elapsed+=dt;
  this.dog.move(step.from+(step.to-step.from)*Math.min(1,step.elapsed/step.duration));
  if(step.elapsed>=step.duration)this.finishAction();
 }
 pose(){
  const action=this.current?.action;
  if(action==='walk'||action==='return')return this.dog.facing<0?8:9;
  if(action==='run')return Math.floor(this.time/180)%2?10:11;
  if(action==='pickup'||action==='drop')return 2;
  if(action==='roll')return 6;
  if(action==='sit')return 3;
  if(action==='lie')return 4;
  if(action==='look')return 1;
  if(this.time-this.lastTreat<800&&!action&&this.dog.posture!=='sit')return 15;
  return ({stand:0,sit:3,lie:4,roll:6,look:1,down:2} as const)[this.dog.posture];
 }
 behavior(){return this.current?BEHAVIOR[this.current.action]:this.dog.holding?'Holding the ball':this.dog.posture==='sit'?'Sitting':this.dog.posture==='roll'?'Belly up, very proud':this.dog.posture==='lie'?'Lying down':'Waiting for you'}
}
