/**
 * Comprobación en móvil (horizontal, pantalla táctil) con Chrome/Edge del sistema.
 * Requiere `npm run build` antes. Uso: npm run mobile-check
 * Recorre solo con toques: intro → título → menú → Solitario → casa → Encrucijada
 * → mazmorra, y guarda capturas en smoke-output/mobile/<dispositivo>-*.png.
 */
import { chromium, type Page } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
import { startServer } from '../src/server/app';

const BROWSERS = [
  process.env.BROWSER_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean) as string[];

/** Tamaños CSS de móviles comunes en horizontal. */
const DEVICES = [
  { name: 'iphone', width: 844, height: 390, dpr: 3 },
  { name: 'android', width: 780, height: 360, dpr: 2.75 },
];

const OUT = 'smoke-output/mobile';
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
  let ok = true;
  const check = (cond: boolean, msg: string) => {
    console.log(`${cond ? '✔' : '✖'} ${msg}`);
    if (!cond) ok = false;
  };

  for (const d of DEVICES) {
    console.log(`── ${d.name} (${d.width}×${d.height}) ──`);
    const ctx = await browser.newContext({ viewport: { width: d.width, height: d.height }, deviceScaleFactor: d.dpr, isMobile: true, hasTouch: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(`[${d.name}] ${e.message}`));
    p.on('console', (m) => m.type() === 'error' && errors.push(`[${d.name}] ${m.text()}`));
    await p.goto(url);
    const G = <T>(expr: string) => p.evaluate(`(() => { const w = window.__pokerift; return ${expr}; })()`) as Promise<T>;
    const waitScene = async (s: string, ms = 10000) => {
      for (const t0 = Date.now(); Date.now() - t0 < ms; await sleep(100)) if ((await G<string>('w.scene')) === s) return true;
      return false;
    };
    const shot = (name: string) => p.screenshot({ path: `${OUT}/${d.name}-${name}.png` });
    const tapCenter = () => p.touchscreen.tap(d.width / 2, d.height / 2);
    const tapSel = async (sel: string) => {
      const b = await p.locator(sel).first().boundingBox();
      if (!b) return false;
      await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
      return true;
    };

    check(await waitScene('intro', 15000), 'arranca la intro');
    await sleep(1500);
    await tapCenter();
    check(await waitScene('title'), 'un toque salta la intro');
    await sleep(900);
    await shot('titulo');
    await tapCenter();
    check(await waitScene('menu'), 'un toque en el título abre el menú');
    await sleep(700);
    await shot('menu');
    // Primera opción del menú principal («Solitario»): se toca donde la dibuja la escena.
    const opt = await G<{ x: number; y: number } | null>(
      `((m) => { const h = m.hits?.[0] ?? null; if (!h) return null; const b = h.getBounds(); const c = m.cameras.main; return { x: (b.centerX - c.worldView.x) * c.zoom, y: (b.centerY - c.worldView.y) * c.zoom }; })(w.app.game.scene.getScene('menu'))`,
    );
    if (opt) await p.touchscreen.tap(opt.x, opt.y);
    else await p.keyboard.press('Enter');
    check(!!opt, 'se localiza la opción «Solitario» para tocarla');
    const setup = await p.waitForSelector('#m-species', { timeout: 4000 }).then(() => true, () => false);
    check(setup, 'tocar «Solitario» abre la elección de Pokémon');
    await sleep(300);
    await shot('solitario');
    if (setup) {
      await tapSel('[data-sp="charmander"]');
      await sleep(200);
      await shot('solitario-elegido');
      const okVisible = await p.locator('#m-ok').isVisible();
      const inView = await p.locator('#m-ok').evaluate((e) => { const r = e.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0; });
      check(okVisible && inView, 'el botón de aceptar se ve sin desplazar');
      await p.locator('#m-ok').scrollIntoViewIfNeeded();
      await tapSel('#m-ok');
    }
    check(await waitScene('town'), 'se llega a la casa');
    await sleep(800);
    await shot('casa');
    // Caminar manteniendo el dedo a la derecha del jugador.
    const p0 = await G<{ x: number; y: number }>('w.townPos');
    const cdp = await ctx.newCDPSession(p);
    const touch = (type: "touchStart" | "touchEnd", x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await touch('touchStart', d.width * 0.85, d.height / 2);
    await sleep(700);
    await shot('casa-andando');
    await touch('touchEnd', 0, 0);
    const p1 = await G<{ x: number; y: number }>('w.townPos');
    check(p1.x > p0.x + 10, `mantener el dedo mueve al jugador (${p0.x.toFixed(0)} → ${p1.x.toFixed(0)})`);
    check(await tapSel('#th-menu-btn'), 'hay un botón táctil para el menú de pausa');
    await sleep(200);
    check(await p.locator('#th-dialog').isVisible(), 'el botón Menú abre la pausa');
    await shot('casa-menu');
    await tapSel('#th-dialog [data-i="0"]');
    await sleep(200);
    check(!(await p.locator('#th-dialog').isVisible()), '«Continuar» cierra la pausa');

    await G(`w.app.toSoloTown('crossroads', 'fromTown')`);
    await sleep(900);
    await shot('encrucijada');
    await G(`w.app.enterDungeonSolo('expedition')`);
    check(await waitScene('dungeon'), 'se entra en la mazmorra');
    await sleep(2200);
    await shot('mazmorra');
    const t0 = await G<number>('w.state.turn');
    for (const n of [6, 2, 4, 8]) {
      await tapSel(`#touch-controls [data-num="${n}"]`);
      await sleep(350);
    }
    check((await G<number>('w.state.turn')) > t0, 'la cruceta táctil hace avanzar los turnos');
    await shot('mazmorra-cruceta');
    await tapSel('#touch-controls [data-t="bag"]');
    await sleep(300);
    check(await p.locator('#hud-bag').isVisible(), 'el botón Mochila abre la mochila');
    await shot('mazmorra-mochila');
    await tapSel('#touch-controls [data-t="bag"]');
    await sleep(200);
    await G(`w.app.game.scene.getScene('dungeon').hud.showStairsPrompt(true)`);
    await sleep(200);
    await shot('mazmorra-escalera');
    await tapSel('#hud-prompt [data-choice="no"]');
    await sleep(200);
    check(!(await p.locator('#hud-prompt').isVisible()), '«Cancelar» de la escalera responde al toque');
    await ctx.close();
  }

  await browser.close();
  await server.close();
  for (const e of errors) console.log(`  error: ${e}`);
  check(errors.length === 0, 'sin errores en la consola');
  console.log(ok ? 'Todo correcto.' : 'Hay fallos.');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
