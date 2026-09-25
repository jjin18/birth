export const cities = [
 {id:'san-francisco',name:'San Francisco',country:'UNITED STATES',zone:'America/Los_Angeles',latitude:37.7749,longitude:-122.4194,coordinates:'37.7749° N, 122.4194° W',color:'#e0a08c',weather:'Somewhere between now and someday.'},
 {id:'new-york',name:'New York',country:'UNITED STATES',zone:'America/New_York',latitude:40.7128,longitude:-74.006,coordinates:'40.7128° N, 74.0060° W',color:'#8faccc',weather:'The city can wait.'},
 {id:'taipei',name:'Taipei',country:'TAIWAN',zone:'Asia/Taipei',latitude:25.033,longitude:121.5654,coordinates:'25.0330° N, 121.5654° E',color:'#93bbc0',weather:'Stay a little longer.'},
 {id:'tokyo',name:'Tokyo',country:'JAPAN',zone:'Asia/Tokyo',latitude:35.6762,longitude:139.6503,coordinates:'35.6762° N, 139.6503° E',color:'#b29abc',weather:'A little closer to tomorrow.'}
] as const;
export type City = typeof cities[number];
const cityClocks = new Map(cities.map(city => [city.zone, new Intl.DateTimeFormat('en-GB', {
 timeZone: city.zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
})]));
export function formatCityTime(city: City, now: Date | null) {
 return now ? cityClocks.get(city.zone)!.format(now) : '--:--';
}
export type Focus = 'home'|'window'|'gloves'|'wall'|'bed'|'chair'|'fortune'|'paperclip'|'laptop'|'dog';
