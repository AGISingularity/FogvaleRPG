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
  ok(cave.chests === 5, 'caves: five chests wait below', String(cave.chests));
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
  ok(shrooms === 8, 'caves: eight bluecaps grow below', String(shrooms));

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
    const chapelLocked = !astar(P.x, P.y,
      (x, y) => Math.abs(x-110)<=1 && Math.abs(y-14)<=1, 110, 14);
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

  // -- zero page errors, checked last so it covers everything above ---------
  ok(pageErrors.length === 0, 'zero page errors', pageErrors.join(' | '));
} finally {
  await browser.close();
  server.kill();
}

console.log(failures === 0 ? `\nALL GREEN (${LABEL})` : `\n${failures} FAILURE(S) (${LABEL})`);
process.exit(failures === 0 ? 0 : 1);
