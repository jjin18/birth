export type Posture='stand'|'sit'|'lie'|'roll'|'look'|'down';
export class Dog{
 x=.25;
 facing=1;
 holding=false;
 posture:Posture='stand';
 move(x:number){if(Math.abs(x-this.x)>.0001)this.facing=x<this.x?-1:1;this.x=Math.max(.12,Math.min(.86,x))}
 reset(){this.x=.25;this.facing=1;this.holding=false;this.posture='stand'}
}
