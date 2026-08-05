/* Fogvale headless test harness.
   Usage: node test/run.mjs [--label baseline]
   - serves the repo over python3 -m http.server (matches the Pages origin model)
   - phone viewport 390x844, touch, DPR 2
   - asserts zero page errors, A* reachability of all key destinations,
     save/restore round-trip (when a save system exists),
   - captures day + night screenshots and a 4x-CPU-throttled frame-time profile
*/
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'test', 'out');
mkdirSync(OUT, { recursive: true });
const LABEL = process.argv.includes('--label')
  ? process.argv[process.argv.indexOf('--label') + 1] : 'run';
const PORT = 8741;

let failures = 0;
const ok = (cond, name, extra = '') => {
  console.log(`${cond ? '  ✓' : '  ✗ FAIL'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
};

// -- static server ----------------------------------------------------------
const server = spawn('python3', ['-m', 'http.server', String(PORT)], {
  cwd: ROOT, stdio: 'ignore',
});
await new Promise(r => setTimeout(r, 800));

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(600); // boot + first frames (and asset load)

  // -- begin the game -------------------------------------------------------
  const introVisible = await page.isVisible('#beginBtn');
  if (introVisible) await page.click('#beginBtn');
  await page.waitForTimeout(300);

  // -- A* reachability of every key destination -----------------------------
  const reach = await page.evaluate(() => {
    mobs.length = 0;   // creatures must not block reachability checks
    const targets = npcs.map(n => ({ name: n.name, x: n.x, y: n.y }));
    targets.push({ name: "Piet's body", x: 15, y: 106 });
    targets.push({ name: 'the old shrine', x: 22, y: 12 });
    targets.push({ name: 'the watchtower', x: 76, y: 56 });
    targets.push({ name: 'the kneeling altar', x: 108, y: 109 });
    targets.push({ name: 'the weeping altar', x: 10, y: 78 });
    targets.push({ name: "the gardener's row", x: 12, y: 26 });
    targets.push({ name: 'the ridge cave', x: 34, y: 65 });
    targets.push({ name: 'the outcrop cave', x: 91, y: 38 });
    return targets.map(t => {
      const goal = (x, y) => Math.abs(x - t.x) <= 1 && Math.abs(y - t.y) <= 1;
      const p = astar(P.x, P.y, goal, t.x, t.y);
      return { name: t.name, reachable: !!p, steps: p ? p.length : -1 };
    });
  });
  for (const r of reach) ok(r.reachable, `reach ${r.name}`, r.reachable ? `${r.steps} steps` : 'NO PATH');

  // -- day screenshot (walk a few steps into the village first) -------------
  await page.evaluate(() => { routeTo(21, 105, false); });
  await page.waitForFunction(() => path.length === 0, null, { timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, `${LABEL}-day.png`) });

  // -- night screenshot -----------------------------------------------------
  await page.evaluate(() => { time = 310; computeFOV(); updHud(); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, `${LABEL}-night.png`) });
  await page.evaluate(() => { time = 60; computeFOV(); updHud(); });

  // -- frame-time profile under 4x CPU throttle (mid-range phone stand-in) --
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => { routeTo(60, 102, false); }); // long walk east on the road
  const prof = await page.evaluate(() => new Promise(resolve => {
    const deltas = []; let prev = performance.now();
    const t0 = prev;
    function sample(t) {
      deltas.push(t - prev); prev = t;
      if (t - t0 < 4000) requestAnimationFrame(sample);
      else {
        deltas.shift();
        deltas.sort((a, b) => a - b);
        const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
        resolve({
          frames: deltas.length,
          mean: +mean.toFixed(2),
          p95: +deltas[Math.floor(deltas.length * 0.95)].toFixed(2),
          worst: +deltas[deltas.length - 1].toFixed(2),
        });
      }
    }
    requestAnimationFrame(sample);
  }));
  // raw draw() cost — the comparable number for before/after profiling,
  // since rAF deltas sit at vsync whenever we're fast enough
  prof.drawMs = await page.evaluate(() => {
    draw(); const t0 = performance.now();
    for (let i = 0; i < 200; i++) draw();
    return +((performance.now() - t0) / 200).toFixed(3);
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  console.log(`  ▸ frame time @4x CPU throttle: mean ${prof.mean}ms, p95 ${prof.p95}ms, worst ${prof.worst}ms (${prof.frames} frames)`);
  console.log(`  ▸ draw() cost @4x CPU throttle: ${prof.drawMs}ms per call`);
  writeFileSync(join(OUT, `${LABEL}-perf.json`), JSON.stringify(prof, null, 2));
  ok(prof.p95 < 33.4, 'p95 frame time under 33.4ms (30fps floor at 4x throttle)', `${prof.p95}ms`);

  // -- save/restore round-trip (skipped if no save system yet) --------------
  const hasSave = await page.evaluate(() => typeof saveGame === 'function');
  if (hasSave) {
    const before = await page.evaluate(() => {
      inv.gold = 87; inv.herb = 3; knownTopics.add('murder');
      saveGame();
      return { gold: inv.gold, herb: inv.herb, x: P.x, y: P.y, time };
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => ({
      gold: inv.gold, herb: inv.herb, x: P.x, y: P.y, time,
      topic: knownTopics.has('murder'),
      introHidden: document.getElementById('intro').style.display !== 'block',
    }));
    ok(after.gold === before.gold && after.herb === before.herb, 'save/restore: inventory round-trips',
      `gold ${before.gold}→${after.gold}, herb ${before.herb}→${after.herb}`);
    ok(after.x === before.x && after.y === before.y, 'save/restore: position round-trips');
    ok(after.topic, 'save/restore: known topics round-trip');
    ok(after.introHidden, 'save/restore: intro skipped on restore');
    await page.evaluate(() => localStorage.clear());
  } else {
    console.log('  ▸ no save system detected — save/restore test skipped');
  }

  // -- combat: kill a slime, take a hit, survive the accounting -------------
  const combat = await page.evaluate(() => {
    const before = { hp: P.hp, gold: inv.gold };
    mobs.length = 0;
    mobs.push({ type:'slime', hp:3, x:P.x+1, y:P.y, rx:P.x+1, ry:P.y, dir:'left' });
    const m = mobs[0];
    attackMob(m); attackMob(m); attackMob(m);            // fists do 1 each
    const killed = !mobs.includes(m);
    mobs.push({ type:'slime', hp:3, x:P.x+1, y:P.y, rx:P.x+1, ry:P.y, dir:'left' });
    mobTick();                                           // it bites back
    const out = { killed, goldGain: inv.gold-before.gold, hpBefore: before.hp, hpAfter: P.hp };
    mobs.length = 0; P.hp = P.maxHp; updHud();
    return out;
  });
  ok(combat.killed, 'combat: three bare-handed hits kill a slime');
  ok(combat.goldGain > 0, 'combat: slain slime drops gold', '+'+combat.goldGain);
  ok(combat.hpAfter < combat.hpBefore, 'combat: adjacent slime bites back',
    combat.hpBefore+'→'+combat.hpAfter);

  // -- caves: gear up, enter the dark, walk the stair-stone out -------------
  const cave = await page.evaluate(() => {
    mobs.length = 0;
    inv.sword = 1; inv.torch = 1;
    const chests = objects.filter(o => o.type === 'chest').length;
    enterCave('ridge');
    const tile = grid[P.y][P.x], sight = sightRadius();
    P.x = 9; P.y = 123; P.rx = 9; P.ry = 123; computeFOV();  // a chest in plain sight
    return { chests, tile, sight };
  });
  await page.waitForTimeout(300);                // frames must render the chest
  const caveOut = await page.evaluate(() => {
    P.x = 6; P.y = 121; P.rx = 6; P.ry = 121;    // beside the exit rune
    path = [{ x: 5, y: 121 }]; step();           // the game's own step machinery
    const out = { x: P.x, y: P.y };
    inv.sword = 0; inv.torch = 0;
    P.x = 21; P.y = 110; P.rx = 21; P.ry = 110; computeFOV();
    return out;
  });
  cave.x = caveOut.x; cave.y = caveOut.y;
  ok(cave.chests === 7, 'caves: seven chests wait below', String(cave.chests));
  ok(cave.tile === 'v', 'caves: entering lands on cavern floor');
  ok(cave.sight <= 4, 'caves: dark below even by day', 'sight ' + cave.sight);
  ok(cave.x === 34 && cave.y === 67, 'caves: the stair-stone leads back out',
    cave.x + ',' + cave.y);

  // -- the waystation: a paid bed mends you and turns the night -------------
  const rest = await page.evaluate(() => {
    const orla = npcs.find(n => n.id === 'orla');
    inv.gold = 20; P.hp = 3; const t0 = time;
    orla.topics.rest.choice.a.text();
    return { gold: inv.gold, hp: P.hp, day: !isNight(), advanced: time > t0 };
  });
  ok(rest.gold === 15, 'inn: the bed costs 5 gold', String(rest.gold));
  ok(rest.hp === 10, 'inn: sleep mends you whole');
  ok(rest.day && rest.advanced, 'inn: you wake with the morning light');
  const shrooms = await page.evaluate(() =>
    objects.filter(o => o.type === 'mushroom' && grid[o.y][o.x] === 'v').length);
  ok(shrooms === 12, 'caves: a dozen bluecaps grow below', String(shrooms));

  // -- the Hollow Wardens: one per cache, independent, permanently slain ----
  const warden = await page.evaluate(() => {
    placeWarden();                               // reachability cleared mobs
    const both = mobs.filter(m => m.type === 'warden');
    const posts = both.map(m => m.post).sort().join(',');
    const onFloor = both.every(m => grid[m.y][m.x] === 'v');
    inv.sword = 1;
    const ridge = both.find(m => m.post === 'ridge');
    let hits = 0;
    while (mobs.includes(ridge) && hits < 10) { attackMob(ridge); hits++; }
    const outcropAlive = mobs.some(m => m.type === 'warden' && m.post === 'outcrop');
    const outcrop = mobs.find(m => m.post === 'outcrop');
    while (mobs.includes(outcrop)) attackMob(outcrop);
    placeWarden();                               // must NOT respawn once slain
    const out = {
      posts, onFloor, hits, heartwood: inv.heartwood, outcropAlive,
      bothSlain: !!F.wardenSlain_ridge && !!F.wardenSlain_outcrop,
      stayedDead: !mobs.some(m => m.type === 'warden'),
    };
    inv.sword = 0;
    return out;
  });
  ok(warden.posts === 'outcrop,ridge', 'wardens: one per cache', warden.posts);
  ok(warden.onFloor, 'wardens: both stand on cavern floor');
  ok(warden.hits === 5, 'wardens: five sword blows fell one', String(warden.hits));
  ok(warden.outcropAlive, 'wardens: slaying one leaves the other at its post');
  ok(warden.heartwood === 1 && warden.bothSlain, 'wardens: one heartwood, both falls remembered');
  ok(warden.stayedDead, 'wardens: the dead do not re-post');

  // -- the knife: the missing rung between fists and star-metal -------------
  const knife = await page.evaluate(() => {
    inv.knife = 1; inv.sword = 0;
    const dmg = weaponDmg();
    mobs.length = 0;
    mobs.push({ type:'slime', hp:3, x:P.x+1, y:P.y, rx:P.x+1, ry:P.y, dir:'left' });
    const m = mobs[0];
    attackMob(m); attackMob(m);
    const dead = !mobs.includes(m);
    inv.knife = 0; mobs.length = 0;
    return { dmg, dead };
  });
  ok(knife.dmg === 2, 'knife: honest steel does 2', String(knife.dmg));
  ok(knife.dead, 'knife: two cuts finish a slime');

  // -- schedules: dusk sends folk home, dawn sends them back ----------------
  const sched = await page.evaluate(() => {
    mobs.length = 0;
    time = 320;                                  // nightfall
    for (let i = 0; i < 90; i++) npcTick();
    const gap = (id, spot) => {
      const n = npcs.find(n => n.id === id);
      return Math.abs(n.x - spot[0]) + Math.abs(n.y - spot[1]);
    };
    const night = {
      col: gap('col', npcs.find(n=>n.id==='col').night),
      bren: gap('bren', npcs.find(n=>n.id==='bren').night),
      dag: gap('dag', npcs.find(n=>n.id==='dag').night),
    };
    time = 360;                                // the deep of night
    const chapelLocked = !astar(P.x, P.y,
      (x, y) => Math.abs(x-110)<=1 && Math.abs(y-14)<=1, 110, 14);
    time = 320;
    time = 60;                                   // morning
    for (let i = 0; i < 90; i++) npcTick();
    const day = {
      bren: gap('bren', [npcs.find(n=>n.id==='bren').dx0, npcs.find(n=>n.id==='bren').dy0]),
      dag: gap('dag', [npcs.find(n=>n.id==='dag').dx0, npcs.find(n=>n.id==='dag').dy0]),
    };
    computeFOV();
    return { night, day, chapelLocked };
  });
  ok(sched.night.col <= 4 && sched.night.bren <= 4 && sched.night.dag <= 4,
    'schedules: at dusk, folk head for their beds', JSON.stringify(sched.night));
  ok(sched.day.bren <= 4 && sched.day.dag <= 4,
    'schedules: at dawn, back to their posts', JSON.stringify(sched.day));
  ok(sched.chapelLocked, 'schedules: the chapel bars its door at night');

  // -- midnight runners: spawn deep at night, walk the route, vanish by day -
  const run = await page.evaluate(() => {
    mobs.length = 0;
    time = 360;                                  // the deep of night
    spawnRunner();
    const spawned = !!runner && runner.route.length > 120;
    const x0 = runner.x;
    for (let i = 0; i < 30; i++) runnerTick();
    const moved = runner && (runner.x !== x0 || runner.route.length < 100);
    // stand in its path with eyes on it
    P.x = runner.x; P.y = runner.y + 2; P.rx = P.x; P.ry = P.y; computeFOV();
    for (let i = 0; i < 6; i++) runnerTick();
    const seen = !!F.sawRunner;
    time = 60; runnerTick();                     // dawn
    const gone = runner === null;
    P.x = 21; P.y = 110; P.rx = 21; P.ry = 110; computeFOV();
    return { spawned, moved, seen, gone };
  });
  ok(run.spawned, 'runners: one sets out in the deep of night');
  ok(run.moved, 'runners: it walks its route');
  ok(run.seen, 'runners: witnessed at close range, remembered');
  ok(run.gone, 'runners: gone by first light');

  // -- closing time: shops trade by day, bar the counter at night -----------
  const hours = await page.evaluate(() => {
    const tobin = npcs.find(n => n.id === 'tobin');
    time = 60; openDlg(tobin);
    const dayTrade = [...document.querySelectorAll('#dlgChips button')]
      .some(b => b.textContent === 'Trade');
    closeDlg();
    time = 320; openDlg(tobin);
    const nightTrade = [...document.querySelectorAll('#dlgChips button')]
      .some(b => b.textContent === 'Trade');
    const closedLine = document.getElementById('dlgTxt').innerHTML.includes('Sunup');
    closeDlg(); time = 60; computeFOV();
    return { dayTrade, nightTrade, closedLine };
  });
  ok(hours.dayTrade, 'shops: trade by day');
  ok(!hours.nightTrade && hours.closedLine, 'shops: barred at night, with a word about it');

  // -- small lights: a spared wisp drifts to hidden things ------------------
  const wispy = await page.evaluate(() => {
    mobs.length = 0;
    const stash = objects.splice(0);             // a controlled, empty world
    objects.push({ x: 70, y: 80, type: 'herb' });
    mobs.push({ type:'wisp', hp:1, x:64, y:80, rx:64, ry:80, dir:'right' });
    for (let i = 0; i < 60 && mobs.length; i++) mobTick();
    const settled = mobs.length === 0;
    objects.splice(0); objects.push(...stash);   // restore the vale
    return { settled };
  });
  ok(wispy.settled, 'wisps: drift to the hidden thing and go out upon it');

  // -- the ledger: locked away by day, damning at deep night ----------------
  const ledger = await page.evaluate(() => {
    mobs.length = 0;
    time = 60;                                   // by day: nothing to find
    P.x = 110; P.y = 16; P.rx = 110; P.ry = 16; computeFOV();
    path = [{ x: 109, y: 16 }]; step();
    const dayRead = !!F.readLedger;
    time = 360;                                  // the small hours
    P.x = 110; P.y = 16; P.rx = 110; P.ry = 16; computeFOV();
    path = [{ x: 109, y: 16 }]; step();
    const nightRead = !!F.readLedger && knownTopics.has('ledger');
    const marenHasTopic = !!npcs.find(n => n.id === 'maren').topics.ledger.cond();
    time = 60;
    P.x = 21; P.y = 110; P.rx = 21; P.ry = 110; computeFOV();
    return { dayRead, nightRead, marenHasTopic };
  });
  ok(!ledger.dayRead, 'ledger: locked away by day');
  ok(ledger.nightRead, 'ledger: read in the small hours, word learned');
  ok(ledger.marenHasTopic, 'ledger: Maren will hear of it');

  // -- the cache: tarred shut until you know better, then it talks ----------
  const cache = await page.evaluate(() => {
    mobs.length = 0;
    const wasRead = F.readLedger; F.readLedger = false; F.sawRunner = false;
    P.x = 25; P.y = 119; P.rx = 25; P.ry = 119; computeFOV();
    path = [{ x: 24, y: 119 }]; step();
    const tarred = !F.openedCache && inv.blank === 0;
    F.readLedger = true;
    P.x = 25; P.y = 119; P.rx = 25; P.ry = 119;
    path = [{ x: 24, y: 119 }]; step();
    const pried = F.openedCache && inv.blank === 1 && knownTopics.has('blanks');
    const maren = !!npcs.find(n => n.id === 'maren').topics.blanks.cond();
    const serra = !!npcs.find(n => n.id === 'serra').topics.blanks.cond();
    F.readLedger = wasRead;
    P.x = 21; P.y = 110; P.rx = 21; P.ry = 110; computeFOV();
    return { tarred, pried, maren, serra };
  });
  ok(cache.tarred, 'cache: tarred shut until you know what you are looking at');
  ok(cache.pried, 'cache: pried once wise — a blank in the pocket, a word learned');
  ok(cache.maren && cache.serra, 'cache: Maren and Serra have words for it');

  // -- the Vigil: with both artifacts in hand, the stone speaks -------------
  const vigil = await page.evaluate(() => {
    mobs.length = 0;
    // heartwood, blank, ledger, and cache flags are all set by earlier tests
    P.x = 22; P.y = 14; P.rx = 22; P.ry = 14; computeFOV();
    path = [{ x: 22, y: 13 }]; step();           // first touch (companionable silence or first visit)
    P.x = 22; P.y = 14; path = [{ x: 22, y: 13 }]; step();  // and the reveal
    return {
      revealed: !!F.vigilRevealed,
      topic: knownTopics.has('vigil'),
      yseult: !!npcs.find(n => n.id === 'yseult').topics.vigil.cond(),
      bren: !!npcs.find(n => n.id === 'bren').topics.vigil.cond(),
      ch2: !!F.ch2Ended,
    };
  });
  await page.waitForTimeout(3600);               // the end card takes a breath first
  vigil.card = await page.evaluate(() => {
    const shown = document.getElementById('endcard').style.display === 'block'
      && document.getElementById('endTxt').innerHTML.includes('Gardener');
    document.getElementById('endcard').style.display = 'none';
    P.x = 21; P.y = 110; P.rx = 21; P.ry = 110; computeFOV();
    return shown;
  });
  ok(vigil.revealed && vigil.topic, 'vigil: the stone speaks to laden hands');
  ok(vigil.yseult && vigil.bren, 'vigil: the seer and the guard have their say');
  ok(vigil.ch2 && vigil.card, 'vigil: Chapter Two closes, the Gardener is named');

  // -- wolves: the pack angers together, the pelt pays twice over -----------
  const wolves = await page.evaluate(() => {
    mobs.length = 0;
    inv.sword = 1;
    mobs.push({ type:'wolf', hp:5, x:P.x+1, y:P.y, rx:P.x+1, ry:P.y, dir:'left' });
    mobs.push({ type:'wolf', hp:5, x:P.x+5, y:P.y, rx:P.x+5, ry:P.y, dir:'left' });
    const near = mobs[0], far = mobs[1];
    attackMob(near);
    const packAngry = far.angry === true;
    attackMob(near);                              // 5hp / 3dmg = dead on second blow
    const pelts = inv.pelt;
    const tobinBuys = SHOPS.tobin.buys.some(b => b.id === 'pelt' && b.price === 4);
    const serraBuys = SHOPS.serra.buys.some(b => b.id === 'pelt' && b.price === 8);
    inv.sword = 0; mobs.length = 0; P.hp = P.maxHp; updHud();
    return { packAngry, pelts, tobinBuys, serraBuys };
  });
  ok(wolves.packAngry, 'wolves: wounding one rouses the pack');
  ok(wolves.pelts === 1, 'wolves: a felled wolf yields its pelt', String(wolves.pelts));
  ok(wolves.tobinBuys && wolves.serraBuys, 'wolves: pelts sell for 4 near, 8 far');

  // -- twin altars: offerings paid in Love, the wax read in Truth -----------
  const altars = await page.evaluate(() => {
    inv.bread = 2;
    const love0 = V.love, truth0 = V.truth;
    WEEPING_ALTAR.topics.bread.text();
    const fed = inv.bread === 1 && V.love === love0 + 2 && !!F.fedWeeping;
    const onceOnly = !WEEPING_ALTAR.topics.bread.cond();
    KNEELING_ALTAR.topics.wax.text();
    const waxed = !!F.studiedWax && V.truth === truth0 + 1;
    const waxOnce = !KNEELING_ALTAR.topics.wax.cond();
    inv.bread = 0;
    return { fed, onceOnly, waxed, waxOnce };
  });
  ok(altars.fed, 'altars: bread laid, Love paid');
  ok(altars.onceOnly, 'altars: the bowl asks only once');
  ok(altars.waxed && altars.waxOnce, 'altars: the wax reads once, in Truth');

  // -- mercy: the beaten run, and letting them go is noticed ----------------
  const mercy = await page.evaluate(() => {
    mobs.length = 0;
    P.x = 40; P.y = 86; P.rx = 40; P.ry = 86; computeFOV();   // open wilds — town ground forbids beasts
    mobs.push({ type:'wolf', hp:2, x:P.x+1, y:P.y, rx:P.x+1, ry:P.y, dir:'left' });
    const w = mobs[0];
    attackMob(w);                                // fists: 1 damage → 1hp = flee threshold
    const fled = w.fleeing === true;
    const d0 = Math.abs(w.x-P.x)+Math.abs(w.y-P.y);
    for (let i = 0; i < 6; i++) mobTick();
    const dNow = mobs.includes(w) ? Math.abs(w.x-P.x)+Math.abs(w.y-P.y) : 99;
    const love0 = V.love, hadMercy = F.showedMercy;
    for (let i = 0; i < 30 && mobs.includes(w); i++) mobTick();
    const escaped = !mobs.includes(w);
    const loved = F.showedMercy && (hadMercy || V.love === love0 + 1);
    mobs.length = 0;
    P.x = 21; P.y = 110; P.rx = 21; P.ry = 110; computeFOV();
    return { fled, gained: dNow > d0, escaped, loved };
  });
  ok(mercy.fled, 'mercy: the beaten wolf breaks and runs');
  ok(mercy.gained, 'mercy: it puts ground between you');
  ok(mercy.escaped && mercy.loved, 'mercy: letting it live is quietly noticed');

  // -- the under-dark: a stair down, a dimmer light, a way back up ----------
  const deep = await page.evaluate(() => {
    mobs.length = 0;
    inv.lantern = 1;
    P.x = 120; P.y = 123; P.rx = 120; P.ry = 123; computeFOV();
    path = [{ x: 121, y: 123 }]; step();         // onto the down-stair
    const below = inDeep(), tile = grid[P.y][P.x], sight = sightRadius();
    P.x = 47; P.y = 5; P.rx = 47; P.ry = 5;
    path = [{ x: 46, y: 5 }]; step();            // onto the way out
    const back = P.x === 120 && P.y === 122 && !inDeep();
    inv.lantern = 0;
    P.x = 21; P.y = 110; P.rx = 21; P.ry = 110; computeFOV();
    return { below, tile, sight, back };
  });
  ok(deep.below && deep.tile === 'v', 'under-dark: the stair descends to cavern floor');
  ok(deep.sight === 5, 'under-dark: even the lantern gutters', 'sight ' + deep.sight);
  ok(deep.back, 'under-dark: the pale stone leads back to the outcrop');

  // -- the draught: bluecaps become a sturdier heart, twice, never thrice ---
  const draught = await page.evaluate(() => {
    const y = npcs.find(n => n.id === 'yseult');
    inv.mushroom = 9;
    const refuse = y.topics.draught.text();
    const refused = P.maxHp === 10 && refuse.includes('You carry 9');
    inv.mushroom = 10;
    y.topics.draught.text();
    const first = P.maxHp === 13 && P.hp === 13 && inv.mushroom === 0;
    inv.mushroom = 15;
    y.topics.draught.text();
    const second = P.maxHp === 16 && inv.mushroom === 0;
    const noThird = !y.topics.draught.cond();
    saveGame();
    return { refused, first, second, noThird };
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(600);
  draught.persisted = await page.evaluate(() => P.maxHp === 16);
  await page.evaluate(() => localStorage.clear());
  ok(draught.refused, 'draught: nine bluecaps do not a brewing make');
  ok(draught.first && draught.second, 'draught: two brewings, +3 utmost health each');
  ok(draught.noThird, 'draught: the third cup is refused');
  ok(draught.persisted, 'draught: the sturdier heart survives a reload');

  // -- the critical path: Chapter One's whole quest, end to end -------------
  const story = await page.evaluate(() => {
    const by = id => npcs.find(n => n.id === id);
    by('maren').greet();                          // the letter's author, the word 'murder'
    by('maren').topics.murder.text();             // piet, the stable, permission to look
    P.x = 16; P.y = 106; examineBody();           // the medallion in the straw
    const medallion = !!F.hasMedallion && knownTopics.has('medallion');
    by('tobin').topics.medallion.text();          // 'Ironvale, I'd say'
    by('serra').topics.medallion.text();          // the chapel bench, Brother Malvo
    by('malvo').topics.medallion.choice.a.text(); // press him — the slip
    const slipped = !!F.malvoSlip && knownTopics.has('slip');
    by('maren').topics.slip.text();               // 'the Path was here for it'
    return { medallion, slipped };
  });
  await page.waitForTimeout(3200);                // the end card takes its beat
  story.ended = await page.evaluate(() => {
    const shown = document.getElementById('endcard').style.display === 'block'
      && document.getElementById('endTxt').innerHTML.includes('The Ledger of Worth');
    document.getElementById('endcard').style.display = 'none';
    P.x = 21; P.y = 110; P.rx = 21; P.ry = 110; computeFOV();
    return shown;
  });
  ok(story.medallion, 'critical path: the medallion leaves the stable');
  ok(story.slipped, 'critical path: Malvo says the thing he was never told');
  ok(story.ended, 'critical path: Chapter One ends where it always did');

  // -- the gardener's row: only trees, until you know better ----------------
  const grove = await page.evaluate(() => {
    const was = F.vigilRevealed;
    F.vigilRevealed = false;
    const before = GARDENERS_ROW.greet();
    const mundane = before.includes('only trees') && !GARDENERS_ROW.topics.trowel.cond();
    F.vigilRevealed = true;
    const after = GARDENERS_ROW.greet();
    const nursery = after.includes('nursery');
    GARDENERS_ROW.topics.trowel.text();
    const hooked = knownTopics.has('gardener');
    const yseult = !!npcs.find(n => n.id === 'yseult').topics.gardener.cond();
    const malvoText = npcs.find(n => n.id === 'malvo').topics.gardener.text();
    const malvo = !!F.askedMalvoGardener && malvoText.includes('no garden');
    F.vigilRevealed = was;
    return { mundane, nursery, hooked, yseult, malvo };
  });
  ok(grove.mundane, "grove: before the Vigil, only trees. Probably.");
  ok(grove.nursery && grove.hooked, 'grove: after the Vigil, a nursery — and a small handprint');
  ok(grove.yseult && grove.malvo, 'grove: the seer is afraid; the chapel keeps no garden');

  // -- the hollow gate: found by the wise, kept by the third warden ---------
  const gate = await page.evaluate(() => {
    mobs.length = 0;
    // 'gardener' is known from the grove test — the third post should stand
    placeWarden();
    const sentry = mobs.find(m => m.type === 'warden' && m.post === 'gate');
    const posted = !!sentry && sentry.x === 5 && sentry.y === 15;
    // approach the door (from the cleared stand, not through the sentry)
    P.x = 5; P.y = 17; P.rx = 5; P.ry = 17; computeFOV();
    path = [{ x: 5, y: 16 }]; step();
    const found = !!F.foundGate && knownTopics.has('gate');
    const yseult = !!npcs.find(n => n.id === 'yseult').topics.gate.cond();
    const dag = !!npcs.find(n => n.id === 'dag').topics.gate.cond();
    inv.sword = 1;
    while (mobs.includes(sentry)) attackMob(sentry);
    const fell = !!F.wardenSlain_gate;
    placeWarden();
    const staysDown = !mobs.some(m => m.post === 'gate');
    inv.sword = 0; mobs.length = 0;
    P.x = 21; P.y = 110; P.rx = 21; P.ry = 110; computeFOV();
    return { posted, found, yseult, dag, fell, staysDown };
  });
  ok(gate.posted, 'gate: the third Warden takes its stand once you know to look');
  ok(gate.found, 'gate: the sealed door is found, the word learned');
  ok(gate.yseult && gate.dag, 'gate: the seer names the seal; Dag names his drills');
  ok(gate.fell && gate.staysDown, 'gate: the third Warden falls and stays fallen');

  // -- the small hand: Col names his boy, and every door answers ------------
  const joren = await page.evaluate(() => {
    const by = id => npcs.find(n => n.id === id);
    // 'gardener' is known from the grove test
    const colSees = by('col').topics.gardener.cond();
    by('col').topics.gardener.text();
    const named = !!F.gardenerNamed && knownTopics.has('joren');
    const onceOnly = !by('col').topics.gardener.cond();
    by('col').topics.joren.text();
    const quest = !!F.jorenQuest;
    const maren = !!by('maren').topics.joren.cond();
    const yseult = !!by('yseult').topics.joren.cond();
    const threat = by('malvo').topics.joren.text();
    const threatened = !!F.malvoThreatened && threat.includes('choose between');
    return { colSees, named, onceOnly, quest, maren, yseult, threatened };
  });
  ok(joren.colSees && joren.named && joren.onceOnly, 'joren: Col knows the trowel, once, forever');
  ok(joren.quest, "joren: 'Bring him back. HIM.'");
  ok(joren.maren && joren.yseult, 'joren: the Elder weighs the entry; the seer names the crime');
  ok(joren.threatened, 'joren: Malvo stops smiling');

  // -- the boy in the rows: found at deep night, told the truth -------------
  const boy = await page.evaluate(() => {
    // F.jorenQuest is set by the naming test
    time = 360; jorenTick();
    const present = !!joren && joren.x === 11 && joren.y === 27;
    const doorTopic = JOREN.topics.door.cond();          // 'gate' is known
    const told = JOREN.topics.father.choice.a.text();
    const truth = !!F.toldJoren && told.includes('He asks for me first');
    const onceOnly = !JOREN.topics.father.cond();
    const colAfter = npcs.find(n => n.id === 'col').topics.joren.text();
    const colKnows = colAfter.includes('You SPOKE to him');
    time = 60; jorenTick();
    const gone = joren === null;
    computeFOV();
    return { present, doorTopic, truth, onceOnly, colKnows, gone };
  });
  ok(boy.present, 'joren: in the rows, in the small hours');
  ok(boy.doorTopic && boy.truth && boy.onceOnly, 'joren: the truth is told once, and lands');
  ok(boy.colKnows, 'joren: Col grips your arm with both hands');
  ok(boy.gone, 'joren: gone by daylight');

  // -- the watch passes: homecoming first, then the Gate takes your measure -
  const finale = await page.evaluate(() => {
    // the boy waits (told the truth in the last test)
    time = 360; jorenTick();
    const waiting = JOREN.greet().includes('You came back');
    JOREN.topics.home.choice.a.text();
    const home = !!F.jorenHome && joren === null;
    const colText = npcs.find(n => n.id === 'col').topics.joren.text();
    const grateful = !!F.colThanked && colText.includes('every door I ever own is yours');
    const malvoCold = npcs.find(n => n.id === 'malvo').topics.joren.text().includes('Some crops reseed');
    // unworthy first: the seal keeps its counsel
    const loveReal = V.love; V.love = -1;
    P.x = 5; P.y = 17; P.rx = 5; P.ry = 17; computeFOV();
    path = [{ x: 5, y: 16 }]; step();
    const withheld = !F.watchPassed;
    V.love = Math.max(1, loveReal);
    P.x = 5; P.y = 17; path = [{ x: 5, y: 16 }]; step();
    const passed = !!F.watchPassed && !!F.ch3Ended;
    return { waiting, home, grateful, malvoCold, withheld, passed };
  });
  await page.waitForTimeout(3800);
  finale.card = await page.evaluate(() => {
    const shown = document.getElementById('endcard').style.display === 'block'
      && document.getElementById('endTxt').innerHTML.includes('rolls over in its sleep');
    document.getElementById('endcard').style.display = 'none';
    time = 60; P.x = 21; P.y = 110; P.rx = 21; P.ry = 110; computeFOV();
    return shown;
  });
  ok(finale.waiting && finale.home, 'finale: the boy walks home in one shadow');
  ok(finale.grateful && finale.malvoCold, 'finale: every door of Col\'s is yours; some crops reseed');
  ok(finale.withheld, 'finale: the seal keeps its counsel from the unanswered');
  ok(finale.passed && finale.card, 'finale: the watch passes, Chapter Three closes');

  // -- zero page errors, checked last so it covers everything above ---------
  ok(pageErrors.length === 0, 'zero page errors', pageErrors.join(' | '));
} finally {
  await browser.close();
  server.kill();
}

console.log(failures === 0 ? `\nALL GREEN (${LABEL})` : `\n${failures} FAILURE(S) (${LABEL})`);
process.exit(failures === 0 ? 0 : 1);
