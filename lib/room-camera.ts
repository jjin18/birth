export const ROOM_HEIGHT = 5.6;
export const cameraBounds = { minX: -4.55, maxX: 4.55, minY: .65, maxY: ROOM_HEIGHT - .4, minZ: -2.95, maxZ: 8.7 };

export function roomOpening(width: number, _height: number) {
 const mobile = width < 650;
 return { position: (mobile ? [3.9, 2.4, 6.1] : [4.4, 2.35, 5.4]) as [number, number, number], fov: mobile ? 78 : 59 };
}

type Point = { x:number; y:number; z:number };
type Coordinates = [number,number,number];
export function roomHomeView(interior:boolean,width:number,height:number) {
 return {
  position:interior ? roomOpening(width,height).position : [11,9,14] as Coordinates,
  target:(interior ? [-.45,1.25,-.7] : width<650 ? [-.2,.3,0] : [-2,.55,0]) as Coordinates,
  zoom:interior ? 1 : width<650 ? width/13.6 : Math.min(width/17,100),
 };
}

/** Small tolerances keep the reset button steady during damping/settling. */
export function roomViewIsAway(position:Point,target:Point,zoom:number,home:ReturnType<typeof roomHomeView>) {
 const distanceSquared=(point:Point,reference:Coordinates)=>(point.x-reference[0])**2+(point.y-reference[1])**2+(point.z-reference[2])**2;
 return distanceSquared(position,home.position)>.04**2 || distanceSquared(target,home.target)>.04**2 || Math.abs(zoom/home.zoom-1)>.0015;
}

/** Applied after orbit damping and transitions, before drawing the frame. */
export function containRoomCamera(position: {x:number;y:number;z:number}) {
 position.x = Math.max(cameraBounds.minX, Math.min(cameraBounds.maxX, position.x));
 position.y = Math.max(cameraBounds.minY, Math.min(cameraBounds.maxY, position.y));
 position.z = Math.max(cameraBounds.minZ, Math.min(cameraBounds.maxZ, position.z));
}
