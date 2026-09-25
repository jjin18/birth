# Penthouse 22

A Three.js birthday apartment for Jia and Ryan, built with Next.js, React Three Fiber and Drei. The private Sites Worker serves the exported frontend and a D1-backed shared fortune collection.

## Independent Railway hosting (no ChatGPT login)

The repository also supports a public Railway deployment. `Dockerfile` builds
the same audited frontend and packages a small Node 24 server with SQLite.
The runtime image contains only the exported client and bundled server, not
the build toolchain or historical graphics. Models are streamed from disk;
their geometry, textures, and rendering quality are unchanged.

Railway service setup:

1. Connect `jjin18/birth`, production branch `main`, with automatic deploys enabled.
   This full-history fork is the deployment repository; `supersigma-67/birth`
   remains the original upstream. The local `github` remote publishes to the fork.
2. Select the Dockerfile builder with path `Dockerfile`. Set the service start
   command to `node dist/railway/server.mjs`, health check to `/healthz`, and
   health-check timeout to 120 seconds. Do not add deprecated `railway.json`.
3. Attach a persistent volume at `/data` **before deployment** and use one replica.
   The server refuses Railway startup without `RAILWAY_VOLUME_MOUNT_PATH` so
   notes cannot silently disappear on the next deployment.
4. Generate a Railway public domain. Railway's `PORT` and `RAILWAY_PUBLIC_DOMAIN`
   are used automatically. The health check is `/healthz`.
5. After a healthy deployment, register `happybirthdayunc.com` and `www.happybirthdayunc.com`
   on that service and copy Railway's exact DNS targets into GoDaddy. Do not
   guess DNS values or switch away from the current host before verification.

Local validation: `npm run build`, `npm run test:railway`, then `npm start`.
The default local address is `http://127.0.0.1:3023`; notes live in ignored
`.local-data/`. `DATA_DIR` overrides local storage. `PUBLIC_ORIGINS` is a
comma-separated list of complete production origins; the two birthday-domain
origins are included by default.

This deployment is deliberately public: anyone with the URL can see the room
and participate in the same 200-note fortune collection. The server does not
trust OpenAI identity headers, exposes no user IDs, rejects cross-origin writes,
limits request bodies, and allows at most 12 fortune POST requests per minute
for the entire room. Existing saved notes in the old Sites D1 database must
be migrated separately before switching domains; a new SQLite file does not
automatically contain them. The legacy Sites deployment and its D1 remain intact.

For the one-time migration, set `FORTUNES_IMPORT_JSON` privately on the Railway
service to a validated array of `{ "id": 7, "openedAt": "2026-09-25T00:00:00.000Z" }`
objects exported from the old collection. The startup importer preserves those
IDs/dates without copying account identifiers, and is idempotent across restarts.
Do not commit real exported notes or deployment variable values to Git.

Adding these files does **not** connect a Railway account, enable a GitHub hook,
provision a persistent volume, or update production DNS. Those are separate
account-side steps. No paid-plan purchase or upgrade is part of the code change.

## Run

```sh
npm ci
npm run build
npx wrangler d1 migrations apply DB --local
npm run preview:shared
```

Open http://127.0.0.1:3023 for the full preview. `npm run dev` on port 3022 is frontend-only; shared fortunes require the Worker preview. Local preview data is separate from production. Never use Wrangler to deploy this Site; Sites owns production bindings and migrations.

## Implemented

- An interactive 3D apartment with bed, desk, decorative laptop, memory wall and flower table. The couch, plants and bedside table have been removed.
- An eye-level interior view with an optional room overview, physical wood/linen materials, detailed monitor/laptop/desk/chair, draped bedding, upholstered cushions, ambient occlusion and filmic lighting.
- Four cities have Dark, Day and Sunset skyline assets. Lighting is always automatic, using SunCalc with the city's coordinates and current date: sunrise to evening golden hour is Day, golden hour through civil dusk is Sunset, otherwise Dark. There is no manual lighting selector.
- Photorealistic cookie artwork and off-white paper slips with red uppercase Panda Express styling and blue end marks. Asset prompts are preserved in docs/visual-update.
- One floor lamp, on by default, smoothly toggling the room's illumination.
- The supplied dog-and-bed model with gentle breathing and a bark reaction. Clicking plays a locally synthesized double bark.
- Red 3D boxing gloves on the coffee table open Mini Fighter. The laptop no longer opens the arcade.
- Panda Express opens one of 200 authored, unique fortunes. Each draw is immediately saved to the shared paper clip. The collection is available on any device signed into this private Site.
- D1 transactions and unique IDs prevent repeats, including simultaneous draws. A request UUID makes retries idempotent. After all 200 are opened, the collection remains available without recycling notes.
- Clickable 3D paper clip and keyboard-accessible shortcuts, native dialogs, responsive controls, orbit, zoom and camera reset.
- Tokyo, New York, Taipei and San Francisco skyline backdrops. The existing Paris photograph in the sample memory wall is not a selectable skyline.
- Local Mini Fighter with character choice, movement, jumping, attacks, opponent AI, health, timer, touch controls and rematch.

## Storage and access

`db/schema.ts` defines shared opened fortunes; generated schema-only migrations are in `drizzle/`. Keep the fortune array's order and wording stable after release because saved notes reference immutable numeric IDs. There is intentionally no reset/delete endpoint.

`worker/index.ts` requires the platform-authenticated user header. The Site's existing private audience is preserved. The local preview identity is enabled only by `LOCAL_PREVIEW=1` on loopback hosts; it is not a production binding. Tests use isolated storage and never consume production fortunes.

## Deferred by request

The memory wall remains a clearly labeled preview with a pin composer; shared photo/note saving is not live. SMS and two-person access setup remain deferred. The bed only shows a visual Easter egg and sends no message. Draw Something and Our Art have been removed entirely. No Supabase project or credentials are required for the shared fortunes.

## Validation

```sh
npm run build
node scripts/fortune-check.mjs
node scripts/fortune-client-check.mjs
node scripts/fortune-panel-check.mjs
node scripts/texture-memory-check.mjs
node scripts/room-check.mjs
node scripts/smoke.mjs
```

The isolated fortune test covers all 200 draws, concurrent requests, retries, exhaustion and access guards. Browser checks require Microsoft Edge and the full preview at port 3023; they exercise physical-object clicks, room brightness, bark audio, fighter, shared notes, reload persistence and mobile layout.

The fortune client validates status, content type, JSON shape and note IDs before using a response. Empty/truncated/non-JSON responses and transient network/server failures get at most two retries with the same request ID and a 12-second per-attempt timeout; sign-in and permission errors do not loop. A confirmed saved fortune remains visible if the subsequent archive refresh fails. The client and isolated modal tests exercise these failures without changing production notes. The production database and authentication guard are unchanged.

## Assets and publication

Skyline images are original AI-generated architectural concept illustrations, not photographs. Prompts are in `docs/`, assets in `public/cities/`. The apartment and interactive objects are real 3D geometry.

`scripts/build.mjs` builds the Next.js export into `dist/client/`, the Worker into `dist/server/index.js`, and hosting metadata/migrations into `dist/.openai/`. The existing Sites identity and private URL are retained. A static-only host cannot run the shared fortunes.

## Asset budget and hosting portability

Every build runs `scripts/asset-check.mjs`. Only the six current furniture/dog GLBs, six used textures, twelve automatic city views, one existing memory-wall image, favicon, and required Draco runtime/license files may be in `public/`. The allowlist is `lib/site-assets.json`; unexpected files, missing assets, unused embedded model buffers, or removed showroom geometry fail the build. All sofa files, previous bed files (including the 4K version) and unused Paris day/sunset backgrounds are no longer shipped. Public assets total 44,364,056 bytes (42.31 MiB), of which 35,692,092 bytes are GLBs.

`scripts/prune-models.mjs --write` losslessly removes the manufacturer showroom objects already hidden at runtime and orphaned embedded buffers. It checks content hashes and the complete visible scene/material structure before writing. It does not re-encode textures or simplify meshes. Original uploads remain in their original download locations and prior Git commits; those are not deployed.

Only the currently selected city/time image is requested by the backdrop. Its previous GPU texture is disposed after a successful replacement. The other city views remain on the server because they are still selectable and needed as daylight changes. All six models are visible room objects. There is no couch preload or fallback geometry. The old procedural bed, chair and terrier loading placeholders are also removed from the source and bundle: only the current GLBs appear when ready. Browser caches and shared GPU resources are intentional, not extra objects in the room.

### Lossless graphics-memory pass

`lib/model-textures.ts` keeps the original image dimensions, mesh detail, normal/color maps, UVs, filtering, lighting and render quality. At load time it copies only the G/B bytes used by roughness/metalness maps into RG8 textures, and the R bytes used by occlusion maps into R8 textures. The material shader reads those same bytes from their new channels. Shared texture-source clones still share GPU storage. Images also used by other map types, non-opaque images and unsupported formats keep their original path. Both model loads and preloads use the same extension; the dog and lamp animation callbacks compose with it.

| Model texture budget, including mipmaps | MiB |
| --- | ---: |
| Previous seven models, including couch | 769.37 |
| Six models after removing couch | 726.71 |
| Six models with lossless channel packing | 541.37 |
| Current: channel packing + bed-only 2K textures | 445.37 |

The initial lossless pass saved about 228 MiB (29.6%) against the previous model-texture estimate. Removing the couch also eliminates 284,336 triangles and its 3,976,508-byte download. The remaining models contain 2,024,261 triangles. No remaining GLB was re-encoded or simplified in that initial pass.

The user subsequently approved reducing only the bed textures. `scripts/resize-bed-textures.mjs --write` regenerates `uploaded-bed-2k.glb` from the preserved 4K original in Git commit `54f411c8a4cb9c01e5037e0b6af84dc9d9ddecc8`. It resamples the two 4096×4096 images to 2048×2048, stores them as full-color PNG (no palette/JPEG artifacts), and verifies all non-image buffers and scene/material properties are unchanged. This reduces the bed file from 25,000,600 to 10,018,260 bytes and its packed GPU-texture estimate from 128 to 32 MiB. The original is not deployed alongside it. The combined model-texture reduction is about 324 MiB (42.1%).

`node scripts/bed-quality-check.mjs` compares the 4K and 2K bed at the actual room and bed-focus camera positions. Mean RGB differences over its projected rectangle were 0.104 and 0.115 levels out of 255; the side-by-side comparison retained the bedding folds, seams and material appearance. This bed-only resampling is not pixel-identical to 4K, and extreme close-ups can show less fine texture detail. Geometry, all other model textures, lighting and renderer quality remain unchanged. The dog and its bed now sit farther left, directly in front of the main bed and clear of the flower table.

`node scripts/texture-memory-check.mjs` loads all six actual models with the same `three-stdlib` loader used by Drei, checks every retained channel byte and texture/UV setting, verifies real R8/RG8 WebGL allocations, compares before/after rendered frames, and tests WebGL context restoration and cloned animation shader hooks. The tested frames had zero changed pixel channels. Temporary RGBA readback canvases are released immediately; packed CPU bytes remain for context restoration. The GLTF loader's original source cache is retained safely, so these numbers are a GPU texture budget, not a measurement of total browser RAM or a guaranteed device limit.

The original `worker/index.ts` still supports the private Sites runtime. The independent Railway runtime in `server/railway.ts` now supplies a SQLite adapter and explicitly selects public shared access; it never forwards client-supplied platform identity headers. Its Dockerfile and server are checked in; the service settings are documented above. Simply serving `out/` alone would still lose shared fortunes. A Railway deployment and migration of existing notes require the account-side setup described above.

Notes do not need to be frozen for performance. Keep text and image metadata in a database; store image bytes in object storage. The deferred wall implementation already follows this separation through Supabase Storage. Its present 6 MB limit is client-side only, and it loads the whole wall, so a growing wall should add server-enforced limits, resized thumbnails, lazy loading, pagination, storage quotas, and deletion/retention controls before activation. Do not embed uploaded photos into GLBs, Git, or database rows as base64.

The larger remaining risk is browser graphics memory, not fortune storage. Detailed geometry, CPU caches, render targets, shadows, skyline images and non-model textures are additional to the table above; actual driver allocation can also vary. This optimization does not guarantee stability on every low-memory mobile device. Profile target devices before promising a total memory ceiling. Only the explicitly approved bed textures have been downsampled; no lower-detail meshes or renderer-quality reduction has been applied.

Git excludes dependencies, build output, local database files, environment secrets, and QA screenshots. Git history may retain former asset versions for recovery; build artifacts contain only the current allowlisted files.
