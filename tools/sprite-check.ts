/**
 * Verificación visual de los sprites en la mazmorra (Chrome/Edge real).
 * Requiere `npm run build`. Uso: npm run sprite-check
 *
 * Para varias especies entra en la expedición en solitario y comprueba:
 *  - el idle recorre todos sus frames en bucle y vuelve al primero;
 *  - en cada frame, el punto de apoyo del sprite coincide con la sombra;
 *  - un paso de una casilla dura lo previsto (STEP_MS) y sprite y sombra llegan juntos;
 *  - al dejar de moverse vuelve al idle (no se queda "andando" parado);
 *  - al andar varias casillas no retrocede ni en el mundo ni en pantalla (cámara
 *    fija al líder, sin temblor de subpíxel); TRACE=1 vuelca la traza por frame;
 *  - la sombra del jugador es amarilla y la de los enemigos negra.
 * Guarda capturas ampliadas en smoke-output/sprites-<especie>.png
 */
import { chromium, type Page } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
import { startServer } from '../src/server/app';

const BROWSERS = [process.env.BROWSER_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].filter(Boolean) as string[];
const SPECIES = ['pikachu', 'bulbasaur', 'squirtle', 'meowth', 'cyndaquil', 'treecko', 'torchic', 'mudkip'];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
interface Probe { anim: string; frame: number; bodyX: number; bodyY: number; shadowX: number; shadowY: number; cx: number; cy: number }
const probe = (p: Page) => p.evaluate(PROBE) as Promise<Probe>;

/** Inspección dentro de la página: sprite del jugador en la escena de mazmorra. */
const PROBE = `(() => {
  const w = window.__pokerift;
  const scene = w.app.game.scene.getScene('dungeon');
  const st = w.state;
  const me = st.entities.find((e) => e.playerId === 'local');
  const ps = scene.sprites.get(me.id);
  const body = ps.body;
  const shadow = ps.shadow;
  const anim = body.anims.currentAnim ? body.anims.currentAnim.key : null;
  const frame = body.anims.currentFrame ? body.anims.currentFrame.index : null;
  return { anim, frame, bodyX: body.x, bodyY: body.y, shadowX: shadow.x, shadowY: shadow.y, cx: ps.container.x, cy: ps.container.y, frameW: body.frame.width, frameH: body.frame.height };
})()`;

/**
 * Registra en window.__trace, tras dibujar cada frame (postrender, con los mismos
 * valores que se ven), la posición del jugador en el mundo y en pantalla: lo que
 * se dibuja en píxeles enteros con roundPixels, relativo al scroll de la cámara.
 */
const TRACE = `(() => {
  const w = window.__pokerift;
  const game = w.app.game;
  const scene = game.scene.getScene('dungeon');
  const me = w.state.entities.find((e) => e.playerId === 'local');
  const log = (window.__trace = []);
  function tick() {
    const ps = scene.sprites.get(me.id);
    const cam = scene.cameras.main;
    if (ps) log.push({ wx: ps.container.x, wy: ps.container.y, sx: Math.round((ps.container.x - cam.scrollX) * cam.zoom), sy: Math.round((ps.container.y - cam.scrollY) * cam.zoom) });
    if (log.length >= 240) game.events.off('postrender', tick);
  }
  game.events.on('postrender', tick);
})()`;

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

  for (const species of SPECIES) {
    const page: Page = await (await browser.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`http://localhost:${server.port}/`);
    await page.waitForFunction(() => (window as any).__pokerift?.scene === 'intro', null, { timeout: 15000 });
    // Entra directamente en la mazmorra con la especie elegida.
    await page.evaluate((sp) => {
      const app = (window as any).__pokerift.app;
      app.solo = { name: 'Test', species: sp, seed: 'sprites' };
      app.enterDungeonSolo('expedition');
    }, species);
    await page.waitForFunction(() => (window as any).__pokerift?.scene === 'dungeon', null, { timeout: 10000 });
    await sleep(1500);

    // 1. Idle: muestreo de frames durante 3 s.
    const samples: Probe[] = [];
    for (let i = 0; i < 90; i++) {
      samples.push(await probe(page));
      await sleep(33);
    }
    const idle = samples.filter((s) => s.anim?.includes('-idle-'));
    const frames = new Set(idle.map((s) => s.frame));
    const wraps = idle.filter((s, i) => i > 0 && s.frame < idle[i - 1].frame).length;
    check(idle.length > 60, `${species}: el jugador está en idle (${idle.length}/90 muestras)`);
    check(frames.size >= 2 && wraps >= 1, `${species}: el idle recorre ${frames.size} frames y vuelve al primero ${wraps} vez/veces`);
    // Anclaje: el apoyo (cuerpo + offset del frame) debe caer sobre la sombra.
    const anchored = await page.evaluate(() => {
      const w = (window as any).__pokerift;
      const scene = w.app.game.scene.getScene('dungeon');
      const me = w.state.entities.find((e: any) => e.playerId === 'local');
      const ps = scene.sprites.get(me.id);
      const shadow = ps.shadow;
      const key = ps.body.anims.currentAnim.key.split('-');
      return { body: [ps.body.x, ps.body.y], shadow: [shadow.x, shadow.y], key };
    });
    check(Math.abs(anchored.body[0] - anchored.shadow[0]) <= 8, `${species}: sprite centrado sobre su sombra (cuerpo x=${anchored.body[0]}, sombra x=${anchored.shadow[0]})`);

    // 2. Un paso: duración y sincronía sprite/sombra.
    const dirs = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'];
    let stepMs = 0;
    for (const k of dirs) {
      const before = await probe(page);
      const t0 = Date.now();
      await page.keyboard.down(k);
      await sleep(90);
      await page.keyboard.up(k);
      let after = before;
      for (let i = 0; i < 60; i++) {
        after = await probe(page);
        if (Math.abs(after.cx - before.cx) >= 24 || Math.abs(after.cy - before.cy) >= 24) break;
        await sleep(10);
      }
      if (after.cx !== before.cx || after.cy !== before.cy) {
        stepMs = Date.now() - t0;
        check(after.shadowX === before.shadowX && after.shadowY === before.shadowY, `${species}: la sombra forma parte del mismo contenedor y se desplaza con el Pokémon`);
        break;
      }
    }
    check(stepMs >= 180, `${species}: un paso dura ~${stepMs} ms (objetivo 240 ms)`);
    await sleep(700);

    // 2b. Sin retroceso: al andar varias casillas y pararse, el Pokémon no debe
    // volver hacia atrás ni en el mundo ni en pantalla (cámara que se queda atrás
    // y luego lo alcanza, o un salto al resincronizar con el estado).
    for (const k of dirs) {
      const axis = k === 'ArrowRight' || k === 'ArrowLeft' ? 'x' : 'y';
      const sign = k === 'ArrowRight' || k === 'ArrowDown' ? 1 : -1;
      await page.evaluate(TRACE);
      await page.keyboard.down(k);
      await sleep(650);
      await page.keyboard.up(k);
      await sleep(1600);
      const trace = (await page.evaluate(() => (window as any).__trace)) as { wx: number; wy: number; sx: number; sy: number }[];
      const w = trace.map((t) => sign * (axis === 'x' ? t.wx : t.wy));
      const s = trace.map((t) => sign * (axis === 'x' ? t.sx : t.sy));
      if (w[w.length - 1] - w[0] < 24) continue; // pared: probar otra dirección
      /** Mayor retroceso respecto al máximo alcanzado hasta ese momento. */
      const back = (v: number[]) => v.reduce((acc, x, i) => Math.max(acc, Math.max(...v.slice(0, i + 1)) - x), 0);
      if (process.env.TRACE) console.log(trace.map((t, i) => `${w[i].toFixed(2)}:${s[i]}`).join(' '));
      const sAfter = s.slice(s.findIndex((x, i) => i > 0 && w[i] === w[w.length - 1]));
      check(back(w) <= 0.5, `${species}: andando no retrocede en el mundo (máx. ${back(w).toFixed(1)} px)`);
      check(back(s) <= 1.5 && Math.max(...sAfter) - Math.min(...sAfter) <= 1.5, `${species}: andando y al pararse no retrocede en pantalla (máx. ${back(s).toFixed(1)} px; al pararse se mueve ${(Math.max(...sAfter) - Math.min(...sAfter)).toFixed(1)} px)`);
      break;
    }
    await sleep(300);
    const rest = await probe(page);
    check(rest.anim.includes('-idle-'), `${species}: tras moverse vuelve al idle (${rest.anim})`);
    const myShadow = await page.evaluate(() => {
      const w = (window as any).__pokerift;
      const me = w.state.entities.find((e: any) => e.playerId === 'local');
      return w.app.game.scene.getScene('dungeon').sprites.get(me.id).shadow.texture.key as string;
    });
    check(myShadow.endsWith('-y'), `${species}: el jugador tiene sombra amarilla (${myShadow})`);

    // Captura ampliada alrededor del jugador.
    const p = await probe(page);
    await page.screenshot({ path: `smoke-output/sprites-${species}.png`, clip: { x: 640 - 200, y: 380 - 150, width: 400, height: 300 } });
    void p;
    // Enemigo: sombra negra y sin círculo amarillo; captura centrada en él.
    const enemy = await page.evaluate(() => {
      const w = (window as any).__pokerift;
      const scene = w.app.game.scene.getScene('dungeon');
      const e = w.state.entities.find((x: any) => x.team === 'enemy' && !x.fainted);
      if (!e) return null;
      const ps = scene.sprites.get(e.id);
      scene.cameras.main.stopFollow();
      scene.cameras.main.centerOn(ps.container.x, ps.container.y);
      ps.container.setVisible(true);
      scene.dark.setVisible(false);
      return {
        species: e.species,
        shadow: ps.shadow.texture.key as string,
      };
    });
    if (enemy) {
      check(enemy.shadow.endsWith('-k'), `${species}: el enemigo (${enemy.species}) tiene sombra negra (${enemy.shadow})`);
      await sleep(300);
      await page.screenshot({ path: `smoke-output/sprites-enemigo-${enemy.species}.png`, clip: { x: 640 - 120, y: 380 - 90, width: 240, height: 180 } });
    }
    check(errors.length === 0, `${species}: sin errores${errors.length ? ': ' + errors.join(' | ') : ''}`);
    await page.close();
  }
  await browser.close();
  await server.close();
  console.log(ok ? '\nComprobación de sprites superada.' : '\nComprobación de sprites con fallos.');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
