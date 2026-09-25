import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import sharp from 'sharp';
const photos=JSON.parse(await readFile('lib/date-wall-data.json','utf8'));
assert.equal(photos.length,11);assert.equal(new Set(photos.map(p=>p.id)).size,11);assert(!photos.some(p=>p.id==='dinner-close'));assert(photos.some(p=>p.id==='dinner'));
assert.deepEqual([...new Set(photos.map(p=>p.date))],['2026-05-30','2026-08-29','2026-09-11','2026-09-15','2026-09-19',null]);
assert.deepEqual(photos.filter(p=>!p.date).map(p=>p.id),['curry','seafood','burger']);
assert.equal(photos.filter(p=>p.date==='2026-09-11').length,3);
let bytes=0;
const assets=JSON.parse(await readFile('lib/site-assets.json','utf8')).memoryWallImages;
assert.deepEqual(new Set(assets),new Set([...photos.flatMap(p=>[p.src.slice(1),p.thumbnail.slice(1)]),'memories/wall-atlas.webp']));
for(const file of assets){
 const path='public/'+file,meta=await sharp(path).metadata();bytes+=(await stat(path)).size;
 assert(!meta.exif&&!meta.xmp&&!meta.iptc,'no capture, location or device metadata in web files');
 assert.equal(meta.format,'webp');assert(Math.max(meta.width,meta.height)<=1600);
 if(file.includes('-thumb'))assert(Math.max(meta.width,meta.height)<=480);
}
assert(bytes<3_000_000,'all date-wall assets must remain below 3 MB');
const atlas=await sharp('public/memories/wall-atlas.webp').metadata();assert.equal(atlas.width,384);assert.equal(atlas.height,256);
const board=await readFile('components/Penthouse/DateWallPhotos.tsx','utf8');assert(board.includes('generateMipmaps=false'));assert(!board.includes('.clone()'),'five pins share one texture');
const component=await readFile('components/WallPanel.tsx','utf8');assert(!/supabase|SharedAccess|sample:|Pin something/.test(component));
assert(component.includes('loading="lazy"')&&component.includes('photo.thumbnail')&&component.includes('src={photo.src}'));
const experience=await readFile('components/Experience.tsx','utf8');assert(experience.includes("const WallPanel = dynamic(() => import('./WallPanel')"));
assert(!JSON.stringify(photos).match(/GPS|Make|Model|Serial|OffsetTime|taken|Downloads/));
console.log(`PASS: 11 photos, duplicate removed, five confirmed date groups, three undated, sanitized metadata, lazy thumbnails/full-size viewer, ${bytes} bytes; one 384×256 board atlas (0.375 MiB RGBA).`);
