/**
 * Comprobación en Chrome real de los efectos de movimientos, los iconos de
 * estado y los objetos de la mazmorra. Requiere `npm run build`.
 * Uso: npm run fx-check
 *
 *  1. Objetos: coloca cada objeto del juego junto al jugador, comprueba que se
 *     dibuja con su icono original (no el placeholder) y recoge uno andando.
 *  2. Movimientos: pone un enemigo enfrente y usa varios movimientos; comprueba
 *     que aparece su efecto original (y el proyectil de Pistola Agua).
 *  3. Estados: aplica cada estado al jugador y a un enemigo, comprueba que sale
 *     su icono (uno solo por Pokémon) y que desaparece al curarse.
 * Capturas en smoke-output/fx-*.png
 */
import { chromium, type Page } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
import { startServer } from '../src/server/app';
import { ITEMS } from '../src/shared/data/items';
import { STATUSES } from '../src/shared/data/statuses';
import { TRAPS } from '../src/shared/data/traps';
import { MOVE_FX_IDS, hitReactionFx, moveFx } from '../src/client/assets/moveFx';

const BROWSERS = [process.env.BROWSER_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].filter(Boolean) as string[];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Movimientos a probar (uno de cada tipo de efecto/alcance). */
const MOVES = ['ember', 'waterGun', 'scratch', 'razorLeaf', 'thunderShock', 'bite', 'peck', 'growl', 'smokescreen', 'hypnosis', 'harden'];

const G = <T>(p: Page, body: string) => p.evaluate(`(() => { const w = window.__pokerift; const sc = w.app.game.scene.getScene('dungeon'); const s = w.state; const me = s.entities.find((e) => e.playerId === 'local'); ${body} })()`) as Promise<T>;

async function main() {
  if (!existsSync('dist/index.html')) throw new Error('Falta dist/: ejecuta npm run build');
  mkdirSync('smoke-output', { recursive: true });
  const exe = BROWSERS.find((b) => existsSync(b));
  if (!exe) throw new Error('No se encontró Chrome/Edge');
  const server = await startServer({ port: 0, turnTimeoutSeconds: 0, quiet: true });
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  let ok = true;
  const check = (c: boolean, m: string) => {
    console.log(`${c ? '✔' : '✖'} ${m}`);
    if (!c) ok = false;
  };
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://localhost:${server.port}/`);
  await page.waitForFunction(() => (window as any).__pokerift?.scene === 'intro', null, { timeout: 15000 });
  await page.evaluate(`(() => { const a = window.__pokerift.app; a.solo = { name: 'Test', species: 'charmander', seed: 'fx' }; a.enterDungeonSolo('expedition'); })()`);
  await page.waitForFunction(() => (window as any).__pokerift?.scene === 'dungeon', null, { timeout: 10000 });
  await sleep(1500);
  /** Pasa un turno (esperar) para que la escena se sincronice con el estado modificado. */
  const passTurn = async () => {
    const t0 = await G<number>(page, 'return s.turn;');
    for (let i = 0; i < 20 && (await G<number>(page, 'return s.turn;')) === t0; i++) {
      await page.keyboard.press('KeyX'); // si la escena aún anima, la tecla se ignora: se reintenta
      await sleep(250);
    }
    // La escena se sincroniza con el estado al terminar de animar los eventos del turno.
    for (let i = 0; i < 40 && (await G<boolean>(page, 'return sc.busy || sc.queue.length > 0;')); i++) await sleep(100);
    await sleep(150);
  };

  // ── 1. Objetos ──
  await G(page, `s.entities = s.entities.filter((e) => e.team !== 'enemy'); s.spawnCountdown = 99999; s.rules.floorTurnLimit = 99999;
    const free = []; for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) { const x = me.pos.x + dx, y = me.pos.y + dy;
      if ((dx || dy) && s.map.tiles[y * s.map.width + x] === 1 && !s.items.some((i) => i.pos.x === x && i.pos.y === y) && !(s.map.stairs.x === x && s.map.stairs.y === y)) free.push({ x, y }); }
    s.items = s.items.filter((i) => Math.abs(i.pos.x - me.pos.x) > 3 || Math.abs(i.pos.y - me.pos.y) > 2);
    ${JSON.stringify(Object.keys(ITEMS))}.forEach((id, i) => free[i] && s.items.push({ id: 'test-' + id, item: id, pos: free[i], amount: id === 'poke' ? 10 : 1 }));`);
  await passTurn();
  const floor = await G<{ shown: string[]; ph: string[] }>(page, `const out = { shown: [], ph: [] };
    for (const it of s.items.filter((i) => i.id.startsWith('test-'))) { const img = sc.itemSprites.get(it.id); if (!img) continue; (img.texture.key.startsWith('item-') ? out.shown : out.ph).push(it.item); }
    return out;`);
  check(floor.shown.length === Object.keys(ITEMS).length && floor.ph.length === 0, `objetos en el suelo con icono original: ${floor.shown.length}/${Object.keys(ITEMS).length}${floor.ph.length ? ' (placeholder: ' + floor.ph.join(', ') + ')' : ''}`);
  await page.screenshot({ path: 'smoke-output/fx-objetos.png' });
  // Trampas reveladas, en la fila de debajo del jugador (lejos de los objetos).
  await G(page, `const W = s.map.width; let n = 0; s.traps = s.traps.filter((t) => !t.id.startsWith('test-'));
    for (const id of ${JSON.stringify(Object.keys(TRAPS))}) { for (let k = 0; k < 40; k++) { const x = me.pos.x - 4 + (k % 9), y = me.pos.y + 3 + Math.floor(k / 9);
      if (s.map.tiles[y * W + x] === 1 && !s.traps.some((t) => t.pos.x === x && t.pos.y === y) && !s.items.some((i) => i.pos.x === x && i.pos.y === y)) { s.traps.push({ id: 'test-' + id, trap: id, pos: { x, y }, revealed: true }); break; } } }`);
  await passTurn();
  const traps = await G<Record<string, string>>(page, `const o = {}; for (const t of s.traps.filter((t) => t.id.startsWith('test-'))) { const img = sc.trapSprites.get(t.id); o[t.trap] = img ? img.texture.key : 'sin sprite'; } return o;`);
  const real = Object.entries(traps).filter(([, k]) => k.startsWith('trap-')).map(([id]) => id);
  // Con la ROM importada todas tienen su casilla (dungeon.bin 1033); sin ella, las 4 recortadas de la hoja.
  const expected = existsSync('public/assets/dungeon/eos/tiles.json') ? Object.keys(TRAPS).length : 4;
  check(real.length === expected, `trampas con casilla original: ${real.join(', ')} (placeholder: ${Object.entries(traps).filter(([, k]) => k.startsWith('ph-')).map(([id]) => id).join(', ')})`);
  await page.screenshot({ path: 'smoke-output/fx-trampas.png' });
  // Recoger: el objeto de la casilla de al lado (en cruz), andando.
  const target = await G<{ key: string; item: string; id: string } | null>(page, `const keys = { '1,0': 'ArrowRight', '-1,0': 'ArrowLeft', '0,1': 'ArrowDown', '0,-1': 'ArrowUp' };
    for (const it of s.items) { const k = (it.pos.x - me.pos.x) + ',' + (it.pos.y - me.pos.y); if (keys[k] && it.id.startsWith('test-')) return { key: keys[k], item: it.item, id: it.id }; } return null;`);
  if (target) {
    const bag0 = await G<number>(page, `return s.bag.length + s.money;`);
    await page.keyboard.down(target.key);
    await sleep(130);
    await page.keyboard.up(target.key);
    await sleep(700);
    const after = await G<{ bag: number; onFloor: boolean; sprite: boolean }>(page, `return { bag: s.bag.length + s.money, onFloor: s.items.some((i) => i.id === '${target.id}'), sprite: sc.itemSprites.has('${target.id}') };`);
    check(!after.onFloor && !after.sprite && after.bag > bag0, `se recoge ${target.item} andando (ya no está en el suelo y la mochila/dinero sube)`);
  } else check(false, 'hay un objeto en una casilla contigua para recogerlo');
  await page.keyboard.press('KeyI');
  await sleep(300);
  const icons = await page.$$eval('#hud-bag img.item-icon', (els) => els.length);
  check(icons > 0, `la mochila muestra los iconos originales (${icons})`);
  await page.screenshot({ path: 'smoke-output/fx-mochila.png' });
  await page.keyboard.press('Escape');
  await sleep(200);

  // ── 2. Movimientos ──
  // Un enemigo con mucha vida, enfrente del jugador (a la derecha, o donde haya suelo).
  const placed = await G<boolean>(page, `const W = s.map.width; const walk = (x, y) => s.map.tiles[y * W + x] === 1 && !s.items.some((i) => i.pos.x === x && i.pos.y === y);
    const dirs = [[2, 1, 0], [6, -1, 0], [0, 0, 1], [4, 0, -1]]; const d = dirs.find(([, dx, dy]) => walk(me.pos.x + dx, me.pos.y + dy)); if (!d) return false;
    me.facing = d[0]; const e = JSON.parse(JSON.stringify(me)); Object.assign(e, { id: 'test-enemy', playerId: undefined, team: 'enemy', species: 'wurmple', pos: { x: me.pos.x + d[1], y: me.pos.y + d[2] }, hp: 999, maxHp: 999, moves: [], statuses: [], facing: (d[0] + 4) % 8 });
    s.entities.push(e); me.hp = me.maxHp = 999; return true;`);
  check(placed, 'enemigo colocado enfrente');
  await passTurn();
  for (const id of MOVES) {
    // Cualquiera de sus efectos (las capas que tenga) o, si no tiene, la reacción al golpe.
    const e = moveFx(id)!;
    const want = [...Object.values(e.effects), ...(e.returnShot ? [e.returnShot] : []), ...['immune', 'notVeryEffective', 'neutral', 'superEffective'].map(hitReactionFx)].filter((k): k is string => !!k);
    const shotKey = e.effects.projectile ?? '';
    let seen = false, shot = !shotKey;
    let saw = '';
    for (let attempt = 0; attempt < 4 && !(seen && shot); attempt++) {
      await G(page, `me.moves = [{ id: '${id}', pp: 20, maxPp: 20 }]; const e = s.entities.find((x) => x.id === 'test-enemy'); if (e) { e.hp = 999; e.statuses = []; e.fainted = false; } me.statuses = []; me.hp = 999;`);
      await page.keyboard.press('Digit1');
      for (let i = 0; i < 30 && !(seen && shot); i++) {
        await sleep(40);
        const r = await G<{ fx: string; shot: boolean }>(page, `const keys = sc.children.list.map((c) => c.texture && c.texture.key); return { fx: ${JSON.stringify(want.map((k) => 'fx-' + k))}.find((k) => keys.includes(k)) ?? '', shot: keys.includes('fx-${shotKey}') };`);
        shot ||= r.shot;
        if (r.fx && !seen) {
          seen = true;
          saw = r.fx;
          await page.screenshot({ path: `smoke-output/fx-${id}.png`, clip: { x: 340, y: 180, width: 600, height: 400 } });
        }
      }
      await sleep(900);
    }
    check(seen, `${id}: se ve su efecto (${saw || 'ninguno de ' + want.join(', ')}) [${e.source}]`);
    if (shotKey) check(shot, `${id}: vuela su proyectil (${shotKey})`);
  }

  // ── 3. Estados ──
  // Según la tabla de iconos del juego: la parálisis no tiene icono; con varios, se alternan.
  const reset = `for (const x of [me, s.entities.find((y) => y.id === 'test-enemy')]) if (x) { x.statuses = []; for (const k of Object.keys(x.stages)) x.stages[k] = 0; }`;
  for (const st of Object.keys(STATUSES)) {
    await G(page, `${reset} const e = s.entities.find((x) => x.id === 'test-enemy'); me.statuses = [{ id: '${st}', turnsLeft: 50, counter: 0 }]; if (e) e.statuses = [{ id: '${st}', turnsLeft: 50, counter: 0 }, { id: 'poison', turnsLeft: null, counter: 0 }];`);
    await passTurn();
    const icons = await G<{ me: string; enemy: string; sprites: number }>(page, `const e = s.entities.find((x) => x.id === 'test-enemy');
      const ic = (id) => (sc.statusIcons.get(id)?.list ?? []).join(',');
      const sprites = sc.children.list.flatMap((c) => c.list || []).filter((c) => c.texture && c.texture.key.startsWith('status-') && c.parentContainer === sc.sprites.get(e.id)?.container).length;
      return { me: ic(me.id), enemy: ic(e.id), sprites };`);
    // Sin icono en el juego (parálisis) o sin identificar (amedrentado, velocidad reducida).
    const want = ['paralysis', 'cringe', 'slowed'].includes(st) ? '' : st;
    check(icons.me === want && icons.enemy === (want && want !== "poison" ? `${want},poison` : "poison") && icons.sprites === 1,
      `${st}: jugador [${icons.me || 'sin icono'}], enemigo [${icons.enemy}] en un solo icono que alterna (${icons.sprites})`);
    if (st === 'sleep') await page.screenshot({ path: 'smoke-output/fx-estados.png', clip: { x: 340, y: 180, width: 600, height: 400 } });
  }
  // Característica bajada: flechas hacia abajo.
  await G(page, `${reset} const e = s.entities.find((x) => x.id === 'test-enemy'); if (e) e.stages.def = -1;`);
  await passTurn();
  const lowered = await G<string>(page, `return (sc.statusIcons.get('test-enemy')?.list ?? []).join(',');`);
  check(lowered === 'lowered', `característica bajada: flechas hacia abajo sobre el enemigo [${lowered}]`);
  await G(page, reset);
  await passTurn();
  const left = await G<number>(page, `return sc.statusIcons.size;`);
  check(left === 0, `al curarse desaparecen los iconos (${left} restantes)`);

  // ── 4. Visor de efectos: cada movimiento del registro, uno a uno ──
  const viewer = await (await browser.newContext({ viewport: { width: 1280, height: 600 } })).newPage();
  viewer.on('pageerror', (e) => errors.push(`[visor] ${e.message}`));
  viewer.on('console', (m) => m.type() === 'error' && errors.push(`[visor] ${m.text()}`));
  await viewer.goto(`http://localhost:${server.port}/fx-viewer.html`);
  await viewer.waitForFunction(() => (window as any).__fxViewer?.ready, null, { timeout: 15000 });
  const bad: string[] = [];
  for (const id of MOVE_FX_IDS) {
    const e = moveFx(id)!;
    const expected = [...new Set([...Object.values(e.effects), ...(e.returnShot ? [e.returnShot] : [])])].filter((k) => !(e.returnShot && k === e.effects.primary));
    const spawned = (await viewer.evaluate(`(async () => { const v = window.__fxViewer.scene; await v.playMove('${id}'); return v.spawned; })()`)) as string[];
    const missing = expected.filter((k) => !spawned.includes(k));
    if (missing.length) bad.push(`${id}: faltan ${missing.join(', ')} (salieron: ${spawned.join(', ') || 'ninguno'})`);
    if (id === 'thunderShock') {
      await viewer.evaluate(`(() => { const v = window.__fxViewer.scene; void v.playMove('thunderShock'); })()`);
      await sleep(320);
      await viewer.screenshot({ path: 'smoke-output/fx-visor-thunderShock.png', clip: { x: 0, y: 0, width: 640, height: 480 } });
      await sleep(800);
    }
  }
  check(bad.length === 0, `visor: los ${MOVE_FX_IDS.length} movimientos del registro reproducen sus efectos${bad.length ? ':\n    ' + bad.join('\n    ') : ''}`);
  await viewer.screenshot({ path: 'smoke-output/fx-visor.png' });

  check(errors.length === 0, `sin errores${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  await server.close();
  console.log(ok ? '\nComprobación de efectos superada.' : '\nComprobación de efectos con fallos.');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
