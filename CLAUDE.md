# CLAUDE.md — Fogvale project context

## What this is

Fogvale is a phone-first, browser-based RPG inspired by *Ultima VII: The Black Gate*
(world simulation, keyword dialogue, a friendly-faced cult) and the virtue system of
*Ultima IV/V* (Truth, Love, Courage — the three Principles behind the eight virtues and
the Codex). Chapter One ("The Stable Door") is complete and live on GitHub Pages at
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
  Remaining: the runners' satchels payoff, why the Vigil stands where it stands.
- Combat — SHIPPED v0.6.0: HP + regen + bread heals, weapon/armour stats (auto-worn,
  no equip UI), Forgeworks armoury + Hetta the Smith (10th NPC), four creatures
  (slime/bat/bough-fiend/wisp) with spawn/chase AI that avoids towns, wisp = good
  creature whose killing costs hidden Love, death = respawn at the seer's with 25%
  gold loss. Dungeons behind the cave mouths are the remaining piece.

### 3. Ship it to many players ("web-scale")
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
