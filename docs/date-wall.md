# Editable date wall

Public reads do not require a login. Adding photos or editing memories requires
the shared `WALL_EDIT_PASSCODE` Railway service variable (at least 16 characters).
Keep it out of Git and `NEXT_PUBLIC_*` variables. Rotating it revokes all editing
sessions. Sessions use HTTP-only, same-site cookies and last 12 hours. Click
**Lock editing** when finished, especially on a shared device.

The existing `/data` volume stores entries in the existing SQLite database and
normalized photos in `wall-images/`. No additional database service is required.
Existing seeded captions/dates are never overwritten on redeployment.

Uploads accept still JPEG, PNG, or WebP, at most 12 MiB and 32 megapixels. Only
EXIF DateTimeOriginal's calendar date is retained. Missing dates stay undated
unless entered manually. Original files, GPS, camera information, and exact
capture times are never published or retained. HEIC should be exported as JPEG.

Image processing loads on the first upload, runs one photo at a time with one
worker and no image cache, and stores a maximum 1600px WebP plus 360px thumbnail.
Thumbnails are lazy-loaded; full photos load only in the detail viewer. The 3D
board keeps its existing small, shared atlas instead of loading every upload.
Limits: 300 entries and 100 MiB of uploaded images, including pending drafts.
Unsaved photo drafts expire after 24 hours and are cleaned on the next upload.
Runtime Docker dependencies contain only Sharp and its native dependencies,
not the Next.js build toolchain.

Run `npm run build`, `node scripts/date-wall-check.mjs`, and
`node scripts/wall-check.mjs` before deploying. The API test uses a temporary
database on loopback and never touches production notes or photos.
