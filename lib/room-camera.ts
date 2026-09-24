export const ROOM_HEIGHT = 5.6;
export const cameraBounds = { minX: -4.55, maxX: 4.55, minY: .65, maxY: ROOM_HEIGHT - .4, minZ: -2.95, maxZ: 8.7 };

export function roomOpening(width: number, _height: number) {
 const mobile = width < 650;
 return { position: (mobile ? [3.9, 2.4, 6.1] : [4.4, 2.35, 5.4]) as [number, number, number], fov: mobile ? 78 : 59 };
}

/** Applied after orbit damping and transitions, before drawing the frame. */
export function containRoomCamera(position: {x:number;y:number;z:number}) {
 position.x = Math.max(cameraBounds.minX, Math.min(cameraBounds.maxX, position.x));
 position.y = Math.max(cameraBounds.minY, Math.min(cameraBounds.maxY, position.y));
 position.z = Math.max(cameraBounds.minZ, Math.min(cameraBounds.maxZ, position.z));
}
