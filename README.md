# Fogvale — Chapter One: The Stable Door

A phone-first, browser-based RPG prototype inspired by *Ultima VII: The Black Gate*
(and the virtue system of *Ultima IV/V*). Everything lives in a single file:
**`index.html`** — no build step, no dependencies, no server required. Open it in any
mobile or desktop browser.

## Systems

- **Fog of war with true line of sight** — recursive shadowcasting over a tile map.
  Trees, mountains, and walls block vision; explored terrain stays as dimmed "memory,"
  but people and items only render in live sight.
- **Tap-to-walk** — A* pathfinding; tapping a person or object walks over and interacts.
- **Day/night** — at night sight collapses to 2 tiles; a torch widens it to 4, a brass
  lantern to 7. Light sources are shop goods, closing the loop with the economy.
- **Regional economy** — herbs and mushrooms are gathered where they grow and sell for
  roughly double in the far town. Advanced goods (lantern, star-metal sword) only exist
  in the distant shop. "Distance is the oldest alchemy."
- **Keyword dialogue web** — NPCs speak in topics. Words learned from one mouth can be
  asked of any other; the story is gated by *what you know to ask*, not by levels.
- **Hidden virtue triad** — Truth, Love, and Courage are silently scored by your choices
  (lying to the Elder, giving to the beggar, pressing Brother Malvo, walking to the
  shrine at night). No meter is ever shown; a seer will read the water for you.
- **Chapter One story** — a murdered stable boy, a silver sunburst medallion, and the
  Radiant Path: a smiling charity whose triad ("Unity, Trust, Worthiness") is a
  counterfeit of the old one carved on the shrine stone.

## Structure of `index.html`

| Section | What it holds |
|---|---|
| CSS + HTML | HUD, message log, dialogue/shop/bag bottom sheets, intro & chapter-end cards |
| Map generation | Seeded (deterministic) world: ridge, river, roads, two towns, deep wood, shrine |
| Fog of war | Recursive shadowcasting (8 octants), explored-memory set, door states |
| Pathfinding | A* (4-way) with adjacent-goal support for talking/examining |
| Content | All NPCs, dialogue topics, choices, shops, and story flags |
| UI + rendering | Canvas tile renderer, smooth camera, night tint, torch glow |
| Game loop | Step timer, time-of-day, pickups, arrival-triggered interactions |

## Known limitations (prototype)

- Progress is not saved on refresh (in-memory only).
- No combat yet — the sword hums, patiently, until Chapter Two.
- NPCs are stationary (no schedules yet).
