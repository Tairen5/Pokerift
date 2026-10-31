/**
 * Dibuja el mapa lógico con un tileset de autotiles (47 combinaciones de
 * vecinos). El mapa lógico no sabe nada de esto: cambiar de tileset no altera
 * la mazmorra.
 */
import Phaser from 'phaser';
import { type DungeonMap, Tile } from '../../shared/dungeon/map';

export interface TilesetAtlas {
  tileSize: number;
  terrains: Record<'wall' | 'ground' | 'water', Record<string, [number, number][]>>;
}

// Bits: N, NE, E, SE, S, SW, W, NW
const NEIGHBORS: [number, number][] = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

export function normalizeMask(m: number): number {
  const has = (b: number) => (m >> b) & 1;
  if (!(has(0) && has(2))) m &= ~(1 << 1);
  if (!(has(2) && has(4))) m &= ~(1 << 3);
  if (!(has(4) && has(6))) m &= ~(1 << 5);
  if (!(has(6) && has(0))) m &= ~(1 << 7);
  return m;
}

export function neighborMask(map: DungeonMap, x: number, y: number, same: (t: Tile) => boolean): number {
  let m = 0;
  NEIGHBORS.forEach(([dx, dy], bit) => {
    const nx = x + dx, ny = y + dy;
    const t = nx < 0 || ny < 0 || nx >= map.width || ny >= map.height ? Tile.Wall : map.tiles[ny * map.width + nx];
    if (same(t)) m |= 1 << bit;
  });
  return normalizeMask(m);
}

function popcount(n: number) {
  let c = 0;
  for (; n; n &= n - 1) c++;
  return c;
}

function lookup(table: Record<string, [number, number][]>, mask: number): [number, number][] {
  if (table[mask]) return table[mask];
  // Respaldo: la máscara disponible más parecida.
  let best = '255', bd = 99;
  for (const k of Object.keys(table)) {
    const d = popcount(Number(k) ^ mask);
    if (d < bd) [best, bd] = [k, d];
  }
  return table[best];
}

/** Hash estable por casilla para elegir variantes sin parpadeos. */
function cellHash(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

export function renderMapTexture(scene: Phaser.Scene, key: string, map: DungeonMap, tilesetKey: string, atlas: TilesetAtlas, seed: number): void {
  const ts = atlas.tileSize;
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, map.width * ts, map.height * ts)!;
  const ctx = tex.getContext();
  const src = scene.textures.get(tilesetKey).getSourceImage() as HTMLImageElement;
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const t = map.tiles[y * map.width + x];
      const terrain = t === Tile.Wall ? 'wall' : 'ground';
      const mask = neighborMask(map, x, y, (n) => (t === Tile.Wall ? n === Tile.Wall : n !== Tile.Wall));
      const options = lookup(atlas.terrains[terrain], mask);
      // La primera variante es la principal; las alternativas aparecen con menos frecuencia.
      const h = cellHash(x, y, seed);
      const pick = options.length > 1 && h % 100 < 18 ? options[1 + (h % (options.length - 1))] : options[0];
      ctx.drawImage(src, pick[0], pick[1], ts, ts, x * ts, y * ts, ts, ts);
    }
  }
  tex.refresh();
}
