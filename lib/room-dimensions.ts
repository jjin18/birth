export const INTERIOR_WINDOW_TOP = 5.15;

export function windowDimensions(interior: boolean) {
 const bottom = .24, top = interior ? INTERIOR_WINDOW_TOP : 3.34;
 const height = top - bottom;
 // Match the 3:2 city images to the window without stretching buildings.
 const cropHeight = height * 1.5 / 10.02;
 return { top, bottom, height, center: (top + bottom) / 2, cropHeight };
}
