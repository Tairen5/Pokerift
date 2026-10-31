/**
 * Vista previa del generador de pisos: dibuja pisos de cada distribución (y los de la expedición)
 * en smoke-output/gen/*.png para revisarlos a ojo.
 *
 *   npm run gen-preview                  → todas las distribuciones, 6 semillas cada una
 *   npm run gen-preview -- expedition 12  → 12 pisos de cada piso de la mazmorra
 *
 * Colores: pared gris oscuro, sala beige, pasillo marrón, cruce naranja, escalera azul, jugador
 * amarillo, enemigos rojos, objetos verdes, trampas violeta.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import { createRng } from '../src/shared/core/rng';
import { DUNGEONS, FLOOR_LAYOUTS, type FloorProperties, bandForFloor } from '../src/shared/data/dungeons';
import { SKY_RULES } from '../src/shared/data/rules';
import { type GeneratedFloor, generateFloor } from '../src/shared/dungeon/generator';
import { floorSeed } from '../src/shared/engine/floor';

const OUT = path.resolve('smoke-output/gen');
const PX = 4;
const COLORS = {
  wall: [40, 40, 48], room: [222, 205, 160], hall: [150, 110, 70], junction: [230, 140, 40],
  stairs: [40, 110, 230], player: [250, 220, 40], enemy: [220, 40, 40], item: [40, 170, 60], trap: [150, 60, 200],
} as const;

function draw(floors: GeneratedFloor[], cols: number, file: string) {
  const W = 56 * PX, H = 32 * PX, GAP = 6;
  const rows = Math.ceil(floors.length / cols);
  const png = new PNG({ width: cols * (W + GAP) + GAP, height: rows * (H + GAP) + GAP });
  png.data.fill(255);
  floors.forEach((g, n) => {
    const ox = GAP + (n % cols) * (W + GAP), oy = GAP + Math.floor(n / cols) * (H + GAP);
    const m = g.map;
    const special = new Map<string, readonly number[]>();
    for (const p of g.junctions) special.set(`${p.x},${p.y}`, COLORS.junction);
    for (const p of g.traps) special.set(`${p.x},${p.y}`, COLORS.trap);
    for (const p of g.items) special.set(`${p.x},${p.y}`, COLORS.item);
    for (const p of g.enemies) special.set(`${p.x},${p.y}`, COLORS.enemy);
    special.set(`${m.stairs.x},${m.stairs.y}`, COLORS.stairs);
    special.set(`${g.player.x},${g.player.y}`, COLORS.player);
    for (let y = 0; y < m.height; y++)
      for (let x = 0; x < m.width; x++) {
        const i = y * m.width + x;
        const c = special.get(`${x},${y}`) ?? (m.tiles[i] === 0 ? COLORS.wall : m.roomAt[i] >= 0 ? COLORS.room : COLORS.hall);
        for (let py = 0; py < PX; py++)
          for (let px = 0; px < PX; px++) {
            const k = ((oy + y * PX + py) * png.width + ox + x * PX + px) * 4;
            png.data[k] = c[0]; png.data[k + 1] = c[1]; png.data[k + 2] = c[2]; png.data[k + 3] = 255;
          }
      }
  });
  fs.writeFileSync(path.join(OUT, file), PNG.sync.write(png));
  console.log('→', path.join('smoke-output/gen', file));
}

fs.mkdirSync(OUT, { recursive: true });
const [dungeonId, countArg] = process.argv.slice(2);
if (dungeonId) {
  const d = DUNGEONS[dungeonId];
  if (!d) throw new Error(`Mazmorra desconocida: ${dungeonId}`);
  const n = Number(countArg ?? 6);
  for (let floor = 1; floor <= d.floors; floor++) {
    const fp = bandForFloor(d, floor).floor;
    const list = Array.from({ length: n }, (_, s) => generateFloor(createRng(floorSeed(s + 1, d.id, floor)), fp, SKY_RULES.floorGen));
    draw(list, 3, `${d.id}-${floor}.png`);
  }
} else {
  const base: FloorProperties = {
    layout: 'large', roomDensity: 6, floorConnectivity: 15, enemyDensity: 6, allowDeadEnds: false,
    roomImperfections: true, itemDensity: 4, trapDensity: 6, extraHallways: 10,
  };
  for (const layout of FLOOR_LAYOUTS) {
    const list = Array.from({ length: 6 }, (_, s) => generateFloor(createRng(s + 1), { ...base, layout }, SKY_RULES.floorGen));
    draw(list, 3, `${layout}.png`);
  }
}
