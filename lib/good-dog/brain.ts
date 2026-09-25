export const ACTIONS=['idle','walk','run','pickup','return','drop','sit','lie','look','roll'] as const;
export type Action=typeof ACTIONS[number];
export const GOALS=['none','fetch','call','sit','roll'] as const;
export type Goal=typeof GOALS[number];
export const STATE_COUNT=GOALS.length*32;
export const VALUE_COUNT=STATE_COUNT*ACTIONS.length;
export type Situation={goal:Goal;ballVisible:boolean;holding:boolean;nearBall:boolean;nearOwner:boolean;lying:boolean};
export function encode(s:Situation){return GOALS.indexOf(s.goal)*32+Number(s.ballVisible)+2*Number(s.holding)+4*Number(s.nearBall)+8*Number(s.nearOwner)+16*Number(s.lying)}

/** A 6.25 KiB table, not an AI model. No work happens outside game ticks. */
export class DogBrain{
 readonly values=new Float32Array(VALUE_COUNT);
 readonly visits=new Uint16Array(STATE_COUNT);
 seed:number;
 constructor(seed=0x6d616c74){this.seed=seed>>>0||1}
 random(){let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296}
 value(state:number,action:Action){return this.values[state*ACTIONS.length+ACTIONS.indexOf(action)]}
 choose(state:number,available:Action[],evaluating=false):Action{
  const explore=evaluating?.09:Math.max(.1,.48/(1+this.visits[state]/14));
  if(this.random()<explore)return available[Math.floor(this.random()*available.length)];
  let best=-Infinity,choices:Action[]=[];
  for(const action of available){const value=this.value(state,action);if(value>best+.0001){best=value;choices=[action]}else if(Math.abs(value-best)<.0001)choices.push(action)}
  return choices[Math.floor(this.random()*choices.length)];
 }
 update(state:number,action:Action,reward:number,nextState:number,nextActions:Action[],terminal=false){
  const index=state*ACTIONS.length+ACTIONS.indexOf(action);
  const future=terminal?0:Math.max(0,...nextActions.map(a=>this.value(nextState,a)));
  this.values[index]=Math.max(-8,Math.min(16,this.values[index]+.28*(reward+.76*future-this.values[index])));
  this.visits[state]=Math.min(65535,this.visits[state]+1);
 }
 reinforce(state:number,action:Action,reward:number){const index=state*ACTIONS.length+ACTIONS.indexOf(action);this.values[index]=Math.min(16,this.values[index]+.45*reward)}
 clone(){const copy=new DogBrain(this.seed);copy.values.set(this.values);copy.visits.set(this.visits);return copy}
}
