import type {FighterName} from './fighter-game';
export const SCORE_KEY='birthday-boxing-wins-v1';
export type Scores=Record<FighterName,number>;
export function parseScores(raw:string|null):Scores{
 try{const value=JSON.parse(raw||'null');if(value&&['Jia','Ryan'].every(name=>Number.isSafeInteger(value[name])&&value[name]>=0&&value[name]<=1_000_000))return {Jia:value.Jia,Ryan:value.Ryan}}catch{}
 return {Jia:0,Ryan:0};
}
export function matchWinner(result:string):FighterName|null{return result==='Jia wins'?'Jia':result==='Ryan wins'?'Ryan':null}
export function addWin(scores:Scores,winner:FighterName|null):Scores{return winner?{...scores,[winner]:Math.min(1_000_000,scores[winner]+1)}:scores}
