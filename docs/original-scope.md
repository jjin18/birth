# PENTHOUSE 22 — Full Technical & Product Scope

## 0. Product concept

**Penthouse 22** is a small interactive 3D birthday website built as a digital representation of a future apartment.

The user enters a beautiful high-rise penthouse at night. The apartment contains personal details, a changing city skyline, a laptop with games, and a collaborative photo wall.

The central idea is:

> **One room. Many cities. A lot of future.**

It should feel like a **digital gift**, not a conventional website.

The experience should be intimate, playful, slightly funny, and visually polished.

---

# 1. Core experience

The user lands on a full-screen 3D penthouse.

### Camera

Third-person / architectural camera.

The user can:

* orbit slightly around the room
* zoom
* click important objects
* return to the default camera position

There is **no free-roaming character**.

This dramatically reduces complexity and keeps the scene visually composed.

---

# 2. The penthouse

## Environment

One primary room.

### Required objects

* Floor
* Walls
* Ceiling
* Large floor-to-ceiling windows
* Bed
* Desk
* Laptop
* Photo wall
* Kitchen counter
* Panda Express food/container
* Hoodie
* White dog
* Minimal furniture
* Plants
* Lamps
* Small decorative objects

### White dog

The dog is **not interactive**.

It sits or lies somewhere in the apartment.

Optional:

* breathing animation
* blinking
* subtle tail movement

No:

* walking
* pathfinding
* AI
* dialogue
* interaction

The joke is simply that there is a white dog living in the penthouse.

---

# 3. Visual style

Target:

**stylized, warm, cinematic 3D**

Not photorealistic.

Think:

* high-end architectural visualization
* slightly stylized game environment
* warm interior lighting
* nighttime city
* soft reflections
* subtle depth of field
* clean typography

Avoid making it look like:

* a generic Three.js demo
* a cartoon game
* a corporate website
* an overly elaborate VR environment

The room should feel expensive and calm.

---

# 4. City system

The exterior view changes while the apartment remains identical.

### Cities

1. Tokyo
2. New York
3. Paris
4. Seoul
5. San Francisco

No Singapore.

### City selector

A small UI element at the bottom:

```text
TOKYO   NEW YORK   PARIS   SEOUL   SAN FRANCISCO
```

Selecting a city changes:

* skyline
* sky
* exterior lighting
* atmospheric effects
* optional weather

The interior doesn't change.

---

## Technical implementation

**Do not model the cities in 3D.**

Use high-resolution skyline images or short looping videos behind the window.

Conceptually:

```ts
City {
  id
  name
  skylineAsset
  skyAsset
  lighting
  weather
}
```

The window is essentially a portal to a different background.

---

# 5. Window interaction

The window is the main symbolic object.

Clicking it can trigger a subtle camera move toward the glass.

A small message appears:

> **You said you wanted a high-rise in every major city.**

Then:

> **So here's one.**

The message disappears and the user returns to the room.

This should only happen occasionally / once per session so it doesn't become annoying.

---

# 6. Interactive object architecture

Only four objects are major interactions:

```text
WINDOW
   ↓
Cities / future

LAPTOP
   ↓
Games

PHOTO WALL
   ↓
Shared memories / messages

BED
   ↓
Funny SMS Easter egg
```

Everything else is environmental decoration.

This constraint is important.

---

# 7. Laptop

The laptop is the **arcade**.

Clicking it moves the camera toward the desk and opens a 2D HTML interface over the 3D scene.

Do **not** build the laptop UI as actual 3D geometry.

Use normal React/HTML for the interface.

---

# 8. Laptop home screen

```text
┌─────────────────────────────┐
│                             │
│       JIA + RYAN ARCADE     │
│                             │
│       🎨 DRAW SOMETHING     │
│                             │
│       🥊 MINI FIGHTER       │
│                             │
│       📸 OUR ART            │
│                             │
└─────────────────────────────┘
```

---

# 9. Game 1 — Draw Something

This is the **only actual multiplayer feature**.

The goal is intentionally simple.

## Game flow

Player creates a room.

```text
CREATE GAME
```

System generates:

```text
ROOM CODE

7X4K
```

Other player enters:

```text
JOIN GAME
```

Then:

> **JIA HAS JOINED**

---

## Prompt

One player receives a drawing prompt.

Examples:

* Panda Express
* Tokyo
* Your dream apartment
* A ridiculous date
* A dog
* Something Jia likes
* Something Ryan likes
* Your future
* Draw me

The prompt is hidden from the other player.

---

## Drawing

Canvas:

```text
┌───────────────────────┐
│                       │
│                       │
│       DRAW HERE       │
│                       │
│                       │
└───────────────────────┘
```

Tools:

* pencil
* eraser
* 3–5 colors
* brush size
* clear

Timer:

**60 seconds**

---

## Multiplayer synchronization

The system doesn't send the entire canvas repeatedly.

It sends drawing strokes:

```ts
Stroke {
  points
  color
  width
}
```

Example:

```text
Player A draws
       ↓
stroke event
       ↓
Realtime connection
       ↓
Player B's canvas
```

This is dramatically simpler than synchronizing a real-time fighting game.

Use a managed realtime service rather than building your own WebSocket server.

For example:

**Supabase Realtime**.

---

# 10. Guessing

Once drawing ends:

```text
WHAT IS IT?
```

The other player enters a guess.

Then:

> **CORRECT 🎉**

or

> **NOPE**

You can make the incorrect response funny:

> *Honestly, I don't know what that was either.*

---

# 11. Saving drawings

After each round:

> **SAVE THIS MASTERPIECE?**

If yes:

```text
drawing
creator
prompt
timestamp
```

gets stored.

This feeds the **Our Art** gallery.

---

# 12. Our Art

Inside the laptop:

```text
OUR ART

[ drawing ] [ drawing ]
[ drawing ] [ drawing ]
[ drawing ] [ drawing ]
```

Each drawing shows:

* image
* prompt
* who drew it
* date

This becomes an evolving archive.

---

# 13. Mini Fighter

The original real-time multiplayer fighter is **removed from scope**.

No:

* WebSockets for combat
* multiplayer physics
* synchronization
* hitbox networking
* matchmaking

Instead, Mini Fighter is a **local joke/game**.

---

## Mini Fighter concept

Two tiny characters:

> **JIA VS RYAN**

The player chooses one.

A very simple local game can have:

* movement
* jump
* attack
* health
* simple AI opponent

The goal is to create a fun 30–60 second toy, not a real fighting game.

Potential result:

> **JIA WINS**

> *Absolutely devastating.*

Then:

**REMATCH**

---

## If time gets tight

Mini Fighter is optional.

The project is still complete without it.

The priority is:

1. 3D room
2. Photo wall
3. Draw Something
4. Cities
5. Bed Easter egg
6. Mini Fighter

---

# 14. Photo Wall

This is the **emotional center of the website**.

It replaces the letters and treasure chest.

The wall looks like a real physical wall covered in:

* Polaroids
* photographs
* handwritten notes
* little cards
* memories
* future ideas
* random scraps

Some should be slightly crooked or overlapping.

---

# 15. Photo wall interaction

Clicking the wall:

```text
3D camera
    ↓
move toward wall
    ↓
wall interface opens
```

Then:

# OUR WALL

A 2D interactive gallery appears.

---

# 16. Wall content types

Users can add:

### 📷 PHOTO

Image + optional caption.

### 📝 NOTE

Short text.

### 🥹 MEMORY

Something that happened.

### ⭐ FUTURE

Something to do someday.

### 🎟️ DATE

Something to do together.

### 💌 FOR WHEN...

A message associated with a particular situation.

---

# 17. “For when...” system

Optional categories:

* For when you're tired
* For when you're hungry
* For when work is too much
* For when you can't sleep
* For when you're sad
* For when you need to laugh
* For when you're bored
* For when you miss me
* For when something good happens
* For when you want to go somewhere

Example:

### 🥱 FOR WHEN YOU'RE TIRED

Photo +:

> **You've worked enough. Go to sleep.**

---

### 🍜 FOR WHEN YOU'RE HUNGRY

Photo +:

> **This is your sign to get food.**

---

### 😂 FOR WHEN YOU NEED TO LAUGH

A ridiculous photo/meme.

---

### 🏙️ FOR WHEN YOU NEED MOTIVATION

City photo:

> **One day.**

---

# 18. Two-way photo wall

This is important.

**Both people can add content.**

Button:

> **+ PIN SOMETHING**

Options:

```text
PHOTO
NOTE
MEMORY
FUTURE
DATE
FOR WHEN...
```

The wall therefore evolves after the birthday.

It isn't just a static gift.

---

# 19. Optional scheduled content

You can optionally support:

```text
unlockAt
```

Example:

> **OPEN OCTOBER 31**

Before then:

```text
🔒 SOMETHING IS WAITING
```

After the date:

> **UNLOCKED**

This is optional and should be added only after the basic wall works.

---

# 20. Bed Easter egg

Clicking the bed triggers:

```text
POST /api/interactions/bed
```

Backend sends an SMS notification.

Example:

> **Ryan clicked the bed 😈**

That's it.

No elaborate interface.

The website can show:

> 😈

for a moment and then return to the room.

---

# 21. Backend

Use **Supabase**.

It provides:

* PostgreSQL
* authentication
* file storage
* realtime
* simple API access

This avoids building a custom backend.

---

# 22. Database schema

### `users`

```text
id
name
created_at
```

---

### `wall_items`

```text
id
type
title
body
image_url
category
created_by
created_at
unlock_at
```

`type`:

```text
photo
note
memory
future
date
for_when
```

---

### `drawings`

```text
id
prompt
created_by
image_url
created_at
```

---

### `game_rooms`

```text
id
code
game_type
host_id
guest_id
status
created_at
```

---

### `game_events`

Only needed for Draw Something / realtime state.

```text
room_id
player_id
event_type
payload
timestamp
```

---

### `interactions`

```text
id
type
created_at
metadata
```

Examples:

```text
BED_CLICK
CITY_CHANGE
DRAWING_COMPLETED
WALL_ITEM_ADDED
```

---

# 23. Admin dashboard

Private route:

```text
/admin
```

You need to be able to quickly add content.

### Dashboard

```text
PENTHOUSE 22

PHOTO WALL
+ Add Photo
+ Add Note
+ Add Memory
+ Add Future
+ Add For When

DRAWINGS
View drawings

CITIES
Manage city backgrounds

INTERACTIONS
Recent activity
```

---

# 24. Photo upload flow

```text
Admin
 ↓
Upload image
 ↓
Supabase Storage
 ↓
Get URL
 ↓
Create wall_items record
 ↓
Wall displays item
```

You should be able to add something in **under 30 seconds**.

---

# 25. Technology stack

### Frontend

**Next.js**

**TypeScript**

**React**

### 3D

**Three.js**

**React Three Fiber**

**Drei**

### Backend

**Supabase**

### Multiplayer

**Supabase Realtime**

Only for Draw Something.

### Storage

**Supabase Storage**

### Deployment

**Vercel**

### 3D modeling

**Blender**

---

# 26. Project structure

```text
penthouse-22/
│
├── app/
│   ├── page.tsx
│   ├── admin/
│   │   └── page.tsx
│   └── api/
│       └── bed-click/
│
├── components/
│   │
│   ├── Penthouse/
│   │   ├── Penthouse.tsx
│   │   ├── Room.tsx
│   │   ├── Window.tsx
│   │   ├── Bed.tsx
│   │   ├── Laptop.tsx
│   │   ├── PhotoWall.tsx
│   │   └── Dog.tsx
│   │
│   ├── Cities/
│   │   └── CitySelector.tsx
│   │
│   ├── PhotoWall/
│   │   ├── WallView.tsx
│   │   ├── WallItem.tsx
│   │   └── AddItem.tsx
│   │
│   ├── Arcade/
│   │   ├── ArcadeMenu.tsx
│   │   ├── DrawSomething/
│   │   ├── MiniFighter/
│   │   └── OurArt.tsx
│   │
│   └── UI/
│
├── lib/
│   ├── supabase.ts
│   ├── realtime.ts
│   ├── cities.ts
│   └── games/
│
├── hooks/
│   ├── useCity.ts
│   ├── useInteraction.ts
│   └── useRealtimeGame.ts
│
├── types/
│   └── index.ts
│
└── public/
    ├── models/
    ├── textures/
    ├── cities/
    └── audio/
```

---

# 27. Build order

This is the most important part of the scope.

## Phase 1 — 3D prototype

Build:

* room
* camera
* lighting
* window
* bed
* desk
* laptop
* photo wall
* dog

**Goal:** You can enter and look around the penthouse.

---

## Phase 2 — Visual polish

Add:

* materials
* lighting
* city skyline
* Panda Express
* hoodie
* furniture
* plants
* dog animation
* atmosphere

**Goal:** It looks beautiful before any functionality exists.

---

## Phase 3 — Interactions

Implement:

* window
* city selector
* laptop
* photo wall
* bed

**Goal:** The room feels alive.

---

## Phase 4 — Photo wall backend

Implement:

* Supabase
* authentication
* storage
* wall_items
* upload
* notes
* categories
* two-way adding

**Goal:** You can continuously add content.

---

## Phase 5 — Draw Something

Implement:

* room creation
* room joining
* canvas
* prompts
* realtime strokes
* guessing
* save drawing
* Our Art gallery

**Goal:** You can actually play together.

---

## Phase 6 — Mini Fighter

Only now.

Implement:

* character sprites/models
* movement
* jump
* attack
* health
* basic AI
* win condition

No multiplayer.

---

## Phase 7 — Easter egg

Implement:

* bed click
* backend event
* SMS

---

## Phase 8 — Final polish

Add:

* transitions
* sounds
* subtle animations
* loading screen
* responsive behavior
* mobile fallback
* performance optimization
* final typography
* hidden Easter eggs

---

# 28. MVP definition

If you need to ship quickly, the **actual MVP** is:

### Must have

* Beautiful 3D penthouse
* White dog
* Tokyo/New York/Paris/Seoul/SF skylines
* City switching
* Laptop
* Draw Something
* Photo wall
* Two-way photo/note adding
* Bed 😈 Easter egg
* Panda Express

### Nice to have

* Mini Fighter
* Drawing gallery
* Scheduled/unlockable messages
* Sound
* Weather
* sophisticated animations

### Explicitly out of scope

* Multiplayer fighting
* WebSocket server
* Full 3D city
* Free-roaming character
* AI dog
* Multiple rooms
* VR
* matchmaking
* accounts beyond what's necessary
* complicated game mechanics

---

## The resulting product

The finished experience should basically be:

> **You enter his future apartment.**
>
> You can look out at Tokyo, New York, Paris, Seoul, or San Francisco.
>
> There's a little white dog sleeping in the room.
>
> Panda Express is sitting on the counter.
>
> There's a laptop where you can play a tiny game together.
>
> There's a wall where you can keep leaving each other photos and messages.
>
> And if he clicks the bed, you get a notification that he's thinking about you. 😈

That's a **very achievable scope** while still feeling like something genuinely bespoke rather than a collection of generic birthday-page widgets.
