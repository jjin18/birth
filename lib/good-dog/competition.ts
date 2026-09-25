import type {Goal} from './brain';
export const SHOW_ROUNDS:[Goal,number][]=[['fetch',12000],['sit',5000],['roll',7000],['fetch',12000]];
export type ShowResult={score:number;fetches:number;pickedUp:number;returned:number;tricks:number;seconds:number;feedback:string};
export class Competition{
 round=0;elapsed=0;total=0;wait=0;
 picked=false;returned=false;success=false;
 points=0;fetches=0;pickups=0;returns=0;tricks=0;speed=0;
 finishRound(){
  if(SHOW_ROUNDS[this.round][0]==='fetch'){
   this.pickups+=Number(this.picked);this.returns+=Number(this.returned);this.fetches+=Number(this.success);
   this.points+=Number(this.picked)*8+Number(this.returned)*9+Number(this.success)*13;
   if(this.success)this.speed+=5*Math.max(0,1-this.elapsed/12000);
  }else{this.tricks+=Number(this.success);this.points+=Number(this.success)*15}
  this.round++;this.elapsed=0;this.wait=0;this.picked=false;this.returned=false;this.success=false;
 }
 result():ShowResult{
  const score=Math.min(100,Math.round(this.points+this.speed));
  return {score,fetches:this.fetches,pickedUp:this.pickups,returned:this.returns,tricks:this.tricks,seconds:Math.round(this.total/1000),feedback:score>=85?'Best in show. Extremely good dog.':score>=55?'A very promising little professional.':'Big puppy energy. A few more treats and another try?'};
 }
}
