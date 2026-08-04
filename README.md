# Fogvale — Chapter One: The Stable Door

A phone-first, browser-based RPG inspired by *Ultima VII: The Black Gate* (and the
virtue system of *Ultima IV/V*). The game is **`index.html`** plus one pixel-art
spritesheet (**`assets/tiles.png`**) — no build step, no runtime dependencies, no
server required. Open it in any mobile or desktop browser.

## Systems

- **Fog of war with true line of sight** — recursive shadowcasting over a tile map.
  Trees, mountains, and walls block vision; explored terrain stays as dimmed "memory,"
  but people and items only render in live sight. The vision edge fades softly via an
  upscaled per-tile lightmap rather than a hard tile cutoff.
- **Pixel-art rendering** — a 16px tile atlas composited by `tools/` from the CC0
  "Zelda-like tilesets and sprites" pack by ArMM1998 (see `assets/CREDITS.md`):
  textured grass, road autotiling (16 edge cases), foam river shores, 2-frame water
  shimmer, tall trees and characters (16×24, feet-aligned, overhanging the tile
  above), and per-NPC shirt recolors of the pack's hero sprite. The full map is
  baked once to an offscreen canvas, so a frame is a handful of blits.
- **Tap-to-walk** — A* pathfinding; tapping a person or object walks over and interacts.
- **Day/night** — at night sight collapses to 2 tiles; a torch widens it to 4 (and
  flickers), a brass lantern to 7. Light sources are shop goods, closing the loop
  with the economy.
- **Regional economy** — herbs and mushrooms are gathered where they grow and sell for
  roughly double in the far town. Advanced goods (lantern, star-metal sword) only exist
  in the distant shop. "Distance is the oldest alchemy."
- **Keyword dialogue web** — NPCs speak in topics. Words learned from one mouth can be
  asked of any other; the story is gated by *what you know to ask*, not by levels.
- **Hidden virtue triad** — Truth, Love, and Courage are silently scored by your choices
  (lying to the Elder, giving to the beggar, pressing Brother Malvo, walking to the
  shrine at night). No meter is ever shown; a seer will read the water for you.
- **Autosave** — progress persists in localStorage (key `fogvale_ch1`, version 1),
  written on tab-hide and every 4 seconds; restoring skips the intro. Per-browser.
- **Chapter One story** — a murdered stable boy, a silver sunburst medallion, and the
  Radiant Path: a smiling charity whose triad ("Unity, Trust, Worthiness") is a
  counterfeit of the old one carved on the shrine stone.

## Repository layout

| Path | What it holds |
|---|---|
| `index.html` | The whole game (see section table below) |
| `assets/tiles.png` | The spritesheet the game renders from (`assets/CREDITS.md` for art credits) |
| `tools/atlas.html` | Atlas compositor: crops/recolors the CC0 source sheets, builds autotiles |
| `tools/src/` | Vendored CC0 source sheets (ArMM1998's Zelda-like pack) |
| `tools/make-atlas.mjs` | Renders `atlas.html` headless → writes `assets/tiles.png` + a preview |
| `test/run.mjs` | Headless Playwright test harness (see Development) |

## Structure of `index.html`

| Section | What it holds |
|---|---|
| CSS + HTML | HUD, message log, dialogue/shop/bag bottom sheets, intro & chapter-end cards |
| Map generation | Seeded (deterministic) world: ridge, river, roads, two towns, deep wood, shrine |
| Fog of war | Recursive shadowcasting (8 octants), explored-memory set, door states |
| Pathfinding | A* (4-way) with adjacent-goal support for talking/examining |
| Content | All NPCs, dialogue topics, choices, shops, and story flags |
| Autosave | localStorage save/load (`fogvale_ch1` v1), tab-hide + 4s interval |
| Rendering | Atlas baked to tile size, whole-map terrain cache (door patching), fog/night lightmap, sprites & animations, torch glow |
| Game loop | Step timer, time-of-day, pickups, arrival-triggered interactions |

## Development

One-time setup: `npm install && npx playwright install chromium`.

- `node test/run.mjs` — headless test pass at phone viewport (390×844): zero page
  errors, A* reachability of every key destination, save/restore round-trip,
  day/night screenshots, and a frame-time profile under 4× CPU throttle. Run it
  before every push; pushing to `main` deploys the live game.
- `node tools/make-atlas.mjs` — regenerate `assets/tiles.png` after editing
  `tools/atlas.html` (it also fails loudly if the sprite-rect table and
  `index.html`'s `ATLAS_DEF` copy drift apart).
- The version stamp (`VERSION` in `index.html`) shows on the intro card and the
  How to Play screen, and cache-busts the spritesheet URL — bump it on release.

## Known limitations (prototype)

- No combat yet — the sword hums, patiently, until Chapter Two.
- NPCs are stationary (no schedules yet).
- Saves are per-browser (no cloud sync).
