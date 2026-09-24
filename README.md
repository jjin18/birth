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
- Each city has Dark, Day and Sunset skyline assets. Auto uses SunCalc with the city's coordinates and current date: sunrise to evening golden hour is Day, golden hour through civil dusk is Sunset, otherwise Dark. The clock uses the city's timezone, including daylight saving time. Manual sky previews are available.
- Photorealistic cookie artwork and off-white paper slips with red uppercase Panda Express styling and blue end marks. Asset prompts are preserved in docs/visual-update.
- One floor lamp, on by default, smoothly toggling the room's illumination.
- A white dog with breathing, blinking, head movement and tail wagging. Clicking plays a locally synthesized double bark and an excited reaction.
- Red 3D boxing gloves on the coffee table open Mini Fighter. The laptop no longer opens the arcade.
- Panda Express opens one of 200 authored, unique fortunes. Each draw is immediately saved to the shared paper clip. The collection is available on any device signed into this private Site.
- D1 transactions and unique IDs prevent repeats, including simultaneous draws. A request UUID makes retries idempotent. After all 200 are opened, the collection remains available without recycling notes.
- Clickable 3D paper clip and keyboard-accessible shortcuts, native dialogs, responsive controls, orbit, zoom and camera reset.
- Tokyo, New York, Paris, Taipei and San Francisco skyline backdrops.
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
