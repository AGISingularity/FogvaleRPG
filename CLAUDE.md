# CLAUDE.md — Fogvale project context

## What this is

Fogvale is a phone-first, browser-based RPG inspired by *Ultima VII: The Black Gate*
(world simulation, keyword dialogue, a friendly-faced cult) and the virtue system of
*Ultima IV/V* (Truth, Love, Courage — the three Principles behind the eight virtues and
the Codex). All three chapters (The Stable Door, The Ledger of Worth, The Gardener) are
complete and live on GitHub Pages at
https://agisingularity.github.io/FogvaleRPG/ — deployed from `main`, root folder.
Every push to `main` redeploys automatically.

The game is `index.html` (~1000 lines) plus `assets/tiles.png`, a pixel-art
spritesheet composited by `tools/atlas.html` from the CC0 "Zelda-like tilesets and
sprites" pack (ArMM1998; sources vendored in `tools/src/`, credits in
`assets/CREDITS.md`; export with `node tools/make-atlas.mjs`). A `VERSION` const in
`index.html` shows on the intro/help screens and cache-busts the spritesheet — bump
it on every release. Engine: seeded deterministic map generation,
recursive-shadowcasting fog of war rendered through a soft-edged lightmap, A*
tap-to-walk, keyword-topic dialogue, a two-town distance-priced economy, a hidden
Truth/Love/Courage score, and localStorage autosave (per-browser, saves on tab-hide +
every 4s). `README.md` documents the architecture section by section — read it first.

## Design pillars — do not break these

1. **Fog of war is the core verb.** Line of sight is gameplay, not decoration. Trees,
   walls, mountains block sight; explored terrain is dimmed memory; living things render
   only in live sight. Night collapses sight radius; light sources are economy items.
2. **Knowledge is the inventory.** Story progress is gated by learned dialogue topics
   (words heard from one NPC asked of another), never by levels or XP.
3. **The economy is geography.** Goods are cheap where they grow, dear far away.
   Advanced items exist only in distant towns. Walking further = earning more.
4. **The triad stays hidden.** Truth/Love/Courage are scored silently by choices.
   No meters, no popups. The seer gives cryptic readings; doors open or don't.
5. **The story is a slow reveal.** The Radiant Path cult preaches a counterfeit triad
   (Unity/Trust/Worthiness — a warped mirror of Truth/Love/Courage). Chapter One ended
   with Brother Malvo's slip proving the Path was present for Piet's murder.
   Chapter Two is titled "The Ledger of Worth."
6. **Phone-first.** Tap targets, portrait layout, one-finger play. Test at 390×844.

## Testing convention

Test headless with Playwright (chromium) before every deploy: check for zero pageerrors,
verify save/restore round-trips, verify A* reachability of all key destinations, and
screenshot at phone viewport. Serve over `python3 -m http.server` when testing
localStorage (matches the Pages origin model). All of this is wired up in
`node test/run.mjs` (one-time setup: `npm install && npx playwright install chromium`);
it also profiles frame time under 4× CPU throttle.

## Roadmap — next level (in priority order)

### 1. Better graphics — DONE (Aug 2026)
- SNES-style art composited from ArMM1998's CC0 Zelda-like pack (v0.3.0): textured
  terrain, stone buildings, castle doors, tall trees and 16×24 characters
  (feet-aligned tall sprites overhang the tile above), per-NPC recolors.
- 16-case road autotiling, river shore foam, 2-frame water shimmer, torch flicker,
  player walk cycle with facing (profile frames face left; flipped when moving right).
- Soft-edged fog via an upscaled 1px-per-tile lightmap; warmer indigo night.
- Perf: whole-map terrain cache + DPR cap 2; draw() went 1.66ms → 0.07ms per frame
  at 4× CPU throttle (measured by test/run.mjs).

### 2. Bigger world — IN PROGRESS (v0.5.0 shipped the terrain half)
- DONE: 128×128 map (3× area), towns in opposite corners (~180 road-steps apart),
  chunked+lazy terrain cache, watchtower that reveals the land around it, a kneeling
  altar with seer dialogue, two cave mouths awaiting dungeons. Save format v2.
- Dungeons — SHIPPED v0.7.0: both cave mouths teleport (sword + light required) into
  walled cavern pockets at the map's south edge ('v' floor, 'X' exit rune, always
  night-dark via inCave() in sightRadius/updateFog), bat-heavy spawns, five chests,
  and the runner's-satchel story item (Dag dialogue, Chapter Two thread).
- v0.9.0: hit feedback (white ring + knockback nudge), the Hollow Warden boss
  (unique, guards the deep chest, 1.45x render, permanent kill via F.wardenSlain),
  heartwood drop with a Yseult reading that seeds "someone grew the guardian";
  also fixed chests crashing the renderer when in live sight (missing OBJ_CELL).
- v0.10.0: hunting knife at Tobin's (damage 2, early-game rung) and a second
  Warden at the ridge cave's satchel cache (per-post slain flags, legacy
  F.wardenSlain migrates; second kill's line lands the 'caches were tended' beat).
- v0.12.0: midnight runners made visible — deep-night couriers walk a real A*
  route (chapel → bridge → ridge cave) in dark-recolored hero frames; close
  sighting sets F.sawRunner (+Courage once) and unlocks Bren's counting-them
  dialogue. Chapter Two's runners are now a thing you can witness.
- v0.21.0: the draught — Yseult brews bluecaps into max HP (10 caps → +3, then
  15 → +3, hard cap at 16; maxHp persisted in saves). Bluecap sink + progression.
- v0.20.0: the under-dark — second dungeon level below the outcrop cave ('D'
  stair at 121,123 → pocket at [43,2,69,9]; inDeep() dims light to 5/3/2; two
  richer chests + 4 bluecaps; CAVES.deep drives spawns and the way back).
- v0.19.0: mercy — evil creatures (not wardens) flee at ≤1/3 hp, sliding along
  obstacles and escaping by distance or endurance; a first escape pays Love once
  (F.showedMercy). The fighting system now has a moral verb besides 'strike'.
- v0.18.0: the Weeping Altar (10,78) — altars are now tappable pseudo-NPC
  dialogues (openAltar routes to WEEPING_ALTAR/KNEELING_ALTAR); bread/pelt
  offerings pay Love once each; kneeling-altar wax study pays Truth and plants
  the Chapter Three clue (the second, deeper knee-print).
- v0.17.0: vale wolves (night-only spawns, pack aggro within 8 on wounding,
  extended chase range when angry) and the pelt economy (drops sell at Tobin's 4 /
  Serra's 8 — first creature-to-economy loop).
- v0.13.0: shop hours (Trade chip hidden at night, per-keeper closing lines) and
  wisp guidance (wisps drift to the nearest object within 12 and fade upon it —
  sparing good creatures now pays in found treasure). Remaining schedule work:
  none pressing; the vale keeps sensible hours.
- Settlements: the Bridge Rest waystation shipped v0.8.0 (Orla, 11th NPC: paid bed =
  full heal + advance to morning; rumor dialogue seeds the far places; satchel
  corroboration). Room for more hamlets later if wanted.
- NPC schedules — v1 SHIPPED v0.11.0: the three outdoor NPCs (col/bren/dag) A*
  commute to night spots at dusk and back at dawn (n.night vs n.dx0/dy0, wander
  re-anchors to the current target, doors open on NPC passage); the chapel door
  (110,17) is impassable from outside at night. Remaining: schedules for
  shopkeepers (shops closing), more locked doors.
- Chapter Two content: the chapel ledger — OPENED v0.14.0 (chapel bars only at deep
  night so dusk visitors can stay; Malvo sleeps at [112,13] with a nightGreet; the
  ledger object appears/reads only at deepNight, granting Courage+Truth and the
  'ledger' topic; Maren/Yseult/Col reactions; Piet's entry states the motive).
  v0.15.0 landed the satchel payoff: the cache object in ridge-cave room B pries
  open once F.readLedger||F.sawRunner, yielding the Silver Blank + 'blanks' topic
  (Serra assay / Dag ore / Maren: Piet-was-a-runner). v0.16.0 closed the arc: the
  Vigil reveal (heartwood+blank at the shrine, all three virtues +1, 'vigil'
  topic, Yseult/Bren reactions) and a Chapter Two end-card once ledger+cache are
  also done. Chapter Two is COMPLETE; Chapter Three is titled 'The Gardener'
  (who taught the wood to stand up; what sleeps beneath the vale).
- Combat — SHIPPED v0.6.0: HP + regen + bread heals, weapon/armour stats (auto-worn,
  no equip UI), Forgeworks armoury + Hetta the Smith (10th NPC), four creatures
  (slime/bat/bough-fiend/wisp) with spawn/chase AI that avoids towns, wisp = good
  creature whose killing costs hidden Love, death = respawn at the seer's with 25%
  gold loss. Dungeons behind the cave mouths are the remaining piece.

### 2.5 Chapter Three: The Gardener — OPENED (v0.22.0)
- The Gardener's Row ('G' at 12,26, spur off the shrine trail): pseudo-dialogue
  whose meaning gates on F.vigilRevealed; the trowel teaches 'gardener'; Yseult
  is afraid of the water; asking Malvo sets F.askedMalvoGardener ("the chapel
  keeps no garden"). v0.23.0 added the Hollow Gate ('H' at 4,16, spur off the
  shrine trail at y16): drag-marks topic in the grove, third Warden post (gated
  on knowing 'gardener'), gateStone discovery + 'gate' topic, Yseult (the seal
  answers to meaning, not iron) and Dag (his missing drills). v0.24.0 named the Gardener:
  Joren, Col's nine-year-old son (planted in Col's v0.6.0 'took my son to
  Ironvale' line). Col's trowel-recognition (F.gardenerNamed, learn 'joren'),
  the plea (F.jorenQuest), Maren/Yseult reactions, Malvo's first open threat
  (F.malvoThreatened). v0.25.0 shipped the meeting:
  Joren appears at the grove during deepNight once F.jorenQuest (small-scale
  runner frames, tending animation); pride/door/father topics; the father
  choice sets F.toldJoren and reshapes Col's dialogue ('Hurry, stranger').
  v0.26.0 closed the chapter: the
  homecoming (JOREN.topics.home, F.jorenHome, figure at 17,109, Col's +3 Love
  gratitude, Malvo's 'some crops reseed'), and the Gate's answer — gated on
  F.jorenHome AND all three virtues positive, F.watchPassed, chapter3End card.
  CHAPTER THREE IS COMPLETE. The hidden triad finally acted in the open,
  without ever showing a number. Chapter Four is unwritten ('something promised
  an open door rolls over in its sleep').

### 3. Ship it to many players ("web-scale") — STARTED (v0.27.0)
- DONE: PWA manifest (Vigil-mark icons in assets/), sw.js (network-first shell so
  updates land, cache-first assets, old-cache cleanup, update notice via say()),
  OG tags. Release checklist: bump VERSION in index.html AND the two version
  strings in sw.js — test/run.mjs fails if they drift.
- v0.30.0: fixed reversed L/R walk facing — the profile art faces RIGHT, so the
  horizontal flip belongs on dir==='left' (was 'right') at all three sprite call
  sites (player, npcs, runner). Visual-only; the suite can't catch facing, so
  verify by eye on any change here.
- v0.29.0: begin-anew (two-tap wipe on the Help screen, reusing the restoring
  latch so the unload autosave can't resurrect the wiped tale) and presentation
  updated from 'Chapter One' to the three-chapter game.
- v0.28.0: the rune of remembrance — save export/import codes (FOG-prefixed
  base64 of buildSave(); importRune validates, writes storage, and latches
  `restoring` so the unload autosave cannot clobber the imported tale — that
  race was a real bug caught by the round-trip test). Cross-device saves with
  zero backend.
- REMAINING: custom domain (optional), true cloud sync (needs a user-provisioned
  backend — Supabase/Workers KV).
- It is already a website; scale for players means: keep GitHub Pages as free global
  hosting, add a proper domain later if desired, add PWA manifest + service worker so
  it installs to home screens and plays offline, add Open Graph/social preview tags,
  and add a version stamp + update notice so returning players get new chapters cleanly.
- Cross-device cloud saves need a small backend (localStorage is per-browser). Prefer a
  free-tier serverless option (e.g. Supabase or Cloudflare Workers + KV): anonymous save
  codes first ("write down this rune-word to restore your tale anywhere") before real accounts.

### 4. Email capture (for future promotion)
- In-fiction, opt-in only: at the chapter-end card, offer "Be told when Chapter Two
  arrives" with an email field. Never gate gameplay behind it.
- Static hosting cannot store emails; use a lightweight endpoint or form service
  (e.g. Buttondown, Formspree, or a Supabase table) — pick one, wire it, and keep the
  submission JS graceful when offline/blocked.
- Compliance basics: explicit consent language at the field, a one-line privacy note
  (what we store, what we send), and honor unsubscribes. No pre-checked boxes,
  no third-party sharing.

## Working agreements

- Keep `README.md` accurate as the architecture changes; it is the map of the code.
- Preserve save-compatibility where cheap (version key `fogvale_ch1`, `v:1`); when a
  save format must break, migrate or fail gracefully to a fresh start with a message.
- Small commits, descriptive messages, push to `main` deploys — so never push untested.
