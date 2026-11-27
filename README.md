# Giblet's Great Escape

[![turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/c/turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/Orchdhaaa/turkey-run-game-01/rank.svg)](https://make.fun/c/turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/Orchdhaaa/turkey-run-game-01/reward.svg)](https://make.fun/c/turkey-run-game-01)

Thanksgiving is coming. You are the main course. **Giblet's Great Escape** is a
turkey escape game for the [make.fun turkey-run-game-01 bounty](https://make.fun/c/turkey-run-game-01):
outrun the farmer from the farmyard, through the barn, into the kitchen — and
get away before you become dinner.

## How to play

Open `game/index.html` in a desktop browser (or run `node serve.ts` and open
http://localhost:8080). No build step, no network request: every script,
sound and image is a file under `game/` or synthesised in code.

- **Space / click** — jump
- **S / Down** — duck and hide behind a hay bale
- **Shift / X** — dash (smashes through hazards, shakes the farmer off)
- **P** — pause · **M** — mute

Jump fences and ovens, dodge falling carving knives and rolling pumpkins,
wade through the mud, grab corn for points, and hide in the hay when the
farmer gets close — but don't stay hidden too long, or he'll come looking.
Reach the end of the 2,600-foot course to escape. Three lives; if the farmer
catches you, it's Thanksgiving dinner.

## What is in here

- `game/` — the game itself, plain static files
  - `game/src/config.js` — every tuning number and colour
  - `game/src/levels.js` — the three stages: farmyard, barn, kitchen
  - `game/src/world.js` — the rules: running, jumping, hiding, scoring
  - `game/src/farmer.js` — the farmer: he chases, searches and lunges
  - `game/src/render.js` — all the drawing: turkey, farmer, farm, kitchen
  - `game/src/audio.js` — synthesised sound effects and music (WebAudio)
  - `game/src/input.js` — keyboard and mouse
  - `game/src/shots.js` — the screenshot scenes (real runs, autopiloted)
  - `game/src/random.js` — the seeded random number generator
  - `game/src/main.js` — boot and the game loop
- `screenshots/` — real renders of the game in a browser
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

All art, sounds, music and names are original, drawn and synthesised for
this game. License: MIT.
