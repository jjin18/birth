# Penthouse 22

A Three.js birthday apartment for Jia and Ryan. Built with Next.js, TypeScript, React Three Fiber, and Drei.

## Run

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3022. `npm run build` creates a static production site in `out/`.

## Implemented

- A real 3D cutaway apartment: oak flooring, window wall, bed, sofa, desk, laptop, photo wall, kitchen island, Panda Express, hoodie, plants, lamps, and a breathing white dog.
- Limited orbit, zoom, reset, and animated camera views. No walking character or modeled city.
- Five generated 2D skyline textures: Tokyo, New York, Paris, Taipei, San Francisco.
- Clickable window, laptop, photo wall, and bed. Keyboard-accessible shortcuts and native accessible dialogs.
- Local 60-second drawing practice with brush colors, eraser, width, clear, pass-and-play guessing, and PNG download.
- Local Mini Fighter with character choice, movement, jumping, attacks, health, opponent AI, timer, and rematch.
- A preview memory wall with starter notes and a pin composer.
- Responsive touch controls and mobile room camera.

## Deferred by request

The user chose to finish the 3D experience before setting up Supabase. Shared wall persistence, authenticated two-person access, online drawing rooms, and SMS delivery are **not live**. The preview clearly identifies those features as unconnected. The memory composer does not claim to save content. Drawing downloads work without a backend. The bed only shows a visual Easter egg; it sends no message.

The Supabase client and image upload/read adapters are in `lib/supabase.ts`; do not enable the environment variables until the private schema, membership policies, Storage policies, and accounts are configured. The `/admin` route and online multiplayer are deferred. A future integration must use private Storage, row-level security, authenticated Realtime channels, and server-side SMS credentials plus a cooldown.

## Validation

```sh
npm run typecheck
node scripts/smoke.mjs
```

The smoke check needs Microsoft Edge and a running preview at port 3022. It checks rendering, city switching, reset, wall dialogs, drawing, fighter controls, the bed Easter egg, browser errors, and mobile overflow.

## Assets and publication

Skyline assets are original AI-generated architectural concept illustrations, not photographs. Source prompts are in `docs/skyline-prompts.json`. Runtime images are bundled in `public/cities/`; none rely on image CDNs. The apartment itself is interactive geometry, not a rendered background image.

The existing private Sites project identity is retained in `.openai/hosting.json`. The `out/` export can also be deployed to Vercel or any static host. This delivery continues the already-created private Sites URL; no Vercel project has been provisioned.
