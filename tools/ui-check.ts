/**
 * Revisión píxel a píxel del kit de interfaz (ui-gallery.html) en Chrome real.
 * Requiere `npm run build` antes. Uso: npm run ui-check
 *
 * Con escala de píxeles 1, 2 y 3, para cada caja de la galería (cajas DOM de
 * muchos tamaños, marcos de retrato y las ventanas en canvas de Phaser) comprueba:
 *  - que las cuatro esquinas son EXACTAMENTE las del recurso original ampliadas ×s;
 *  - que no aparece ningún color que no esté en el recurso (sin desenfoque ni mezcla).
 * Guarda capturas de la galería en smoke-output/ui/.
 */
import { chromium, type ElementHandle, type Page } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { startServer } from '../src/server/app';

const BROWSERS = [
  process.env.BROWSER_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean) as string[];
const OUT = 'smoke-output/ui';
const BG = '0,0,0'; // fondo de la página (se ve por las esquinas redondeadas y el hueco del retrato)

// Con la ROM importada (tools/import-rom-ui.mjs) la interfaz usa sus cajas y marcos.
const ROM_UI = existsSync('public/assets/ui/rom/frame-blue.png') && readFileSync('src/client/assets/ui-rom.generated.ts', 'utf8').includes('"ui"');
/**
 * Recurso recortado a lo que se pinta (los marcos de la ROM dejan 1–2 px
 * transparentes por fuera; la captura también se recorta así) y cuánto se ha
 * quitado por cada lado.
 */
const source = (name: string) => {
  const p = PNG.sync.read(readFileSync(`public/assets/ui/${ROM_UI ? 'rom/' : ''}${name}.png`));
  let x0 = p.width, y0 = p.height, x1 = -1, y1 = -1;
  for (let y = 0; y < p.height; y++)
    for (let x = 0; x < p.width; x++)
      if (p.data[(y * p.width + x) * 4 + 3]) (x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y));
  const out = new PNG({ width: x1 - x0 + 1, height: y1 - y0 + 1 });
  PNG.bitblt(p, out, x0, y0, out.width, out.height, 0, 0);
  return Object.assign(out, { trim: { l: x0, t: y0, r: p.width - 1 - x1, b: p.height - 1 - y1 } });
};
const px = (p: PNG, x: number, y: number) => {
  const i = (y * p.width + x) * 4;
  return p.data[i + 3] === 0 ? BG : `${p.data[i]},${p.data[i + 1]},${p.data[i + 2]}`;
};

/** Compara una esquina de la captura con la del recurso ampliada ×s. */
function cornerDiff(shot: PNG, src: PNG, s: number, cw: number, ch: number, right: boolean, bottom: boolean) {
  let diff = 0;
  for (let y = 0; y < ch * s; y++)
    for (let x = 0; x < cw * s; x++) {
      const sx = right ? shot.width - cw * s + x : x, sy = bottom ? shot.height - ch * s + y : y;
      const ox = right ? src.width - cw + Math.floor(x / s) : Math.floor(x / s), oy = bottom ? src.height - ch + Math.floor(y / s) : Math.floor(y / s);
      if (px(shot, sx, sy) !== px(src, ox, oy)) diff++;
    }
  return diff;
}

/**
 * Captura una caja ajustada a lo que se ha pintado: si cae en medio píxel, el
 * recorte del elemento incluiría una fila o columna de fondo. Se captura con
 * margen y se recorta al rectángulo de píxeles que no son fondo.
 */
async function capture(page: Page, el: ElementHandle): Promise<PNG> {
  const b = (await el.boundingBox())!;
  const clip = { x: Math.max(0, Math.floor(b.x) - 2), y: Math.max(0, Math.floor(b.y) - 2), width: Math.ceil(b.width) + 4, height: Math.ceil(b.height) + 4 };
  const raw = PNG.sync.read(await page.screenshot({ clip, fullPage: true }));
  let x0 = raw.width, y0 = raw.height, x1 = -1, y1 = -1;
  for (let y = 0; y < raw.height; y++)
    for (let x = 0; x < raw.width; x++)
      if (px(raw, x, y) !== BG) {
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
  const out = new PNG({ width: x1 - x0 + 1, height: y1 - y0 + 1 });
  PNG.bitblt(raw, out, x0, y0, out.width, out.height, 0, 0);
  return out;
}

async function main() {
  if (!existsSync('dist/ui-gallery.html')) throw new Error('Falta dist/ui-gallery.html: ejecuta npm run build');
  mkdirSync(OUT, { recursive: true });
  const exe = BROWSERS.find((b) => existsSync(b));
  if (!exe) throw new Error('No se encontró Chrome/Edge. Define BROWSER_PATH.');
  const server = await startServer({ port: 0, turnTimeoutSeconds: 0, quiet: true });
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  let ok = true;
  const errors: string[] = [];
  try {
    for (const s of [1, 2, 3]) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await page.goto(`http://localhost:${server.port}/ui-gallery.html?s=${s}`);
      await page.waitForSelector('body[data-ready="1"]');
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${OUT}/galeria-s${s}.png`, fullPage: true });

      const targets = [
        ...(await page.$$('[data-check]')).map((el) => ({ el, kind: 'box' as const })),
        ...(await page.$$('.pf')).map((el) => ({ el, kind: 'portrait' as const })),
      ];
      let checked = 0;
      const bad: string[] = [];
      for (const { el, kind } of targets) {
        const name =
          kind === 'portrait'
            ? `portrait-${(await el.getAttribute('class'))!.match(/pf-(green|pink)/)?.[1] ?? 'blue'}`
            : ((c) => (c === 'canvas' ? 'frame-blue' : `${c.startsWith('plain') ? 'plain' : 'frame'}-${c.split('-')[1]}`))((await el.getAttribute('data-check'))!);
        const src = source(name);
        const shot = await capture(page, el);
        // Esquinas: 8×8 en las cajas; 4×4 arriba y 4×5 abajo en los retratos.
        // Esquinas (sin la parte transparente que se ha recortado del recurso).
        const [c0, t0, b0] = kind === 'portrait' && !ROM_UI ? [4, 4, 5] : [8, 8, 8];
        const cw = c0 - Math.max(src.trim.l, src.trim.r), ct = t0 - src.trim.t, cb = b0 - src.trim.b;
        const d =
          cornerDiff(shot, src, s, cw, ct, false, false) + cornerDiff(shot, src, s, cw, ct, true, false) +
          cornerDiff(shot, src, s, cw, cb, false, true) + cornerDiff(shot, src, s, cw, cb, true, true);
        // Colores del borde (en los retratos, solo el marco: dentro está la imagen).
        const palette = new Set<string>([BG]);
        for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) palette.add(px(src, x, y));
        let stray = 0;
        for (let y = 0; y < shot.height; y++)
          for (let x = 0; x < shot.width; x++) {
            const inFrame = kind === 'box' || x < cw * s || x >= shot.width - cw * s || y < ct * s || y >= shot.height - cb * s;
            if (inFrame && !palette.has(px(shot, x, y))) stray++;
          }
        checked++;
        if (d || stray) bad.push(`${name} ${shot.width}×${shot.height}: ${d} px de esquina distintos, ${stray} px de color ajeno`);
      }
      const pass = bad.length === 0;
      console.log(`${pass ? '✔' : '✖'} escala ×${s}: ${checked} cajas y marcos con esquinas exactas y sin colores ajenos`);
      for (const b of bad.slice(0, 10)) console.log(`   ${b}`);
      if (!pass) ok = false;
      await page.close();
    }
    if (errors.length) {
      ok = false;
      console.log(`✖ errores en la consola:\n   ${errors.join('\n   ')}`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
  console.log(ok ? '\nUI OK' : '\nUI CON FALLOS');
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
