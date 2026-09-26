import {preload} from 'react-dom';
import {assetUrl} from '../asset-url';
import type {DogAssets} from './ui';

export const dogGameAssets:DogAssets={
 spriteUrl:assetUrl('/dog/poses.webp'),
 ballSpriteUrl:assetUrl('/dog/ball-poses.webp'),
 ryanUrl:assetUrl('/dog/ryan.webp'),
 ryanCrouchUrl:assetUrl('/dog/ryan-crouching.webp'),
 ryanTreatUrl:assetUrl('/dog/ryan-treat.webp'),
 tennisUrl:assetUrl('/dog/tennis-ball.webp'),
 playUrl:assetUrl('/dog/play-ball.webp'),
};

/** Start on the room click, while the camera approaches, not after modal mount.
 * React deduplicates these hints; the game still decodes before enabling play. */
export function preloadDogGameArtwork(){
 for(const [key,url] of Object.entries(dogGameAssets)){
  preload(url,{as:'image',fetchPriority:key==='spriteUrl'||key==='tennisUrl'?'high':'auto'});
 }
}
