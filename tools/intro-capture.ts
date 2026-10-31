/**
 * Captura la intro completa en una secuencia de imágenes para revisarla
 * fotograma a fotograma (Chrome/Edge real). Requiere `npm run build`.
 * Uso: npm run intro-capture  →  smoke-output/intro/NN-<segundos>.png
 */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { startServer } from '../src/server/app';

const BROWSERS = [process.env.BROWSER_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].filter(Boolean) as string[];
const OUT = 'smoke-output/intro';
const INTERVAL = Number(process.env.INTERVAL ?? 900);

async function main() {
  const exe = BROWSERS.find((b) => existsSync(b));
  if (!exe) throw new Error('No se encontró Chrome/Edge');
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const server = await startServer({ port: 0, turnTimeoutSeconds: 0, quiet: true });
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
  await page.goto(`http://localhost:${server.port}/`);
  await page.waitForFunction(() => (window as any).__pokerift?.scene === 'intro', null, { timeout: 15000 });
  const t0 = Date.now();
  let n = 0;
  while (Date.now() - t0 < 32000) {
    const scene = await page.evaluate(() => (window as any).__pokerift.scene);
    const t = ((Date.now() - t0) / 1000).toFixed(1);
    await page.screenshot({ path: `${OUT}/${String(n++).padStart(2, '0')}-${t}s-${scene}.png` });
    if (scene === 'title' && n > 3) break;
    await page.waitForTimeout(INTERVAL);
  }
  console.log(`✔ ${n} capturas en ${OUT}`);
  await browser.close();
  await server.close();
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
