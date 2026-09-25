# Good Dog

Click the bedroom dog to train Fetch, Sit and Roll with treats, then try the Dog Show.
The miniature training scene is 2D; the existing 3D bedroom is paused behind the popup.

## Offline

Open `public/good-dog.html` in a desktop browser, or download it under **Help & saved dog**.
Everything is embedded in that single file. Its content policy blocks all network connections.
This is a portable offline HTML game, not a native executable. No installation is needed.

Saves stay in local browser storage. Website, offline file and different browsers have separate saves;
use Export dog / Import dog to transfer progress. If storage is blocked or a save is unreadable,
the game explains the problem and offers export without silently replacing the old save.

## Implementation

- A bounded 160-state, 10-action Float32 Q-table (6.25 KiB), with seeded exploration.
- Fetch is approach, pickup, return, drop; idle/look/sit remain possible mistakes.
- Treats reinforce the current choice and give small backwards credit to its recent sequence.
- Dog Show evaluates a cloned policy, never trains it, and scores two fetches plus two tricks.
- 10 simulation ticks per second only while running, no physics or React render loop.
- Timers stop when hidden, paused or closed; no sound, telemetry or external services.
- One compressed sprite sheet, reused from the supplied dog reference; no new dependencies.
- Game code and artwork are loaded only when opened; the offline file downloads only on request.

Run `node scripts/good-dog-check.mjs` for deterministic learning/save/show tests.
Run `node scripts/build-good-dog.mjs` to regenerate the offline file; the normal build does this too.
