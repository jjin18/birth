export const ROOM_HEIGHT = 5.6;
export const cameraBounds = { minX: -4.55, maxX: 4.55, minY: .65, maxY: ROOM_HEIGHT - .4, minZ: -2.95, maxZ: 21.5 };

export function roomOpening(width: number, height: number) {
 const aspect = Math.max(.3, width / Math.max(1, height));
 const fov = aspect < .9 ? 82 : 62;
 const distance = Math.max(11.2, 3.7 + 5.7 / (Math.tan(fov * Math.PI / 360) * aspect));
 return { position: [.6, 3.6, Math.min(21, distance)] as [number, number, number], fov };
}

/** Applied after orbit damping and transitions, before drawing the frame. */
export function containRoomCamera(position: {x:number;y:number;z:number}) {
 position.x = Math.max(cameraBounds.minX, Math.min(cameraBounds.maxX, position.x));
 position.y = Math.max(cameraBounds.minY, Math.min(cameraBounds.maxY, position.y));
 position.z = Math.max(cameraBounds.minZ, Math.min(cameraBounds.maxZ, position.z));
}
