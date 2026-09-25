# Penthouse 22

A Three.js birthday apartment for Jia and Ryan, built with Next.js, React Three Fiber and Drei. The private Sites Worker serves the exported frontend and a D1-backed shared fortune collection.

## Run

```sh
npm ci
npm run build
npx wrangler d1 migrations apply DB --local
npm run preview:shared
```

Open http://127.0.0.1:3023 for the full preview. `npm run dev` on port 3022 is frontend-only; shared fortunes require the Worker preview. Local preview data is separate from production. Never use Wrangler to deploy this Site; Sites owns production bindings and migrations.

## Implemented

- An interactive 3D apartment with bed, sofa, desk, decorative laptop, memory wall and kitchen island. Plants and bedside table have been removed.
- An eye-level interior view with an optional room overview, physical wood/linen materials, detailed monitor/laptop/desk/chair, draped bedding, upholstered cushions, ambient occlusion and filmic lighting.
- Four cities have Dark, Day and Sunset skyline assets. Lighting is always automatic, using SunCalc with the city's coordinates and current date: sunrise to evening golden hour is Day, golden hour through civil dusk is Sunset, otherwise Dark. There is no manual lighting selector.
- Photorealistic cookie artwork and off-white paper slips with red uppercase Panda Express styling and blue end marks. Asset prompts are preserved in docs/visual-update.
- One floor lamp, on by default, smoothly toggling the room's illumination.
- A white dog with breathing, blinking, head movement and tail wagging. Clicking plays a locally synthesized double bark and an excited reaction.
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
node scripts/room-check.mjs
node scripts/smoke.mjs
```

The isolated fortune test covers all 200 draws, concurrent requests, retries, exhaustion and access guards. Browser checks require Microsoft Edge and the full preview at port 3023; they exercise physical-object clicks, room brightness, bark audio, fighter, shared notes, reload persistence and mobile layout.

## Assets and publication

Skyline images are original AI-generated architectural concept illustrations, not photographs. Prompts are in `docs/`, assets in `public/cities/`. The apartment and interactive objects are real 3D geometry.

`scripts/build.mjs` builds the Next.js export into `dist/client/`, the Worker into `dist/server/index.js`, and hosting metadata/migrations into `dist/.openai/`. The existing Sites identity and private URL are retained. A static-only host cannot run the shared fortunes.

## Asset budget and hosting portability

Every build runs `scripts/asset-check.mjs`. Only the seven current furniture/dog GLBs, six used textures, twelve automatic city views, one existing memory-wall image, favicon, and required Draco runtime/license files may be in `public/`. The allowlist is `lib/site-assets.json`; unexpected files, missing assets, unused embedded model buffers, or removed showroom geometry fail the build. The previous bed/sofa files and unused Paris day/sunset backgrounds are no longer shipped.

`scripts/prune-models.mjs --write` losslessly removes the manufacturer showroom objects already hidden at runtime and orphaned embedded buffers. It checks content hashes and the complete visible scene/material structure before writing. It does not re-encode textures or simplify meshes. Original uploads remain in their original download locations and prior Git commits; those are not deployed.

Only the currently selected city/time image is requested by the backdrop. Its previous GPU texture is disposed after a successful replacement. The other city views remain on the server because they are still selectable and needed as daylight changes. All seven models are visible room objects. Browser caches and shared GPU resources are intentional, not extra objects in the room.

The current server is a Cloudflare Worker, not a Node server: `worker/index.ts` requires D1, an asset binding, and Sites-provided authentication. There is no Railway production start command. Moving it to Railway requires adapting the API/storage and real authentication; simply serving `out/` would display the room but lose shared fortunes. Never trust the Sites identity header on an arbitrary public host. No Railway deployment or database migration has been performed.

Notes do not need to be frozen for performance. Keep text and image metadata in a database; store image bytes in object storage. The deferred wall implementation already follows this separation through Supabase Storage. Its present 6 MB limit is client-side only, and it loads the whole wall, so a growing wall should add server-enforced limits, resized thumbnails, lazy loading, pagination, storage quotas, and deletion/retention controls before activation. Do not embed uploaded photos into GLBs, Git, or database rows as base64.

The larger remaining risk is browser graphics memory, not fortune storage. The current detailed models have roughly 2.3 million triangles and some 4096-pixel textures. A lossless file cleanup does not reduce their decoded geometry/texture footprint enough to guarantee low-memory mobile stability. A further quality-preserving optimization pass should profile real devices and consider texture resizing/compression and lower-detail meshes. Preserve the source uploads before any lossy optimization.

Git excludes dependencies, build output, local database files, environment secrets, and QA screenshots. Git history may retain former asset versions for recovery; build artifacts contain only the current allowlisted files.
