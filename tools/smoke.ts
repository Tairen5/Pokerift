/**
 * Prueba de humo en un navegador real (Chrome/Edge del sistema vía playwright-core).
 * Requiere `npm run build` antes. Uso: npm run smoke
 *  1. Solitario: intro → título → menú → configuración → casa → (a pie) Risco
 *     Sharpedo → Aldea Tesoro; capturas de la playa, el gremio y la Encrucijada;
 *     salida este de la Encrucijada → mazmorra.
 *  2. Cooperativo: dos navegadores crean/unen sala, aparecen juntos en casa, uno
 *     sale solo a otra zona, entran en la mazmorra, exploran/combaten sin
 *     divergencias y vuelven a la Encrucijada.
 * Guarda capturas en smoke-output/.
 */
import { chromium, type Page } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
import { startServer } from '../src/server/app';
import { spawnEnemy } from '../src/shared/engine/floor';
import type { Point } from '../src/shared/core/geometry';
import { entryPoint, getZone } from '../src/shared/town/zone';
import { routeTo } from '../src/shared/town/route';
import { isWalkable, roomIdAt } from '../src/shared/dungeon/map';

const BROWSERS = [
  process.env.BROWSER_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean) as string[];

const OUT = 'smoke-output';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!existsSync('dist/index.html')) throw new Error('Falta dist/: ejecuta npm run build');
  mkdirSync(OUT, { recursive: true });
  const exe = BROWSERS.find((b) => existsSync(b));
  if (!exe) throw new Error('No se encontró Chrome/Edge. Define BROWSER_PATH.');
  const server = await startServer({ port: 0, turnTimeoutSeconds: 0, quiet: true });
  const url = `http://localhost:${server.port}/`;
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const errors: string[] = [];
  const open = async (label: string) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`[${label}] ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`[${label}] ${m.text()}`));
    await page.goto(url);
    return page;
  };
  const G = <T>(p: Page, expr: string) => p.evaluate(`(() => { const w = window.__pokerift; return ${expr}; })()`) as Promise<T>;
  const scene = (p: Page) => G<string>(p, 'w.scene');
  const state = (p: Page) => G<string>(p, 'JSON.stringify(w.state)');
  const waitScene = async (p: Page, s: string, ms = 8000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if ((await scene(p)) === s) return true;
      await sleep(100);
    }
    return false;
  };
  let ok = true;
  const check = (cond: boolean, msg: string) => {
    console.log(`${cond ? '✔' : '✖'} ${msg}`);
    if (!cond) ok = false;
  };

  const townZone = (p: Page) => G<string | null>(p, 'w.townZone');
  const waitZone = async (p: Page, zoneId: string, ms = 5000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if ((await townZone(p)) === zoneId) return true;
      await sleep(100);
    }
    return false;
  };
  /**
   * Camina con el teclado hasta una salida de la zona actual, siguiendo la ruta
   * calculada sobre la colisión real (src/shared/town/route). Para al cambiar de
   * zona o al abrirse el diálogo de la salida.
   */
  const walkToExit = async (p: Page, exitId: string) => {
    const zone = getZone((await townZone(p))!);
    const rect = zone.exits.find((e) => e.id === exitId)!.rect;
    const route = routeTo(zone, (await G<Point>(p, 'w.townPos'))!, rect);
    if (!route) throw new Error(`sin ruta hasta ${zone.id}.${exitId}`);
    // Al final, se sigue empujando hacia el centro de la salida hasta pisarla.
    route.push({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 });
    const held = new Set<string>();
    const hold = async (keys: string[]) => {
      for (const k of [...held]) if (!keys.includes(k)) (held.delete(k), await p.keyboard.up(k));
      for (const k of keys) if (!held.has(k)) (held.add(k), await p.keyboard.down(k));
    };
    walk: for (const wp of route) {
      for (let i = 0; i < 150; i++) {
        const now = await G<{ zone: string | null; pos: Point | null; dialog: boolean }>(p, `({ zone: w.townZone, pos: w.townPos, dialog: !document.querySelector('#th-dialog')?.classList.contains('hidden') })`);
        if (now.zone !== zone.id || !now.pos || now.dialog) break walk;
        const dx = wp.x - now.pos.x, dy = wp.y - now.pos.y;
        if (Math.abs(dx) <= 3 && Math.abs(dy) <= 3) break;
        await hold([...(dx > 3 ? ['ArrowRight'] : dx < -3 ? ['ArrowLeft'] : []), ...(dy > 3 ? ['ArrowDown'] : dy < -3 ? ['ArrowUp'] : [])]);
        await sleep(10);
      }
    }
    await hold([]);
  };

  // ── 1. Solitario: intro completa ──
  const solo = await open('solo');
  check(await waitScene(solo, 'intro', 15000), 'arranca la intro');
  // Capturas en mitad de cada escena (aviso, Treasure Town, mar, tesoros, camino).
  const shots = [['intro-0-aviso', 1500], ['intro-1-treasure-town', 4300], ['intro-2-mar', 5900], ['intro-3-tesoros', 5900], ['intro-4-camino', 5900]] as const;
  for (const [name, ms] of shots) {
    await sleep(ms);
    await solo.screenshot({ path: `${OUT}/${name}.png` });
  }
  check(await waitScene(solo, 'title', 9000), 'la intro termina sola y lleva al título');
  await sleep(900);
  await solo.screenshot({ path: `${OUT}/titulo.png` });
  await solo.keyboard.press('Enter');
  check(await waitScene(solo, 'menu'), 'Intro en el título abre el menú principal');
  await sleep(600);
  await solo.screenshot({ path: `${OUT}/menu.png` });
  const menuState = () => G<[number, string[]]>(solo, '((m) => [m.index, m.options.map((o) => o.id)])(w.app.game.scene.getScene("menu"))');
  await solo.keyboard.press('ArrowUp'); // da la vuelta hasta «Otros»
  await solo.keyboard.press('Enter');
  await sleep(200);
  check((await menuState())[1].join() === 'speed,credits,back', 'el menú principal agrupa Velocidad y Créditos en «Otros», como el original');
  await solo.screenshot({ path: `${OUT}/menu-otros.png` });
  await solo.keyboard.down('KeyL');
  await sleep(150);
  await solo.screenshot({ path: `${OUT}/menu-ilustracion.png` });
  await solo.keyboard.up('KeyL');
  await solo.keyboard.press('Escape');
  await sleep(150);
  const [back, ids] = await menuState();
  check(ids[back] === 'other', 'Esc en «Otros» vuelve al menú principal');
  await solo.keyboard.press('ArrowDown'); // vuelta a «Solitario»
  await solo.keyboard.press('Enter'); // "Solitario"
  await solo.waitForSelector('#m-species');
  await solo.click('[data-sp="charmander"]');
  await sleep(300); // fundido de entrada del panel
  await solo.screenshot({ path: `${OUT}/menu-solitario.png` });
  await solo.click('#m-ok');
  check(await waitScene(solo, 'town'), 'tras el menú se aparece fuera de la mazmorra');
  check(await waitZone(solo, 'home'), 'se empieza dentro de casa (Risco Sharpedo)');
  await sleep(700);
  await solo.screenshot({ path: `${OUT}/zona-casa.png` });
  const p0 = await G<{ x: number; y: number }>(solo, 'w.townPos');
  await solo.keyboard.down('ArrowRight');
  await sleep(600);
  await solo.keyboard.up('ArrowRight');
  const p1 = await G<{ x: number; y: number }>(solo, 'w.townPos');
  check(p1.x > p0.x + 20, `el jugador se mueve por la casa (${p0.x.toFixed(0)} → ${p1.x.toFixed(0)})`);
  await walkToExit(solo, 'up');
  check(await waitZone(solo, 'bluff'), 'subiendo la escalera de casa se sale al Risco Sharpedo');
  await sleep(600);
  await solo.screenshot({ path: `${OUT}/zona-risco.png` });
  await walkToExit(solo, 'east');
  check(await waitZone(solo, 'town'), 'por el camino del este se llega a la Aldea Tesoro');
  await sleep(600);
  await solo.screenshot({ path: `${OUT}/zona-aldea-oeste.png` });
  // El resto de zonas, sin recorrerlas a pie: solo capturas para revisarlas.
  for (const [zoneId, entry, name] of [['town', 'fromCrossroads', 'aldea-este'], ['beach', 'fromCrossroads', 'playa'], ['guild', 'fromCrossroads', 'gremio'], ['crossroads', 'fromTown', 'encrucijada']]) {
    await solo.evaluate(([z, e]) => (window as any).__pokerift.app.toSoloTown(z, e), [zoneId, entry]);
    check(await waitZone(solo, zoneId), `zona ${zoneId} (${entry})`);
    await sleep(700);
    await solo.screenshot({ path: `${OUT}/zona-${name}.png` });
  }
  await walkToExit(solo, 'east');
  check(await solo.isVisible('#th-dialog'), 'la salida este de la Encrucijada ofrece ir a la expedición');
  await solo.screenshot({ path: `${OUT}/zona-encrucijada-salida.png` });
  await solo.keyboard.press('Enter');
  check(await waitScene(solo, 'dungeon'), 'la salida lleva a la mazmorra');
  await sleep(250);
  check(await solo.isVisible('#hud-floorcard:not(.hidden)'), 'al entrar se ve la pantalla negra con el nombre de la mazmorra y la planta');
  await solo.screenshot({ path: `${OUT}/mazmorra-piso.png` });
  await sleep(1600);
  check(!(await solo.isVisible('#hud-floorcard:not(.hidden)')), 'la pantalla del piso desaparece sola');
  const s0 = JSON.parse(await state(solo));
  check(s0?.floor === 1 && s0?.dungeonId === 'expedition', 'la expedición empieza en el piso 1 (Cueva Bajamar)');
  for (const k of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Space', 'ArrowRight', 'ArrowDown']) {
    await solo.keyboard.down(k);
    await sleep(320);
    await solo.keyboard.up(k);
  }
  await sleep(500);
  check(JSON.parse(await state(solo)).turn > 0, 'en la mazmorra los turnos avanzan con el teclado');
  await solo.screenshot({ path: `${OUT}/mazmorra-solo.png` });
  await solo.keyboard.press('KeyI');
  check(await solo.isVisible('#hud-bag'), 'la mochila se abre con I');
  await solo.screenshot({ path: `${OUT}/mazmorra-mochila.png` });
  await solo.keyboard.press('Escape');
  check(!(await solo.isVisible('#hud-bag')), 'la mochila se cierra con Esc');
  // Escaleras: Avanzar / Info / Cancelar, como el original.
  await G(solo, `w.app.game.scene.getScene('dungeon').hud.showStairsPrompt(true)`);
  await sleep(150);
  const labels = await solo.$$eval('#hud-prompt [data-choice]', (els) => els.map((e) => e.textContent?.trim()));
  check(labels.join(',') === 'Avanzar,Info,Cancelar', `menú de la escalera: ${labels.join(', ')}`);
  await G(solo, `((h) => { h.movePromptCursor(1); h.choosePrompt(); })(w.app.game.scene.getScene('dungeon').hud)`);
  await sleep(150);
  check((await solo.textContent('#hud-prompt'))!.includes('Escaleras que llevan al siguiente piso'), '«Info» muestra la descripción de la escalera');
  await solo.screenshot({ path: `${OUT}/mazmorra-escalera.png` });
  await G(solo, `w.app.game.scene.getScene('dungeon').hud.showStairsPrompt(false)`);
  // Minimapa con los iconos originales (si se ha importado la ROM) y estilos con M.
  const iconsLoaded = await G<boolean>(solo, `!!w.app.game.scene.getScene('dungeon').hud.minimapIcons`);
  check(iconsLoaded || !(await G<boolean>(solo, `!!document.documentElement.classList.contains('rom-ui')`)), 'el minimapa usa los iconos originales de la ROM');
  if (iconsLoaded) {
    // El líder parpadea: en algún momento de 1 s su casilla del minimapa tiene el icono blanco (8).
    let leader = false;
    for (let i = 0; i < 10 && !leader; i++) {
      leader = await G<boolean>(solo, `((sc) => { const me = sc.me(); const c = document.getElementById('hud-minimap').getContext('2d'); const d = c.getImageData(me.pos.x * 4, me.pos.y * 4, 4, 4).data; for (let i = 0; i < d.length; i += 4) if (d[i] > 240 && d[i + 1] > 240 && d[i + 2] > 240 && d[i + 3] > 0) { const inner = (i / 4) % 4 > 0 && (i / 4) % 4 < 3 && i / 16 >= 1 && i / 16 < 3; if (inner) return true; } return false; })(w.app.game.scene.getScene('dungeon'))`);
      if (!leader) await sleep(100);
    }
    check(leader, 'el líder aparece (parpadeando) en el minimapa');
  }
  for (let i = 0; i < 2; i++) {
    await solo.keyboard.press('KeyM');
    await sleep(120);
  }
  await solo.screenshot({ path: `${OUT}/mazmorra-minimapa-opaco.png` });
  await solo.keyboard.press('KeyM');
  await sleep(120);
  check(!(await solo.isVisible('#hud-minimap')), 'M oculta el minimapa tras los tres estilos');
  await solo.keyboard.press('KeyM');
  await sleep(120);
  check(await solo.isVisible('#hud-minimap'), 'M vuelve a mostrar el minimapa');
  // El HUD se adapta a la ventana: capturas a otras resoluciones y sin desbordes horizontales.
  for (const [w, h] of [[1920, 1080], [1024, 600], [600, 900]] as const) {
    await solo.setViewportSize({ width: w, height: h });
    await sleep(500);
    await solo.screenshot({ path: `${OUT}/mazmorra-${w}x${h}.png` });
    const overflow = await solo.evaluate(() => [...document.querySelectorAll('#hud *')].some((el) => el.getBoundingClientRect().right > innerWidth + 1));
    check(!overflow, `HUD sin desbordes a ${w}×${h}`);
  }
  await solo.setViewportSize({ width: 1280, height: 760 });

  // ── 2. Cooperativo ──
  const a = await open('A');
  await waitScene(a, 'intro', 15000);
  await sleep(300);
  await a.keyboard.press('Space'); // salta la intro
  check(await waitScene(a, 'title'), 'la intro se puede saltar');
  await sleep(400);
  await a.keyboard.press('Enter');
  await waitScene(a, 'menu');
  await sleep(500);
  await a.keyboard.press('ArrowDown');
  await a.keyboard.press('Enter'); // "Crear sala"
  await a.waitForSelector('#m-species');
  await a.fill('#m-name', 'Ana');
  await a.click('[data-sp="pikachu"]');
  await a.click('#m-ok');
  const code = (await a.textContent('.menu h1'))!.replace('Sala', '').trim();
  check(code.length === 5, `sala creada desde el menú con código ${code}`);

  const b = await open('B');
  await waitScene(b, 'intro', 15000);
  await sleep(300);
  await b.mouse.click(400, 300);
  await waitScene(b, 'title');
  await sleep(400);
  await b.mouse.click(400, 300);
  check(await waitScene(b, 'menu'), 'con el ratón también se avanza del título al menú');
  await sleep(500);
  const [idx, n] = await G<[number, number]>(b, '((m) => [m.index, m.options.length])(w.app.game.scene.getScene("menu"))');
  for (let i = 0; i < (2 - idx + n) % n; i++) await b.keyboard.press('ArrowDown');
  await b.keyboard.press('Enter'); // "Unirse a sala"
  await b.waitForSelector('#m-code');
  await b.fill('#m-name', 'Beto');
  await b.fill('#m-code', code);
  await b.click('[data-sp="squirtle"]');
  await b.click('#m-ok');
  await b.waitForSelector('#l-species');
  await sleep(500);
  await a.screenshot({ path: `${OUT}/coop-lobby.png` });
  await a.click('#l-start');
  check((await waitScene(a, 'town')) && (await waitScene(b, 'town')), 'el anfitrión lleva a los dos fuera del lobby');
  check((await waitZone(a, 'home')) && (await waitZone(b, 'home')), 'los dos aparecen dentro de casa');
  await sleep(900);
  check((await b.$$('#th-party .member')).length === 2, 'se ve al grupo completo');
  const room = [...server.rooms.values()][0];
  const aId = room.members[0].playerId;
  const aStart = { ...room.town.get(aId)! };
  await a.keyboard.down('ArrowDown');
  await sleep(500);
  await a.keyboard.up('ArrowDown');
  await sleep(400);
  const aNow = room.town.get(aId)!;
  const seenByB = await G<{ x: number; y: number }>(b, `w.app.online.town.players.find(p => p.playerId === '${aId}')`);
  check(aNow.y > aStart.y + 10, `el servidor recibe el movimiento de A (${aStart.y} → ${aNow.y})`);
  check(Math.abs(seenByB.y - aNow.y) < 1, 'B ve la posición de A sincronizada');
  await b.screenshot({ path: `${OUT}/coop-casa-B.png` });
  // A sale solo de casa: el servidor lo acepta y B sigue dentro, sin dibujar a A.
  await walkToExit(a, 'up');
  check(await waitZone(a, 'bluff'), 'A sale de casa al Risco Sharpedo');
  await sleep(500);
  check(room.town.get(aId)!.zoneId === 'bluff' && (await townZone(b)) === 'home', 'cada jugador está en su zona (A fuera, B en casa)');
  check((await G<number>(b, 'w.app.game.scene.getScene("town").others.size')) === 0, 'B no dibuja a A, que está en otra zona');
  // Para no recorrer toda la ruta, el servidor los lleva a la Encrucijada (como al volver de una expedición).
  const cross = getZone('crossroads');
  room.members.forEach((m, i) => Object.assign(room.town.get(m.playerId)!, { zoneId: 'crossroads', ...entryPoint(cross, 'fromDungeon', i) }));
  (room as unknown as { broadcastTown(): void }).broadcastTown();
  check((await waitZone(a, 'crossroads')) && (await waitZone(b, 'crossroads')), 'los dos pasan a la Encrucijada');
  await sleep(500);
  check((await G<number>(b, 'w.app.game.scene.getScene("town").others.size')) === 1, 'en la misma zona, B ve a A');
  await walkToExit(a, 'east');
  await a.keyboard.press('Enter');
  check((await waitScene(a, 'dungeon')) && (await waitScene(b, 'dungeon')), 'desde la salida de la Encrucijada, todo el grupo entra en la mazmorra');
  await sleep(1200);
  check((await state(a)) === (await state(b)), 'ambos navegadores reciben el mismo estado inicial');
  // Luz con dos jugadores: B en el pasillo más cercano a A (cada uno ilumina lo suyo; se ve la unión).
  {
    const s = room.state!;
    const [aE, bE] = room.members.map((m) => s.entities.find((e) => e.playerId === m.playerId)!);
    let best: { x: number; y: number } | null = null;
    for (let y = 0; y < s.map.height; y++)
      for (let x = 0; x < s.map.width; x++)
        if (isWalkable(s.map, { x, y }) && roomIdAt(s.map, { x, y }) < 0 && !s.entities.some((e) => e.pos.x === x && e.pos.y === y) &&
          (!best || Math.hypot(x - aE.pos.x, y - aE.pos.y) < Math.hypot(best.x - aE.pos.x, best.y - aE.pos.y))) best = { x, y };
    if (best) bE.pos = best;
    (room as unknown as { broadcastState(e: unknown[]): void }).broadcastState([]);
    await sleep(900);
    await a.screenshot({ path: `${OUT}/coop-mazmorra-luz.png` });
    check((await state(a)) === (await state(b)), 'con un jugador en la sala y otro en un pasillo, ambos ven el mismo estado');
    // Estados en cooperativo: los dos clientes dibujan el mismo icono sobre cada jugador, y se quita al curarse.
    aE.statuses = [{ id: 'sleep', turnsLeft: 5, counter: 0 }];
    bE.statuses = [{ id: 'burn', turnsLeft: null, counter: 0 }];
    (room as unknown as { broadcastState(e: unknown[]): void }).broadcastState([]);
    await sleep(600);
    const icons = (p: Page) => G<string>(p, `[...w.app.game.scene.getScene('dungeon').statusIcons].map(([id, v]) => id + ':' + v.list.join('+')).sort().join(',')`);
    const [ia, ib] = [await icons(a), await icons(b)];
    check(ia === ib && ia.includes(`${aE.id}:sleep`) && ia.includes(`${bE.id}:burn`), `estados en cooperativo: A y B ven los mismos iconos (${ia})`);
    aE.statuses = [];
    bE.statuses = [];
    (room as unknown as { broadcastState(e: unknown[]): void }).broadcastState([]);
    await sleep(600);
    check((await icons(a)) === '' && (await icons(b)) === '', 'al curarse, el icono desaparece en los dos clientes');
  }

  // Exploración libre.
  room.state!.entities = room.state!.entities.filter((e) => e.team !== 'enemy');
  room.state!.spawnCountdown = 99999;
  const t0 = room.state!.turn;
  for (let i = 0; i < 4; i++) {
    await a.keyboard.press('KeyX');
    await sleep(250);
  }
  await sleep(400);
  check(room.state!.turn > t0, 'exploración: A avanza sin esperar a B');
  // Combate por turnos compartidos.
  const st = room.state!;
  const aEnt = st.entities.find((e) => e.playerId === aId)!;
  const spot = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
    .map(([dx, dy]) => ({ x: aEnt.pos.x + dx, y: aEnt.pos.y + dy }))
    .find((q) => st.map.tiles[q.y * st.map.width + q.x] === 1 && !st.entities.some((e) => !e.fainted && e.pos.x === q.x && e.pos.y === q.y))!;
  const enemy = spawnEnemy(st, spot);
  enemy.moves = [];
  enemy.hp = enemy.maxHp = 500;
  const tc = st.turn;
  await a.keyboard.press('KeyX');
  await sleep(700);
  check(st.turn === tc, 'combate: la acción de A espera a la de B');
  await b.keyboard.press('KeyX');
  await sleep(700);
  check(st.turn === tc + 1, 'combate: con la acción de B se resuelve el turno');
  check((await state(a)) === (await state(b)), 'sin divergencias entre los dos clientes');

  // Fin de la expedición → vuelta a la Encrucijada.
  st.entities = st.entities.filter((e) => e.team !== 'enemy');
  st.result = 'cleared';
  (room as unknown as { broadcastState(e: unknown[]): void }).broadcastState([{ t: 'end', result: 'cleared' }]);
  await a.waitForSelector('#end-exit', { timeout: 5000 });
  await a.screenshot({ path: `${OUT}/coop-fin.png` });
  await a.click('#end-exit');
  check((await waitScene(a, 'town')) && (await waitScene(b, 'town')), 'al terminar, el grupo vuelve de la mazmorra');
  check((await waitZone(a, 'crossroads')) && (await waitZone(b, 'crossroads')), 'y aparece junto en la Encrucijada');
  await sleep(600);
  await a.screenshot({ path: `${OUT}/coop-vuelta.png` });

  check(errors.length === 0, `sin errores de consola${errors.length ? ':\n  ' + errors.join('\n  ') : ''}`);
  await browser.close();
  await server.close();
  console.log(ok ? '\nPrueba de humo superada.' : '\nPrueba de humo con fallos.');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
