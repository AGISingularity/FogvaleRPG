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
- **The Bridge Rest** — a waystation on the main road east of the bridge, kept by
  Orla the Waykeeper: five gold buys a bed that heals you whole and skips to morning,
  her free road-news points wanderers at the shrine, watchtower, and altar, and if
  you've found the satchel she has seen who crosses her bridge at midnight.
- **The Ledger of Worth** — Chapter Two opens. Slip into the chapel at dusk, wait
  out the small hours while Malvo sleeps with his eyes open, and read what the
  Path keeps on its bench: every soul in the vale priced with a number — and one
  fresh entry that explains a murder. Maren, Yseult, and Col each have words for
  what you found. The old triad asks what you are; the ledger prices what you're
  worth.
- **The midnight runners** — in the deep of night, hooded couriers really do cross
  the vale, chapel to ridge cave, over Orla's bridge — never stopping, never
  speaking. Stake out the route with a light and you'll see one pass; Bren has
  been counting them, and finally someone believes him.
- **The dark below** — the two cave mouths open (once you carry a blade and a light)
  into walled cavern complexes: permanently dark whatever the hour, sight cut to your
  torch or lantern's reach, bats in the black, rusted chests of gold, and a Path
  courier's satchel with cut straps that Dag can read like a confession. A pale
  stair-stone leads back to daylight — and each cache is kept by a Hollow
  Warden — ashen bough-fiends that guard rather than hunt, fall hard, and stay
  dead. The first leaves a knot of heartwood the seer would rather not touch;
  the second proves the point: the caches were tended, not abandoned.
- **Steel and teeth** — a fighting system: tap an adjacent creature to strike; the
  weapon ladder runs fists (1) → Tobin's hunting knife (2) → the star-metal sword (3), and the Forgeworks in Ironvale sells
  leather and iron armour that absorb hits. Creatures great and small roam the wilds
  (marsh slimes, dusk bats, bough-fiends near the woods) and shy away from towns;
  night breeds more. Not all are evil — pale wisps drift toward hidden things
  (herbs, bluecaps, buried chests) and go out upon them like a marker; striking
  one is silently, permanently noticed by the hidden virtues. Shops trade by
  day and bar the counter at night — the inn is the only midnight business. Falling in battle
  means waking at the seer's door, lighter of purse — never a lost save.
- **A living village** — every character has full 4-direction walk animation
  (player and NPCs alike); NPCs idle-wander near their posts, keep to their own
  ground (indoor folk stay indoors), turn to face you in conversation, and if
  your tap-target strolls off you follow them automatically. And the vale keeps
  hours: at dusk Col beds down in the stable's lee, Dag walks home and shuts his
  door, and Bren walks the road to the Bridge Rest — real A* commutes, doors
  creaking open as they pass — while Malvo's chapel bars itself from the outside
  until morning.
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
| Map generation | Seeded (deterministic) 128×128 world: ridge, river, long roads, two far-apart towns, deep wood, shrine, watchtower, altar, cave mouths + walled cavern interiors |
| Fog of war | Recursive shadowcasting (8 octants), explored-memory set, door states |
| Pathfinding | A* (4-way) with adjacent-goal support for talking/examining |
| Content | All NPCs, dialogue topics, choices, shops, and story flags |
| Autosave | localStorage save/load (`fogvale_ch1` v1), tab-hide + 4s interval |
| Rendering | Atlas baked to tile size, chunked terrain cache (32-tile chunks, lazily baked — a whole-map canvas would exceed iOS's 4096px limit), fog/night lightmap, sprites & animations, torch glow |
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

- NPCs wander a few steps around their posts but have no schedules yet
  (homes at night, work by day — that's the Chapter Two roadmap).
- Saves are per-browser (no cloud sync).
