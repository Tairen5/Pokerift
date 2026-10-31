/**
 * Comprobación visual de la iluminación de la mazmorra (Chrome/Edge real).
 * Requiere `npm run build`. Uso: npm run light-check
 *
 * En solitario: captura en la sala inicial, camina (con el teclado) hasta el
 * pasillo más cercano capturando a mitad del último paso, y captura ya en el
 * pasillo. Comprueba que la luz rodea al Pokémon (más claro junto a él que
 * lejos), que en reposo no se redibuja y que no hay errores.
 * Capturas en smoke-output/luz-*.png (el cooperativo lo captura npm run smoke).
 */
import { chromium, type Page } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
import { PNG } from 'pngjs';
import { startServer } from '../src/server/app';
import { DIR_DELTA, type Dir } from '../src/shared/core/geometry';
import { isWalkable, roomIdAt } from '../src/shared/dungeon/map';
import type { GameState } from '../src/shared/engine/state';

const BROWSERS = [process.env.BROWSER_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].filter(Boolean) as string[];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const KEY_OF: Record<number, string> = { 0: 'ArrowDown', 2: 'ArrowRight', 4: 'ArrowUp', 6: 'ArrowLeft' };

/** Pasos (en cruz) hasta la casilla de pasillo más cercana. */
function pathToCorridor(s: GameState, from: { x: number; y: number }): Dir[] {
  const W = s.map.width, start = from.y * W + from.x;
  const prev = new Map<number, [number, Dir]>([[start, [-1, 0 as Dir]]]);
  const q = [start];
  while (q.length) {
    const k = q.shift()!, x = k % W, y = Math.floor(k / W);
    if (roomIdAt(s.map, { x, y }) < 0) {
      const dirs: Dir[] = [];
      for (let c = k; prev.get(c)![0] !== -1; c = prev.get(c)![0]) dirs.unshift(prev.get(c)![1]);
      return dirs;
    }
    for (const d of [0, 2, 4, 6] as Dir[]) {
      const nx = x + DIR_DELTA[d].x, ny = y + DIR_DELTA[d].y, n = ny * W + nx;
      if (!prev.has(n) && isWalkable(s.map, { x: nx, y: ny })) (prev.set(n, [k, d]), q.push(n));
    }
  }
  return [];
}

/** Brillo medio (0–255) de un recuadro de la pantalla (sobre una captura: el lienzo WebGL no se puede leer). */
async function brightness(p: Page, x: number, y: number, w: number, h: number) {
  const png = PNG.sync.read(await p.screenshot({ clip: { x, y, width: w, height: h } }));
  let s = 0;
  for (let i = 0; i < png.data.length; i += 4) s += (png.data[i] + png.data[i + 1] + png.data[i + 2]) / 3;
  return s / (png.data.length / 4);
}

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
  await page.goto(`http://localhost:${server.port}/`);
  await page.waitForFunction(() => (window as any).__pokerift?.scene === 'intro', null, { timeout: 15000 });
  await page.evaluate(`(() => { const a = window.__pokerift.app; a.solo = { name: 'Test', species: 'charmander', seed: 'luz' }; a.enterDungeonSolo('expedition'); })()`);
  await page.waitForFunction(() => (window as any).__pokerift?.scene === 'dungeon', null, { timeout: 10000 });
  await sleep(1500);
  // Sin enemigos, para caminar tranquilo.
  await page.evaluate(`(() => { const s = window.__pokerift.state; s.entities = s.entities.filter(e => e.team !== 'enemy'); s.spawnCountdown = 99999; })()`);
  await page.screenshot({ path: 'smoke-output/luz-sala.png' });

  const state = (await page.evaluate(`window.__pokerift.state`)) as GameState;
  const me = state.entities.find((e) => e.playerId === 'local')!;
  const path = pathToCorridor(state, me.pos);
  check(path.length > 0, `ruta hasta un pasillo: ${path.length} pasos`);
  for (let i = 0; i < path.length; i++) {
    await page.keyboard.down(KEY_OF[path[i]]);
    await sleep(130); // la escena espera 60 ms antes de mover (por si se pulsa una diagonal)
    await page.keyboard.up(KEY_OF[path[i]]);
    if (i === path.length - 1) {
      await sleep(30); // a mitad del último paso
      await page.screenshot({ path: 'smoke-output/luz-paso.png' });
    }
    await sleep(450);
  }
  await sleep(500);
  const now = (await page.evaluate(`window.__pokerift.state`)) as GameState;
  const pos = now.entities.find((e) => e.playerId === 'local')!.pos;
  check(roomIdAt(now.map, pos) < 0, `el Pokémon está en un pasillo (${pos.x},${pos.y})`);
  await page.screenshot({ path: 'smoke-output/luz-pasillo.png' });
  // La cámara puede no centrarlo (límites del mapa): se mide junto a su sprite.
  const at = (await page.evaluate(`(() => {
    const sc = window.__pokerift.app.game.scene.getScene('dungeon'); const cam = sc.cameras.main;
    const me = window.__pokerift.state.entities.find((e) => e.playerId === 'local'); const c = sc.sprites.get(me.id).container;
    return { x: (c.x - cam.worldView.x) * cam.zoom, y: (c.y - cam.worldView.y) * cam.zoom, t: 24 * cam.zoom };
  })()`)) as { x: number; y: number; t: number };
  const near = await brightness(page, Math.round(at.x + at.t * 0.6), Math.round(at.y - at.t / 2), Math.round(at.t), Math.round(at.t));
  const farX = at.x > 640 ? at.x - at.t * 5 : at.x + at.t * 4;
  const far = await brightness(page, Math.round(farX), Math.round(at.y - at.t / 2), Math.round(at.t), Math.round(at.t));
  check(near > far * 1.3, `en el pasillo, la luz rodea al Pokémon (junto a él ${near.toFixed(0)}, a 4–5 casillas ${far.toFixed(0)})`);
  // Coste: en reposo no debe redibujarse (solo cuando algo cambia).
  const redraws = await page.evaluate(`(() => new Promise((res) => {
    const l = window.__pokerift.app.game.scene.getScene('dungeon').light; let n = 0; const t = l.tex.refresh.bind(l.tex);
    l.tex.refresh = () => { n++; return t(); }; setTimeout(() => { l.tex.refresh = t; res(n); }, 1000);
  }))()`);
  check(redraws === 0, `en reposo la luz no se redibuja (${redraws} veces en 1 s)`);
  // Coste de un redibujo (se hace en cada fotograma mientras alguien anda).
  const ms = (await page.evaluate(`(() => {
    const l = window.__pokerift.app.game.scene.getScene('dungeon').light; const t = [];
    for (let i = 0; i < 20; i++) { l.lastKey = ''; l.draw([{ x: 500 + i, y: 300, room: -1 }]); t.push(l.lastDrawMs); }
    return t.sort((a, b) => a - b)[10];
  })()`)) as number;
  check(ms < 8, `redibujar la luz cuesta ~${ms.toFixed(1)} ms (mediana)`);
  check(errors.length === 0, `sin errores${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  await server.close();
  console.log(ok ? '\nComprobación de luz superada.' : '\nComprobación de luz con fallos.');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
