export const cities = [
 {id:'tokyo',name:'Tokyo',country:'JAPAN',zone:'Asia/Tokyo',latitude:35.6762,longitude:139.6503,coordinates:'35.6762° N, 139.6503° E',color:'#b29abc',weather:'A little closer to tomorrow.'},
 {id:'new-york',name:'New York',country:'UNITED STATES',zone:'America/New_York',latitude:40.7128,longitude:-74.006,coordinates:'40.7128° N, 74.0060° W',color:'#8faccc',weather:'The city can wait.'},
 {id:'paris',name:'Paris',country:'FRANCE',zone:'Europe/Paris',latitude:48.8566,longitude:2.3522,coordinates:'48.8566° N, 2.3522° E',color:'#d3ae81',weather:'Same us. A different view.'},
 {id:'taipei',name:'Taipei',country:'TAIWAN',zone:'Asia/Taipei',latitude:25.033,longitude:121.5654,coordinates:'25.0330° N, 121.5654° E',color:'#93bbc0',weather:'Stay a little longer.'},
 {id:'san-francisco',name:'San Francisco',country:'UNITED STATES',zone:'America/Los_Angeles',latitude:37.7749,longitude:-122.4194,coordinates:'37.7749° N, 122.4194° W',color:'#e0a08c',weather:'Somewhere between now and someday.'}
] as const;
export type City = typeof cities[number];
export type Focus = 'home'|'window'|'gloves'|'wall'|'bed'|'fortune'|'paperclip';
