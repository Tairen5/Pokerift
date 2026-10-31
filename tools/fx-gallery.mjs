/**
 * Galería local de todos los efectos de move_VFX (Exploradores del Cielo),
 * animados a su ritmo y numerados, para elegir el efecto original de cada
 * movimiento: no hay tabla movimiento → efecto en los recursos (está en la ROM).
 *
 *   smoke-output/efectos/index.html   abrir en el navegador
 *
 * Arriba aparece la asignación actual de cada movimiento (tools/build-effects.mjs).
 * Uso: node tools/fx-gallery.mjs
 */
import { PNG } from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';

const VFX = 'Assets/effects/Attack effects/DS _ DSi - Pokemon Mystery Dungeon_ Explorers of Sky - Miscellaneous - Attack Effects/move_VFX';
const OUT = 'smoke-output/efectos';
const FPS = 30;
fs.mkdirSync(`${OUT}/tiras`, { recursive: true });

// Asignación actual (se lee de build-effects.mjs para no duplicarla).
const src = fs.readFileSync('tools/build-effects.mjs', 'utf8');
const assigned = [...src.matchAll(/^\s+(\w+): \{ vfx: '(\d+)'(.*?)\},\s*\/\/\s*(.*)$/gm)].map((m) => ({ key: m[1], vfx: m[2], note: m[4] }));

const cards = [];
for (const d of fs.readdirSync(VFX).sort()) {
  const anims = fs.readdirSync(path.join(VFX, d)).filter((a) => a !== 'pieces').sort();
  // Primera animación (la 000); si hay 8 o más, son variantes por dirección o tamaño.
  const a = anims[0];
  const frames = fs.readdirSync(path.join(VFX, d, a)).sort().map((f) => PNG.sync.read(fs.readFileSync(path.join(VFX, d, a, f))));
  const w = Math.max(...frames.map((p) => p.width)), h = Math.max(...frames.map((p) => p.height));
  const strip = new PNG({ width: w * frames.length, height: h });
  frames.forEach((p, i) => {
    const ox = i * w + Math.floor((w - p.width) / 2), oy = Math.floor((h - p.height) / 2);
    for (let y = 0; y < p.height; y++) p.data.copy(strip.data, ((oy + y) * strip.width + ox) * 4, y * p.width * 4, (y + 1) * p.width * 4);
  });
  fs.writeFileSync(`${OUT}/tiras/${d}.png`, PNG.sync.write(strip));
  const uses = assigned.filter((x) => x.vfx === d).map((x) => x.key);
  cards.push({ d, w, h, n: frames.length, variants: anims.length, uses });
}

const S = 2;
const css = cards
  .map((c) => `#e${c.d} .fx{width:${c.w * S}px;height:${c.h * S}px;background:url(tiras/${c.d}.png) 0 0/${c.w * c.n * S}px ${c.h * S}px;animation:a${c.d} ${(c.n / FPS).toFixed(3)}s steps(${c.n}) infinite}@keyframes a${c.d}{to{background-position:-${c.w * c.n * S}px 0}}`)
  .join('\n');
const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Efectos move_VFX</title>
<style>
body{margin:0;padding:12px;background:#3a4a3a;color:#eee;font:13px system-ui,sans-serif}
h1{font-size:18px;margin:0 0 6px}p{margin:4px 0 10px;max-width:900px}
table{border-collapse:collapse;margin-bottom:14px}td{padding:2px 8px;border-bottom:1px solid #567}
.grid{display:flex;flex-wrap:wrap;gap:6px}
.card{background:#556455;border:1px solid #789;padding:4px;min-width:90px;display:flex;flex-direction:column;align-items:center}
.card.used{border-color:#ffd84a;background:#6a6a40}
.card b{font-size:15px}.card small{color:#cdd}
.fx{image-rendering:pixelated;margin:4px;outline:1px dashed #789}
input{font-size:14px;padding:3px;margin-bottom:10px}
${css}
</style>
<h1>Efectos de Exploradores del Cielo (move_VFX)</h1>
<p>Cada tarjeta es una carpeta de <code>move_VFX</code>, animada a ${FPS} fotogramas/s y ampliada ×${S} (primera animación; «×8» o más = variantes por dirección). En amarillo, las que ya usa algún movimiento. Para corregir un movimiento, dime su nombre y el número de la tarjeta.</p>
<table><tr><td><b>Efecto del juego</b></td><td><b>Carpeta</b></td><td><b>Movimientos</b></td></tr>
${assigned.map((x) => `<tr><td>${x.key}</td><td><a href="#e${x.vfx}" style="color:#ffd84a">${x.vfx}</a></td><td>${x.note}</td></tr>`).join('\n')}</table>
Ir a: <input id="q" placeholder="número, p. ej. 0040" oninput="const e=document.getElementById('e'+this.value.padStart(4,'0'));if(e)e.scrollIntoView({block:'center'})">
<div class="grid">
${cards.map((c) => `<div class="card${c.uses.length ? ' used' : ''}" id="e${c.d}"><b>${c.d}</b><small>${c.n} fot.${c.variants > 1 ? ` · ×${c.variants}` : ''}${c.uses.length ? ' · ' + c.uses.join(', ') : ''}</small><div class="fx"></div></div>`).join('\n')}
</div></html>`;
fs.writeFileSync(`${OUT}/index.html`, html);
console.log(`✔ ${cards.length} efectos → ${OUT}/index.html`);
