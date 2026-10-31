/**
 * Recorta los objetos de mazmorra de la hoja de objetos de Exploradores (DS):
 *
 *   public/assets/dungeon/stairs-up.png    escalera que sube   (Traps and Ground Tiles, fila 1, celda 1)
 *   public/assets/dungeon/stairs-down.png  escalera que baja   (Traps and Ground Tiles, fila 2, celda 1)
 *   public/assets/dungeon/trap-<id>.png    trampas reconocibles (ver CELLS)
 *
 * Fuente: Assets/items/items DS.png ("Ripped by redblueyellow. No credit needed.").
 * Cada celda mide 24×24, lo mismo que una casilla de la mazmorra.
 *
 * Uso: node tools/build-objects.mjs
 */
import { PNG } from 'pngjs';
import fs from 'node:fs';

const SRC = 'Assets/items/items DS.png';
const OUT = 'public/assets/dungeon';
const CELL = 24;
// Esquina superior izquierda de cada celda en la sección "Traps and Ground Tiles"
// (columnas en x = 13, 39, 64, 89, 114, 139, 164, 189; filas en y = 387, 412, 437).
// Trampas: identificadas por su dibujo [INCIERTO: la hoja no las nombra]. Las de
// Sueño, Veneno, Barro e Invocación no se distinguen con seguridad: siguen con placeholder.
const CELLS = {
  'stairs-up': { x: 13, y: 387 },
  'stairs-down': { x: 13, y: 412 },
  'trap-warpTrap': { x: 39, y: 387 }, //     remolino morado
  'trap-chestnutTrap': { x: 39, y: 412 }, // castaña con púas
  'trap-spinTrap': { x: 164, y: 412 }, //    espiral rosa
  'trap-pitfallTrap': { x: 189, y: 412 }, // agujero negro
};
const BG = [0, 128, 128]; // fondo verde azulado de la hoja

const sheet = PNG.sync.read(fs.readFileSync(SRC));
fs.mkdirSync(OUT, { recursive: true });
for (const [name, { x, y }] of Object.entries(CELLS)) {
  const out = new PNG({ width: CELL, height: CELL });
  for (let j = 0; j < CELL; j++)
    for (let i = 0; i < CELL; i++) {
      const s = ((y + j) * sheet.width + x + i) * 4, d = (j * CELL + i) * 4;
      const px = sheet.data.subarray(s, s + 4);
      if (px[0] === BG[0] && px[1] === BG[1] && px[2] === BG[2]) throw new Error(`${name}: la celda (${x},${y}) se sale del recuadro; ¿ha cambiado la hoja?`);
      out.data.set(px, d);
    }
  fs.writeFileSync(`${OUT}/${name}.png`, PNG.sync.write(out));
  console.log(`${OUT}/${name}.png`);
}
