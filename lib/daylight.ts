import { getTimes } from 'suncalc';
import type { City } from './cities';

export type SkyMode = 'day' | 'sunset' | 'dark';
export type SkyChoice = 'auto' | SkyMode;
export const skyLabels: Record<SkyMode,string> = {day:'Day',sunset:'Sunset',dark:'Dark'};

/** Expected clear-sky daylight, not live weather. UTC instants make this independent
 * of the viewer's timezone; city coordinates and the date account for the seasons.
 * Sunset spans evening golden hour through civil dusk. Morning starts at sunrise.
 */
export function getDaylight(city:Pick<City,'latitude'|'longitude'>,now:Date) {
 const times=getTimes(now,city.latitude,city.longitude);
 const moment=now.getTime();
 let mode:SkyMode='dark';
 if(times.alwaysUp)mode='day';
 else if(times.goldenHour&&times.dusk&&moment>=times.goldenHour.getTime()&&moment<times.dusk.getTime())mode='sunset';
 else if(times.sunrise&&times.goldenHour&&moment>=times.sunrise.getTime()&&moment<times.goldenHour.getTime())mode='day';
 return {mode,sunrise:times.sunrise,sunset:times.sunset,dusk:times.dusk,goldenHour:times.goldenHour};
}

export function skylinePath(city:Pick<City,'id'>,mode:SkyMode) {
 return mode==='dark'?`/cities/${city.id}.jpg`:`/cities/${city.id}-${mode}.jpg`;
}

export const skyAtmosphere:Record<SkyMode,{color:string;windowLight:number;ambient:number;hemisphere:number;environment:number}>={
 day:{color:'#c7e3fa',windowLight:4.6,ambient:.32,hemisphere:.7,environment:.10},
 sunset:{color:'#ffb376',windowLight:2.8,ambient:.12,hemisphere:.3,environment:.045},
 dark:{color:'#8799cc',windowLight:.55,ambient:0,hemisphere:0,environment:0},
};
