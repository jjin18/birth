# Dog RL environment

Click the bedroom dog to train Fetch, Sit and Roll with treats, then try the Dog Show.
The primary controls are Throw ball and Reward with treat. Click the grass to aim.
Contextual feedback explains what to reward; stable activity labels hide micro-decisions.
Ryan stands before play and crouches during training. Calling turns the dog toward Ryan,
including when already close. Completed tasks leave the dog seated beside him, with
the successful action still available to reward. The bedroom pauses behind the popup.

## Runtime

- Bounded 160-state, 10-action Float32 Q-table (6.25 KiB), with seeded exploration.
- Fetch is approach, pickup, return, drop; irrelevant choices remain possible.
- Treats reinforce the current choice and give backwards credit to the recent sequence.
- Dog Show evaluates a cloned policy without training it, scoring two fetches and two tricks.
- 10 simulation ticks per second only while running; no physics or React render loop.
- Timers stop when hidden, paused or closed. No sound, telemetry, network services or account.
- Existing version-1 browser-local saves remain compatible. Save/export/import UI is removed.
- Invalid saves are preserved rather than overwritten. Learning automatically saves locally.
- Code and sprites load only when the dog popup opens. Seven WebP assets total under 250 KB.

`public/good-dog.html` is still generated as a self-contained, under-370-KB offline HTML
artifact with network-blocking CSP. It is not a native executable or linked from the game.
Its browser-local learning is separate from the website's origin.

## Artwork and transparency

- `public/dog/poses.webp`: 16 transparent poses, equal 384×216 logical cells.
- `public/dog/ball-poses.webp`: four carrying/drop poses, one row, same baseline.
- `public/dog/tennis-ball.webp` and `play-ball.webp`: packed from the user's September 25,
  03_03_15 PM transparent artwork. The play bow is scaled to the same body size.
- `public/dog/ryan.webp` and `ryan-crouching.webp`: the user's 03_19_43 PM and 03_15_41 PM
  standing/crouching artwork, respectively. These replace the earlier boxing pose.

The built-in image editor (not CLI) removed background and captions from the two dog
reference sheets. The resulting transparent sprites were cropped, baseline-aligned,
scaled and WebP-compressed for the app. No blurry CSS mask remains; grass is a separate
static CSS/SVG layer. Carrying art already contains the ball, so no duplicate ball is drawn.

`public/dog/ryan-treat.webp` packages the user's 03_32_23 PM petting reference.
Ryan and the puppy share its proportions and grass baseline. The combined reward pose
appears for 1.1 seconds only at Ryan's return spot, with the heart retained. Mid-fetch
rewards keep the carrying artwork, and neither reward changes the ball coordinates.
Ground-ball visibility/position is world state, never derived from training feedback;
show rounds reset throws without interpolating from a previous round's ball position.

Final edit prompt (applied to each reference sheet):

> Remove only the gray background, ground shadows, printed captions/numbers and label
> circles. Make those areas genuinely transparent with alpha, not a painted checkerboard.
> Preserve every dog and held tennis ball intact: same fur, eyes, poses, anatomy,
> orientations, tails, paws, scales and original four-column/four-row layout. No redesign,
> shifted sprites, cropped fur or recoloring. Clean smooth edges without a gray halo.

## Checks

`node scripts/good-dog-check.mjs`: deterministic learning, shows, save compatibility and budgets.
`node scripts/dog-presentation-check.mjs`: carry poses, turning, settled sitting, feedback,
tennis arc, delayed rewards and the room dog's clock-reset deformation regression.
`node scripts/build-good-dog.mjs`: regenerate the offline artifact (also part of normal build).
