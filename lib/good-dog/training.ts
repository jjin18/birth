import type {Action,DogBrain,Goal} from './brain';
export const SKILLS=['fetch','sit','roll'] as const;
export type Skill=typeof SKILLS[number];
export type SkillProgress={successes:number;rewards:number;announced:boolean};
export type Credit={state:number;action:Action;goal:Goal;time:number;rewarded:boolean;success:boolean};
export class TrainingManager{
 skills:Record<Skill,SkillProgress>={fetch:{successes:0,rewards:0,announced:false},sit:{successes:0,rewards:0,announced:false},roll:{successes:0,rewards:0,announced:false}};
 recent:Credit[]=[];
 record(credit:Credit){
  this.recent.push(credit);if(this.recent.length>5)this.recent.shift();
  if(credit.success&&SKILLS.includes(credit.goal as Skill)){
   const skill=this.skills[credit.goal as Skill];skill.successes=Math.min(9999,skill.successes+1);
   if(credit.rewarded)skill.rewards=Math.min(9999,skill.rewards+1);
  }
 }
 treat(brain:DogBrain,credit:Credit){
  if(credit.rewarded)return false;
  credit.rewarded=true;brain.reinforce(credit.state,credit.action,2.4);
  // Small backwards credit helps the approach → pickup → return → drop chain.
  let weight=.65;
  for(let i=this.recent.length-1;i>=0;i--){const earlier=this.recent[i];if(earlier===credit)continue;if(earlier.goal!==credit.goal||credit.time-earlier.time>8000)break;brain.reinforce(earlier.state,earlier.action,weight);weight*=.55}
  if(credit.success&&SKILLS.includes(credit.goal as Skill)){const skill=this.skills[credit.goal as Skill];skill.rewards=Math.min(9999,skill.rewards+1)}
  return true;
 }
 level(skill:Skill){const p=this.skills[skill];return p.successes>=3&&p.rewards>=2?3:p.successes>=2?2:p.successes+p.rewards>0?1:0}
 milestone(){for(const skill of SKILLS){const p=this.skills[skill];if(!p.announced&&this.level(skill)===3){p.announced=true;return `Your dog learned ${skill==='roll'?'Roll Over':skill[0].toUpperCase()+skill.slice(1)}!`}}return ''}
}
