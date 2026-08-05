# Fogvale — Three Chapters, One Vale

A phone-first, browser-based RPG inspired by *Ultima VII: The Black Gate* (and the
virtue system of *Ultima IV/V*). The game is **`index.html`** plus one pixel-art
spritesheet (**`assets/tiles.png`**) — no build step, no runtime dependencies, no
server required. Open it in any mobile or desktop browser — or install it:
it's a PWA now, with a Vigil-mark icon, home-screen install, offline play via
a service worker, and an in-game notice when a newer telling exists.

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
- **The twin altars** — the Path's kneeling altar in the south-east wilds and,
  farther still, the Weeping Altar on the trackless west bank: a dished stone,
  damp without rain. Tap either and it speaks. The old altar takes offerings —
  bread for the hungry dead, a pelt for their warmth — paid silently in Love;
  the wax at the Path's altar reads once, in Truth: two sets of knee-prints,
  and the small set dug deeper.
- **The watch passes** — walk Joren home ('he does not take your hand — nine is
  nine — but he walks so close your shadows are one shadow') and a small figure
  stays by the stable wall, waking angry about porridge, like a boy. Then stand
  before the Hollow Gate: the circles weigh every unwitnessed choice you ever
  fed the fog — Truth, Love, Courage — and if all three stand in the light, the
  seal answers: THE WATCH PASSES. The vale grew itself a keeper. Chapter Three
  closes; below, something promised an open door rolls over in its sleep.
- **The boy in the rows** — once Col has asked, go to the nursery in the deep
  of night and Joren is there among his saplings, tying lath frames: nine,
  hoe-thin, proud of the only work that ever mattered, and entirely unafraid.
  Ask about his father and the recitation wobbles on the word Da — then choose
  whether to tell him the truth. Told, the knot in his hands slowly comes
  undone: 'The rows need me. Don't they?' For the first time, it is a question.
- **The small hand has a name** — describe the trowel to Col and he knows it
  before you finish: barley-handled, notch in the tang, his own — put in his
  son's hand the day the boy could walk. The Gardener is Joren, nine years old,
  taken by the Path 'for the work'. Maren re-reads the ledger's cruelest entry,
  Yseult names the crime (a child cannot be blamed, but a child can be used),
  Col asks for one thing only — him, back — and Malvo, asked about the boy,
  stops smiling for the first time.
- **The Hollow Gate** — follow the drag-marks from the nursery's stump to a
  door in the mountain's root: three circles carved a hand deep, fresh drill-scars
  skittering off the seal like matches on glass. The harvested third Warden
  stands sentry before it. Yseult names what the seal answers to (not iron —
  meaning), and Dag recognizes the drills: his own, missing since winter.
- **The Gardener's Row** — Chapter Three opens. Deep in the wood, a too-orderly
  stand of saplings was always strange; after the Vigil speaks, you see it plain:
  a nursery, where Wardens are trained on frames and harvested at the stump.
  Half-buried beside it, the hook the next chapter hangs on — a trowel kept
  sharp and clean, whose dried handprint is smaller than the trowel. The seer,
  for the first time, is afraid of her water. The chapel keeps no garden.
- **Why the Vigil stands** — bring the heartwood and a silver blank to the old
  shrine and the stone answers: kin knows kin. The Wardens were grown from the
  Vigil's own grove; the three circles are a seal — LET NOTHING ELSE PASS BELOW —
  and the Path is mining toward whatever they guard. Chapter Two closes with its
  own end-card, and Chapter Three gets its title: The Gardener.
- **What the runners carry** — in the ridge cave's back room, tarred crates wait
  for someone who knows enough to pry: silver blanks, medallions before the
  sunburst finds them, eleven to a satchel. Serra assays the lie (half tin under
  a bright skin), Dag names his own ore, and Maren learns the worst of it — Piet
  ran the Path's satchels himself, eleven times, and was killed for asking what
  he carried the twelfth.
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
  the second proves the point: the caches were tended, not abandoned. And below
  the outcrop a further stair descends to the under-dark — a second level where
  even the lantern gutters to five paces, the chests run richer, and bluecaps
  grow thickest.
- **Steel and teeth** — a fighting system: tap an adjacent creature to strike; the
  weapon ladder runs fists (1) → Tobin's hunting knife (2) → the star-metal sword (3), and the Forgeworks in Ironvale sells
  leather and iron armour that absorb hits. Creatures great and small roam the wilds
  (marsh slimes, dusk bats, bough-fiends near the woods) and shy away from towns;
  night breeds more — including vale wolves, who hunt in loose packs after dark:
  wound one and its packmates join the chase. A felled wolf yields its pelt,
  worth 4 gold at Tobin's and 8 in iron country. And badly wounded beasts break
  and run — hunt them down for the loot, or let them limp into the dark and be
  quietly noticed for it. What you do then is between you and the fog. Not all are evil — pale wisps drift toward hidden things
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
- **The draught** — the seer brews bluecaps into a sturdier heart: ten caps for
  +3 utmost health, fifteen for three more, and never a third cup. The under-dark
  grows them thickest; the fighting system finally has a body that toughens.
- **Begin anew** — a two-tap forget-everything on the How to Play screen, for
  finished tales and for players curious what the seal says to a different heart.
  The rune is the only way back.
- **The rune of remembrance** — your whole tale written small: a copyable code
  on the How to Play screen. Paste it into Fogvale on any device and the tale
  resumes whole — cross-device saves with no account and no server, exactly as
  the roadmap promised ('write down this rune-word to restore your tale
  anywhere').
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
