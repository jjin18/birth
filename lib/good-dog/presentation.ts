import {OWNER_X,type GameWorld} from './world';

// Background-free sprites are packed into equal cells with one shared baseline.
// Captions are removed from the source artwork, not hidden by a blurry mask.
export const POSE_ROWS = [{top:0,height:216},{top:216,height:216},{top:432,height:216},{top:648,height:216}] as const;
/** Read-only sound availability; never changes the learned policy or rewards. */
export function canBark(world:GameWorld){
 return world.goal!=='fetch'&&!world.dog.holding&&world.time-world.lastThrow>=650&&world.time-world.lastTreat>=1100;
}
// The supplied petting artwork contains BOTH subjects. Use it only at Ryan's
// return spot, at rest and empty-mouthed: never teleport a chasing/carrying dog.
export function isPettingReward(world:GameWorld){
 return !world.show&&world.time-world.lastTreat<1100&&!world.dog.holding&&Math.abs(world.dog.x-OWNER_X)<.008&&
  (!world.current||['idle','sit','look'].includes(world.current.action));
}
export function dogSprite(world:GameWorld){
 const action=world.current?.action;
 if(action==='drop')return {sheet:'ball',pose:15,mirror:world.dog.facing<0};
 if(world.dog.holding){
  if(action==='return'||action==='walk'||action==='run')return {sheet:'ball',pose:world.dog.facing<0?12:13,mirror:false};
  return {sheet:'ball',pose:14,mirror:world.dog.facing<0};
 }
 const pose=world.pose();
 return {sheet:'tricks',pose,mirror:world.dog.facing<0&&pose!==8};
}
export function fetchPhase(world:GameWorld){
 if(world.show?.success&&world.goal==='fetch')return 'reward';
 if(world.goal==='fetch')return world.dog.holding?'return':'fetch';
 if(!world.show&&world.goal==='none'&&world.ball.visible&&world.treatCredit?.success&&world.treatCredit.goal==='fetch')return 'reward';
 return 'aim';
}
export function activityLabel(world:GameWorld){
 if(world.show)return 'Dog show';
 if(world.started&&!world.running)return world.result?'Show complete':'Taking a breather';
 if(world.goal==='fetch')return world.dog.holding?'Bring it back':'Fetch practice';
 if(world.goal==='sit')return 'Sit practice';
 if(world.goal==='roll')return 'Roll practice';
 if(world.goal==='call')return 'Come here';
 return world.treatCredit?.success?'Good dog!':'Ready to play';
}
export function feedback(world:GameWorld){
 if(!world.running&&world.started)return world.result?world.result.feedback:'Paused. Resume whenever you’re ready.';
 if(world.show)return world.message;
 if(world.time-world.lastTreat<1800)return world.message;
 const action=world.current?.action,credit=world.treatCredit;
 if(world.goal==='fetch'){
  if(world.time-world.lastThrow<650)return 'Go get it! Watch for a good move, then reward it.';
  if(action==='drop')return 'Delivery for Ryan! Give a treat when the ball comes back.';
  if(world.dog.holding)return action==='return'?'Bringing it to Ryan! Reward the return with a treat.':'He’s got it! Call him back, or reward the pickup.';
  if(action==='walk'||action==='run')return 'He’s chasing it! Give a treat now to encourage fetching.';
  if(action==='pickup')return 'Found it! He’s picking up the tennis ball.';
  return 'A little distracted. Wait for a chase or pickup, then give a treat.';
 }
 if(credit?.success&&!credit.rewarded)return credit.goal==='fetch'?'He brought it back! Reward with a treat, then throw again.':credit.goal==='sit'?'That’s a sit! Give a treat to teach him to do it again.':credit.goal==='roll'?'A perfect little tumble! Reward that roll.':'Back with Ryan. Try a throw or a trick.';
 if(world.goal==='sit')return 'You asked him to sit. Reward him when his bottom hits the grass.';
 if(world.goal==='roll')return action==='lie'?'Lying down is the first step — a treat encourages the roll.':'You asked for a roll. Wait for a tumble, then give a treat.';
 if(world.goal==='call')return 'Come here! A treat rewards coming back to Ryan.';
 if(world.goal==='none'&&world.dog.posture==='sit')return 'Sitting beside Ryan. Try another throw, Sit or Roll when you’re ready.';
 return world.started?'Try another throw, or teach Sit and Roll. He remembers what you reward.':'Click the grass to aim, or Throw ball. Treats teach him which moves to repeat.';
}
/** A short physical-looking arc followed by one small bounce; no orbiting ball. */
export function ballFlight(world:GameWorld,time=world.time){
 const t=Math.max(0,Math.min(1,(time-world.lastThrow)/650));
 return {x:OWNER_X+(world.ball.x-OWNER_X)*t,lift:t===1?0:t<.8?Math.sin(t/.8*Math.PI)*52:Math.sin((t-.8)/.2*Math.PI)*8,airborne:t<1};
}
