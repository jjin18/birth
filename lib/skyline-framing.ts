import type { City } from './cities';
import type { SkyMode } from './daylight';
import { windowDimensions } from './room-dimensions';

// Distant water/ground line, measured from the top of each existing image.
// Anchor the landscape itself rather than the tops of differently sized towers.
export const skylineHorizons:Record<City['id'],Record<SkyMode,number>>={
 'san-francisco':{day:.55,sunset:.55,dark:.55},
 'new-york':{day:.535,sunset:.535,dark:.535},
 taipei:{day:.545,sunset:.55,dark:.545},
 // Tokyo's distant ground sits below the tower tops; using .50 made the
 // landscape sag by roughly a tenth of the outside window on city changes.
 tokyo:{day:.55,sunset:.525,dark:.545},
};
export const SKYLINE_HORIZON_FROM_BOTTOM=.35;

/** UV-only framing: consistent eye level and building scale, no new textures. */
export function skylineCrop(city:City['id'],mode:SkyMode,interior:boolean){
 const height=windowDimensions(interior).cropHeight;
 const bottom=1-skylineHorizons[city][mode]-height*SKYLINE_HORIZON_FROM_BOTTOM;
 return {height,bottom};
}
