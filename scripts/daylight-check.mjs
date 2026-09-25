import assert from 'node:assert/strict';
import { build } from 'esbuild';
const module=await build({stdin:{contents:"export * from './lib/daylight'; export {cities,formatCityTime} from './lib/cities';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {cities,formatCityTime,getDaylight,skylinePath}=await import('data:text/javascript;base64,'+Buffer.from(module.outputFiles[0].text).toString('base64'));
const zones={tokyo:['+09:00','+09:00'],'new-york':['-05:00','-04:00'],taipei:['+08:00','+08:00'],'san-francisco':['-08:00','-07:00']};
assert.deepEqual(cities.map(city=>city.id),['san-francisco','new-york','taipei','tokyo'],'requested west-to-east toggle order');
for(const [instant,expected] of [
 ['2026-01-15T16:00:00Z',['08:00','11:00','00:00','01:00']],
 ['2026-07-15T16:00:00Z',['09:00','12:00','00:00','01:00']],
 ['2026-03-08T09:59:00Z',['01:59','05:59','17:59','18:59']],
 ['2026-03-08T10:00:00Z',['03:00','06:00','18:00','19:00']]
])assert.deepEqual(cities.map(city=>formatCityTime(city,new Date(instant))),expected,'local clocks, midnight and DST');
assert.equal(formatCityTime(cities[0],null),'--:--','stable server/initial-client placeholder');
for(const city of cities){
 const durations=[];
 for(const [index,day] of ['2026-01-15','2026-07-15'].entries()){
  const offset=zones[city.id][index],noon=new Date(`${day}T12:00:00${offset}`),midnight=new Date(`${day}T00:15:00${offset}`);
  const schedule=getDaylight(city,noon);
  assert.equal(schedule.mode,'day',city.id+' noon');assert.equal(getDaylight(city,midnight).mode,'dark',city.id+' midnight');
  assert.equal(getDaylight(city,new Date(schedule.sunrise.getTime()-1000)).mode,'dark');
  assert.equal(getDaylight(city,new Date(schedule.sunrise.getTime()+1000)).mode,'day');
  assert.equal(getDaylight(city,new Date(schedule.goldenHour.getTime()-1000)).mode,'day');
  assert.equal(getDaylight(city,new Date(schedule.goldenHour.getTime()+1000)).mode,'sunset');
  assert.equal(getDaylight(city,schedule.sunset).mode,'sunset');
  assert.equal(getDaylight(city,new Date(schedule.dusk.getTime()+1000)).mode,'dark');
  durations.push((schedule.sunset-schedule.sunrise)/3600000);
 }
 assert(durations[1]>durations[0]+2,'seasonal daylight should vary: '+city.id);
 for(const mode of ['day','sunset','dark'])assert(skylinePath(city,mode).startsWith(`/cities/${city.id}`));
 console.log(city.name,'winter/summer daylight:',durations.map(n=>n.toFixed(2)).join(' / '),'hours');
}
for(const date of ['2026-03-08T12:00:00-04:00','2026-11-01T12:00:00-05:00'])assert.equal(getDaylight(cities[1],new Date(date)).mode,'day','New York DST boundary');
for(const date of ['2026-03-08T12:00:00-07:00','2026-11-01T12:00:00-08:00'])assert.equal(getDaylight(cities.find(city=>city.id==='san-francisco'),new Date(date)).mode,'day','San Francisco DST boundary');
assert.notEqual(getDaylight(cities.find(city=>city.id==='tokyo'),new Date('2026-09-24T03:00:00Z')).mode,getDaylight(cities[1],new Date('2026-09-24T03:00:00Z')).mode,'each city must use its own sun position at the same instant');
console.log('PASS: 4 cities × 3 automatic sky modes, seasonal changes, sunrise/golden-hour/dusk boundaries, DST and same-instant differences.');
