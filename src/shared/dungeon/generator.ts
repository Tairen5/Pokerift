/**
 * Generador de pisos de Mundo Misterioso: reimplementación propia (mismos pasos, mismas constantes)
 * del algoritmo de los juegos.
 *
 * Fuentes:
 *  - Equipo de Rescate: pret/pmd-red, src/dungeon_generation.c (decompilación que compila byte a byte
 *    la ROM de GBA): GenerateFloor, GenerateStandardFloor, AssignRooms, CreateRoomsAndAnchors,
 *    AssignGridCellConnections, CreateGridCellConnections, CreateHallway, EnsureConnectedGrid,
 *    GenerateExtraHallways, GenerateRoomImperfections, FinalizeJunctions, SpawnNonEnemies,
 *    SpawnEnemies, ResolveInvalidSpawns, StairsAlwaysReachable.
 *  - Exploradores del Cielo: pmdsky-debug (overlay29, descripción de las mismas funciones) y
 *    dungeon-mystery (reimplementación de las rutinas de la ROM NA) para lo que cambia en EoS.
 *  No se ha copiado código de ninguno: solo la secuencia de pasos, las condiciones y las constantes.
 *
 * Diferencias con el original (no hay mecánica para ellas todavía): sin tiendas Kecleon, salas de
 * laberinto, estructuras secundarias, agua/lava, objetos enterrados, salas fijas ni escaleras ocultas.
 * El piso se marca como Casa de Monstruos (`monsterHouse`) pero aún no tiene efecto en el juego.
 *
 * Toda la aleatoriedad sale del RNG que se pasa: misma semilla → mismo piso.
 */
import { type RngState, next } from '../core/rng';
import type { Point } from '../core/geometry';
import type { FloorLayout, FloorProperties } from '../data/dungeons';
import { type DungeonMap, type Room, Tile, isWalkable } from './map';

/** Tamaño fijo del piso en los dos juegos (DUNGEON_MAX_SIZE_X/Y). */
export const FLOOR_W = 56;
export const FLOOR_H = 32;
/** Índices de sala especiales (0xFF pasillo, 0xFE ancla de pasillo). */
const HALL = -1;
const ANCHOR = -2;

/** Lo que cambia entre juegos en la generación (vive en rules.ts). */
export interface FloorGenRules {
  /** Casillas de sala mínimas para aceptar una distribución (RT 30, EoS 20). */
  minRoomTiles: number;
  /** Objetos y enemigos extra sobre la densidad (EoS suma 1 a cada uno; RT, 0). */
  extraItemSpawn: number;
  extraEnemySpawn: number;
  /** [PROPIO] Distancia mínima (en casillas) entre el punto de aparición del equipo y los enemigos. */
  minEnemyDistance: number;
}

export interface GeneratedFloor {
  map: DungeonMap;
  player: Point;
  items: Point[];
  traps: Point[];
  enemies: Point[];
  /** Distribución usada (puede ser la de emergencia si todo falla). */
  layout: FloorLayout;
  fallback: boolean;
  /** Sala marcada como Casa de Monstruos (-1 si no hay). [Sin efecto todavía] */
  monsterHouse: number;
  /** Casillas de cruce (sala junto a pasillo): ni escalera, ni objetos, ni jugador. */
  junctions: Point[];
}

// ── RNG con la semántica del juego ───────────────────────────────────────────

/** DungeonRandInt: entero en [0, n-1] (0 si n ≤ 0). */
function randInt(rng: RngState, n: number): number {
  return n <= 0 ? 0 : Math.floor(next(rng) * n);
}
/** DungeonRandRange: entero en [min, max-1] (el orden de los argumentos da igual). */
function randRange(rng: RngState, a: number, b: number): number {
  if (a === b) return a;
  return a < b ? a + randInt(rng, b - a) : b + randInt(rng, a - b);
}

// ── Casillas del piso ────────────────────────────────────────────────────────

type Size = 'large' | 'small' | 'medium';

class FloorTiles {
  open = new Uint8Array(FLOOR_W * FLOOR_H);
  room = new Int16Array(FLOOR_W * FLOOR_H).fill(HALL);
  junction = new Uint8Array(FLOOR_W * FLOOR_H);
  monsterHouse = new Uint8Array(FLOOR_W * FLOOR_H);
  monsterHouseRoom = -1;
  size: Size = 'large';

  reset() {
    this.open.fill(0);
    this.room.fill(HALL);
    this.junction.fill(0);
    this.monsterHouse.fill(0);
    this.monsterHouseRoom = -1;
  }
  isOpen(x: number, y: number) {
    return x >= 0 && y >= 0 && x < FLOOR_W && y < FLOOR_H && this.open[y * FLOOR_W + x] === 1;
  }
  /** Borde del mapa: pared irrompible (ResetFloor la marca en las casillas con vecinos fuera). */
  impassable(x: number, y: number) {
    return x <= 0 || y <= 0 || x >= FLOOR_W - 1 || y >= FLOOR_H - 1;
  }
  setOpen(x: number, y: number) {
    this.open[y * FLOOR_W + x] = 1;
  }
  setWall(x: number, y: number) {
    this.open[y * FLOOR_W + x] = 0;
  }
  roomAt(x: number, y: number) {
    return this.room[y * FLOOR_W + x];
  }
  setRoom(x: number, y: number, r: number) {
    this.room[y * FLOOR_W + x] = r;
  }
}

// ── Rejilla ──────────────────────────────────────────────────────────────────

interface Cell {
  sx: number; sy: number; ex: number; ey: number;
  invalid: boolean; isRoom: boolean; connected: boolean;
  isMerged: boolean; hasBeenMerged: boolean; imperfect: boolean; monsterHouse: boolean;
  /** Conexiones decididas (connected_to_*) y pendientes de excavar (should_connect_to_*). */
  cL: boolean; cR: boolean; cT: boolean; cB: boolean;
  sL: boolean; sR: boolean; sT: boolean; sB: boolean;
}

/** La rejilla del juego es siempre de 15×15 (GRID_CELL_LEN); solo se usa la parte gx×gy. */
const GRID_LEN = 15;
type Grid = Cell[][];

function newCell(): Cell {
  return {
    sx: 0, sy: 0, ex: 0, ey: 0, invalid: false, isRoom: true, connected: false,
    isMerged: false, hasBeenMerged: false, imperfect: false, monsterHouse: false,
    cL: false, cR: false, cT: false, cB: false, sL: false, sR: false, sT: false, sB: false,
  };
}

/** InitDungeonGrid: en pisos pequeños/medianos se invalidan las columnas de la derecha. */
function initGrid(f: FloorTiles, gx: number, gy: number): Grid {
  const grid: Grid = [];
  for (let x = 0; x < GRID_LEN; x++) {
    grid.push([]);
    for (let y = 0; y < GRID_LEN; y++) grid[x].push(newCell());
  }
  for (let x = 0; x < gx; x++)
    for (let y = 0; y < gy; y++) {
      const c = grid[x][y];
      c.invalid =
        (f.size === 'small' && x >= Math.floor(gx / 2)) || (f.size === 'medium' && x >= Math.floor((gx * 3) / 4));
      c.isRoom = true;
    }
  return grid;
}

/** GetGridPositions: columnas y filas de igual tamaño (56/gx, 32/gy). */
function gridPositions(gx: number, gy: number): { lx: number[]; ly: number[] } {
  const lx: number[] = [], ly: number[] = [];
  for (let i = 0; i <= gx; i++) lx.push(i * Math.floor(FLOOR_W / gx));
  for (let i = 0; i <= gy; i++) ly.push(i * Math.floor(FLOOR_H / gy));
  return { lx, ly };
}

/** Celda con sala real, válida y conectada (la condición que repiten casi todos los pasos). */
const usableRoom = (c: Cell) => !c.invalid && c.isRoom && c.connected && !c.hasBeenMerged;

/** AssignRooms: n salas (n..n+2 si la densidad es positiva; exactamente |n| si es negativa). */
function assignRooms(rng: RngState, grid: Grid, gx: number, gy: number, density: number) {
  const extra = randInt(rng, 3);
  const n = density < 0 ? -density : density + extra;
  const bits = new Array<boolean>(256).fill(false);
  for (let i = 0; i < n && i < 256; i++) bits[i] = true;
  const max = gx * gy;
  for (let i = 0; i < 64; i++) {
    const a = randInt(rng, max), b = randInt(rng, max);
    [bits[a], bits[b]] = [bits[b], bits[a]];
  }
  let count = 0, rooms = 0;
  for (let x = 0; x < gx; x++)
    for (let y = 0; y < gy; y++) {
      const c = grid[x][y];
      if (c.invalid) continue;
      if (bits[count]) {
        c.isRoom = true;
        rooms++;
        // Nunca hay sala en (centro, 1) si el número de columnas es impar.
        if (gx % 2 !== 0 && x === (gx - 1) / 2 && y === 1) c.isRoom = false;
      } else c.isRoom = false;
      count++;
    }
  if (rooms >= 2) return;
  for (let attempt = 0; attempt < 200; attempt++) {
    let done = false;
    for (let x = 0; x < gx && !done; x++)
      for (let y = 0; y < gy && !done; y++) {
        if (grid[x][y].invalid) continue;
        if (randInt(rng, 100) < 60) {
          grid[x][y].isRoom = true;
          done = true;
        }
      }
    if (done) break;
  }
}

/**
 * CreateRoomsAndAnchors: rectángulo de 5×4 como mínimo dentro de cada celda de sala, con margen,
 * dimensiones impares si caben y proporción entre 2/3 y 3/2; una casilla (ancla) en las demás.
 */
function createRoomsAndAnchors(
  rng: RngState, f: FloorTiles, grid: Grid, gx: number, gy: number, lx: number[], ly: number[], imperfections: boolean,
) {
  let roomNumber = 0;
  for (let y = 0; y < gy; y++)
    for (let x = 0; x < gx; x++) {
      const c = grid[x][y];
      const rangeX = lx[x + 1] - lx[x] - 4;
      const rangeY = ly[y + 1] - ly[y] - 3;
      if (c.invalid) continue;
      if (!c.isRoom) {
        const x1 = x === 0 ? 1 : 2, x2 = x === gx - 1 ? 2 : 4;
        const y1 = y === 0 ? 1 : 2, y2 = y === gy - 1 ? 2 : 4;
        const px = randRange(rng, lx[x] + 2 + x1, lx[x] + 2 + rangeX - x2);
        const py = randRange(rng, ly[y] + 2 + y1, ly[y] + 2 + rangeY - y2);
        Object.assign(c, { sx: px, sy: py, ex: px + 1, ey: py + 1 });
        f.setOpen(px, py);
        f.setRoom(px, py, ANCHOR);
        continue;
      }
      let w = randRange(rng, 5, rangeX);
      let h = randRange(rng, 4, rangeY);
      if ((w | 1) < rangeX) w |= 1;
      if ((h | 1) < rangeY) h |= 1;
      if (w > Math.floor((h * 3) / 2)) w = Math.floor((h * 3) / 2);
      if (h > Math.floor((w * 3) / 2)) h = Math.floor((w * 3) / 2);
      const sx = randInt(rng, rangeX - w) + lx[x] + 2;
      const sy = randInt(rng, rangeY - h) + ly[y] + 2;
      Object.assign(c, { sx, sy, ex: sx + w, ey: sy + h });
      for (let rx = sx; rx < sx + w; rx++)
        for (let ry = sy; ry < sy + h; ry++) {
          f.setOpen(rx, ry);
          f.setRoom(rx, ry, roomNumber);
        }
      // Tirada de estructura secundaria (80 %): sin presupuesto no se usa, pero consume la tirada.
      randInt(rng, 100);
      c.imperfect = imperfections;
      roomNumber++;
    }
}

/** Salas de las distribuciones especiales: otro margen (rango -3, mínimo +2) y sin dimensiones impares. */
function createFixedLayoutCells(
  rng: RngState, f: FloorTiles, grid: Grid, gx: number, gy: number, lx: number[], ly: number[],
) {
  let roomNumber = 0;
  for (let y = 0; y < gy; y++)
    for (let x = 0; x < gx; x++) {
      const c = grid[x][y];
      if (c.invalid) continue;
      const rangeX = lx[x + 1] - lx[x] - 3;
      const rangeY = ly[y + 1] - ly[y] - 3;
      if (c.isRoom) {
        const w = randRange(rng, 5, rangeX), h = randRange(rng, 4, rangeY);
        const sx = randInt(rng, rangeX - w) + lx[x] + 2, sy = randInt(rng, rangeY - h) + ly[y] + 2;
        Object.assign(c, { sx, sy, ex: sx + w, ey: sy + h });
        for (let rx = sx; rx < sx + w; rx++)
          for (let ry = sy; ry < sy + h; ry++) {
            f.setOpen(rx, ry);
            f.setRoom(rx, ry, roomNumber);
          }
        roomNumber++;
      } else {
        const sx = randRange(rng, lx[x] + 1, lx[x] + 1 + rangeX), sy = randRange(rng, ly[y] + 1, ly[y] + 1 + rangeY);
        Object.assign(c, { sx, sy, ex: sx + 1, ey: sy + 1 });
        f.setOpen(sx, sy);
        f.setRoom(sx, sy, HALL);
      }
    }
}

/**
 * AssignGridCellConnections: paseo aleatorio con «inercia» (50 % de seguir recto; gira a la
 * izquierda en los bordes) repetido floorConnectivity veces. Sin callejones: las anclas con una sola
 * conexión reciben otra. Se reproduce el fallo del original (comprueba la validez de la celda de la
 * derecha en lugar de la de destino).
 */
function assignConnections(rng: RngState, grid: Grid, gx: number, gy: number, fp: FloorProperties) {
  let cx = randInt(rng, gx), cy = randInt(rng, gy);
  let dir = randInt(rng, 4); // 0 este, 1 norte, 2 oeste, 3 sur
  for (let i = 0; i < fp.floorConnectivity; i++) {
    const test = randInt(rng, 8);
    const nd = randInt(rng, 4);
    if (test < 4) dir = nd;
    for (;;) {
      const ok = dir === 0 ? cx < gx - 1 : dir === 1 ? cy > 0 : dir === 2 ? cx > 0 : cy < gy - 1;
      if (ok) break;
      dir = (dir + 1) % 4;
    }
    if (dir === 0 && !grid[cx + 1][cy].invalid) {
      grid[cx][cy].cR = grid[cx + 1][cy].cL = true;
      cx++;
    } else if (dir === 1 && !grid[cx][cy - 1].invalid) {
      grid[cx][cy].cT = grid[cx][cy - 1].cB = true;
      cy--;
    } else if (dir === 2 && !grid[cx - 1][cy].invalid) {
      grid[cx][cy].cL = grid[cx - 1][cy].cR = true;
      cx--;
    } else if (dir === 3 && !grid[cx][cy + 1].invalid) {
      grid[cx][cy].cB = grid[cx][cy + 1].cT = true;
      cy++;
    }
  }
  if (fp.allowDeadEnds) return;
  let more = true;
  while (more) {
    more = false;
    for (let y = 0; y < gy; y++)
      for (let x = 0; x < gx; x++) {
        const c = grid[x][y];
        if (c.invalid || c.isRoom) continue;
        if (+c.cT + +c.cB + +c.cL + +c.cR !== 1) continue;
        let d = randInt(rng, 4);
        let ok = false;
        for (let i = 0; i < 8; i++) {
          if (d === 0 && x < gx - 1 && !c.cR) ok = true;
          else if (d === 1 && y > 0 && !c.cT) ok = true;
          else if (d === 2 && x > 0 && !c.cL) ok = true;
          else if (d === 3 && y < gy - 1 && !c.cB) ok = true;
          else d = (d + 1) % 4;
          if (ok) break;
        }
        if (!ok) continue;
        const right = grid[x + 1][y]; // fallo original: siempre se mira esta celda
        if (d === 0 && !right.invalid) {
          c.cR = right.cL = true;
          more = true;
          x++;
        } else if (d === 1 && !right.invalid) {
          c.cT = grid[x][y - 1].cB = true;
          more = true;
          y--;
        } else if (d === 2 && !right.invalid) {
          c.cL = grid[x - 1][y].cR = true;
          more = true;
          x--;
        } else if (d === 3 && !right.invalid) {
          c.cB = grid[x][y + 1].cT = true;
          y++;
        }
      }
  }
}

/**
 * CreateHallway: dos tramos paralelos unidos por un codo en `turn` (en la práctica, el límite entre
 * celdas). Se detiene al llegar a una casilla ya abierta (se ha unido a otro pasillo).
 */
function createHallway(f: FloorTiles, x0: number, y0: number, x1: number, y1: number, vertical: boolean, turnX: number, turnY: number) {
  let x = x0, y = y0;
  const step = (axis: 'x' | 'y', target: number, firstLeg: boolean): boolean => {
    let counter = 0;
    while ((axis === 'x' ? x : y) !== target) {
      if (counter++ >= FLOOR_W) return false;
      if (!f.isOpen(x, y)) f.setOpen(x, y);
      else if (firstLeg ? (axis === 'x' ? x !== x0 : y !== y0) : x !== x0 || y !== y0) return false;
      if (axis === 'x') x += x < target ? 1 : -1;
      else y += y < target ? 1 : -1;
    }
    return true;
  };
  if (vertical) {
    if (!step('y', turnY, true)) return;
    if (!step('x', x1, false)) return;
    step('y', y1, false);
  } else {
    if (!step('x', turnX, true)) return;
    if (!step('y', y1, false)) return;
    step('x', x1, false);
  }
}

/** Punto de una celda por el que entra un pasillo: el ancla o una casilla interior de la sala. */
const innerX = (rng: RngState, c: Cell) => (c.isRoom ? randRange(rng, c.sx + 1, c.ex - 1) : c.sx);
const innerY = (rng: RngState, c: Cell) => (c.isRoom ? randRange(rng, c.sy + 1, c.ey - 1) : c.sy);

/**
 * CreateGridCellConnections: excava un pasillo por cada conexión y, si se permite, fusiona salas
 * conectadas (5 % por sala y 1/4 por dirección; cada sala solo una vez).
 */
function createConnections(
  rng: RngState, f: FloorTiles, grid: Grid, gx: number, gy: number, lx: number[], ly: number[], disableMerge: boolean,
) {
  for (let y = 0; y < gy; y++)
    for (let x = 0; x < gx; x++) {
      const c = grid[x][y];
      if (c.invalid) {
        c.sT = c.sB = c.sL = c.sR = false;
        continue;
      }
      if (x === 0) c.cL = false;
      if (y === 0) c.cT = false;
      if (x === gx - 1) c.cR = false;
      if (y === gy - 1) c.cB = false;
      c.sT = c.cT; c.sB = c.cB; c.sL = c.cL; c.sR = c.cR;
    }
  for (let x = 0; x < gx; x++)
    for (let y = 0; y < gy; y++) {
      const c = grid[x][y];
      if (c.invalid) continue;
      const px = c.isRoom ? randRange(rng, c.sx + 1, c.ex - 1) : c.sx;
      const py = c.isRoom ? randRange(rng, c.sy + 1, c.ey - 1) : c.sy;
      if (c.sT) {
        const o = grid[x][y - 1];
        if (!o.invalid) createHallway(f, px, c.sy, innerX(rng, o), o.ey - 1, true, lx[x], ly[y]);
        c.sT = o.sB = false;
        c.connected = o.connected = true;
      }
      if (c.sB) {
        const o = grid[x][y + 1];
        if (!o.invalid) createHallway(f, px, c.ey - 1, innerX(rng, o), o.sy, true, lx[x], ly[y + 1] - 1);
        c.sB = o.sT = false;
        c.connected = o.connected = true;
      }
      if (c.sL) {
        const o = grid[x - 1][y];
        if (!o.invalid) createHallway(f, c.sx, py, o.sx - 1, innerY(rng, o), false, lx[x], ly[y]);
        c.sL = o.sR = false;
        c.connected = o.connected = true;
      }
      if (c.sR) {
        const o = grid[x + 1][y];
        if (!o.invalid) createHallway(f, c.ex - 1, py, o.sx, innerY(rng, o), false, lx[x + 1] - 1, ly[y]);
        c.sR = o.sL = false;
        c.connected = o.connected = true;
      }
    }
  if (disableMerge) return;
  const canMerge = (c: Cell) => !c.invalid && c.connected && !c.isMerged && c.isRoom;
  for (let x = 0; x < gx; x++)
    for (let y = 0; y < gy; y++) {
      const roll = randInt(rng, 100);
      const c = grid[x][y];
      if (!(roll < 5 && canMerge(c))) continue;
      const d = randInt(rng, 4);
      const o =
        d === 0 && x >= 1 ? grid[x - 1][y] : d === 1 && y >= 1 ? grid[x][y - 1]
        : d === 2 && x <= gx - 2 ? grid[x + 1][y] : d === 3 && y <= gy - 2 ? grid[x][y + 1] : null;
      if (!o || !canMerge(o)) continue;
      const horizontal = d === 0 || d === 2;
      const [first, second] = d === 0 || d === 1 ? [o, c] : [c, o];
      const sx = horizontal ? first.sx : Math.min(o.sx, c.sx);
      const ex = horizontal ? second.ex : Math.max(o.ex, c.ex);
      const sy = horizontal ? Math.min(o.sy, c.sy) : first.sy;
      const ey = horizontal ? Math.max(o.ey, c.ey) : second.ey;
      const id = f.roomAt(c.sx, c.sy);
      for (let mx = sx; mx < ex; mx++)
        for (let my = sy; my < ey; my++) {
          f.setOpen(mx, my);
          f.setRoom(mx, my, id);
        }
      Object.assign(o, { sx, sy, ex, ey, isMerged: true });
      c.isMerged = true;
      c.connected = false;
      c.hasBeenMerged = true;
    }
}

/** MergeRoomsVertically (distribución «escarabajo»). */
function mergeVertically(f: FloorTiles, grid: Grid, rx: number, ry: number, dy: number) {
  const a = grid[rx][ry], b = grid[rx][ry + dy];
  const sx = Math.min(a.sx, b.sx), ex = Math.max(a.ex, b.ex), sy = a.sy, ey = b.ey;
  const id = f.roomAt(a.sx, a.sy);
  for (let x = sx; x < ex; x++)
    for (let y = sy; y < ey; y++) {
      f.setOpen(x, y);
      f.setRoom(x, y, id);
    }
  Object.assign(a, { sx, ex, sy, ey, isMerged: true });
  b.isMerged = true;
  b.connected = false;
  b.hasBeenMerged = true;
}

/**
 * EnsureConnectedGrid: cada celda que quedó sin conectar se une a una vecina conectada; si no puede,
 * se borra (las anclas sueltas se borran siempre).
 */
function ensureConnected(rng: RngState, f: FloorTiles, grid: Grid, gx: number, gy: number, lx: number[], ly: number[]) {
  for (let x = 0; x < gx; x++)
    for (let y = 0; y < gy; y++) {
      const c = grid[x][y];
      if (c.invalid || c.connected || c.hasBeenMerged) continue;
      if (c.isRoom) {
        const rx = randRange(rng, c.sx + 1, c.ex - 1);
        const ry = randRange(rng, c.sy + 1, c.ey - 1);
        const ok = (o: Cell) => !o.invalid && !o.isMerged && o.connected;
        if (y > 0 && ok(grid[x][y - 1])) {
          const o = grid[x][y - 1];
          const px = o.isRoom ? randRange(rng, o.sx + 1, o.ex - 1) : o.sx;
          if (o.isRoom) randRange(rng, o.sy + 1, o.ey - 1);
          createHallway(f, rx, c.sy, px, o.ey - 1, true, lx[x], ly[y]);
          c.connected = c.cT = o.cB = true;
        } else if (y < gy - 1 && ok(grid[x][y + 1])) {
          const o = grid[x][y + 1];
          const px = o.isRoom ? randRange(rng, o.sx + 1, o.ex - 1) : o.sx;
          if (o.isRoom) randRange(rng, o.sy + 1, o.ey - 1);
          createHallway(f, rx, c.ey - 1, px, o.sy, true, lx[x], ly[y + 1] - 1);
          c.connected = c.cB = o.cT = true;
        } else if (x > 0 && ok(grid[x - 1][y])) {
          const o = grid[x - 1][y];
          if (o.isRoom) randRange(rng, o.sx + 1, o.ex - 1);
          const py = o.isRoom ? randRange(rng, o.sy + 1, o.ey - 1) : o.sy;
          createHallway(f, c.sx, ry, o.sx - 1, py, false, lx[x], ly[y]);
          c.connected = c.cL = o.cR = true;
        } else if (x < gx - 1 && ok(grid[x + 1][y])) {
          const o = grid[x + 1][y];
          if (o.isRoom) randRange(rng, o.sx + 1, o.ex - 1);
          const py = o.isRoom ? randRange(rng, o.sy + 1, o.ey - 1) : o.sy;
          createHallway(f, c.ex - 1, ry, o.sx, py, false, lx[x + 1] - 1, ly[y]);
          c.connected = c.cR = o.cL = true;
        }
      } else {
        f.setWall(c.sx, c.sy);
      }
    }
  for (let x = 0; x < gx; x++)
    for (let y = 0; y < gy; y++) {
      const c = grid[x][y];
      if (c.invalid || c.hasBeenMerged || c.connected) continue;
      for (let cx = c.sx; cx < c.ex; cx++)
        for (let cy = c.sy; cy < c.ey; cy++) {
          f.setWall(cx, cy);
          f.setRoom(cx, cy, HALL);
        }
    }
}

/** GenerateMonsterHouse: con la probabilidad dada, una sala válida al azar pasa a ser Casa de Monstruos. */
function generateMonsterHouse(rng: RngState, f: FloorTiles, grid: Grid, gx: number, gy: number, chance: number) {
  if (chance <= 0 || randInt(rng, 100) >= chance) return;
  const valid: Cell[] = [];
  for (let x = 0; x < gx; x++) for (let y = 0; y < gy; y++) if (usableRoom(grid[x][y])) valid.push(grid[x][y]);
  if (!valid.length) return;
  const bits = new Array<boolean>(256).fill(false);
  bits[0] = true;
  for (let i = 0; i < 64; i++) {
    const a = randInt(rng, valid.length), b = randInt(rng, valid.length);
    [bits[a], bits[b]] = [bits[b], bits[a]];
  }
  const c = valid[bits.indexOf(true)];
  if (!c) return;
  c.monsterHouse = true;
  for (let x = c.sx; x < c.ex; x++)
    for (let y = c.sy; y < c.ey; y++) {
      f.monsterHouse[y * FLOOR_W + x] = 1;
      f.monsterHouseRoom = f.roomAt(x, y);
    }
}

/** Direcciones del juego (0 abajo, 2 derecha, 4 arriba, 6 izquierda; impares, diagonales). */
const DX = [0, 1, 1, 1, 0, -1, -1, -1];
const DY = [1, 1, 0, -1, -1, -1, 0, 1];

/**
 * GenerateExtraHallways: paseos aleatorios que salen de una sala en línea recta y van excavando con
 * giros a izquierda o derecha cada 3–5 pasos, sin abrir cuadrados de 2×2, hasta unirse a terreno
 * abierto, tocar el borde o pasar junto a otro pasillo. Dan los pasillos sin salida y los bucles.
 */
function generateExtraHallways(rng: RngState, f: FloorTiles, grid: Grid, gx: number, gy: number, count: number) {
  for (let i = 0; i < count; i++) {
    const gxi = randInt(rng, gx), gyi = randInt(rng, gy);
    const c = grid[gxi][gyi];
    if (!c.isRoom || !c.connected || c.invalid) continue;
    let x = randRange(rng, c.sx, c.ex);
    let y = randRange(rng, c.sy, c.ey);
    let dir = randInt(rng, 4) * 2;
    for (let j = 0; j < 3; j++) {
      if (dir === 0 && gyi >= gy - 1) dir = 2;
      if (dir === 2 && gxi >= gx - 1) dir = 4;
      if (dir === 4 && gyi <= 0) dir = 6;
      if (dir === 6 && gxi <= 0) dir = 0;
    }
    const room = f.roomAt(x, y);
    while (f.roomAt(x, y) === room && x >= 0 && y >= 0 && x < FLOOR_W && y < FLOOR_H) {
      x += DX[dir];
      y += DY[dir];
    }
    while (f.isOpen(x, y)) {
      x += DX[dir];
      y += DY[dir];
    }
    if (x - 2 < 0 || y - 2 < 0 || x + 2 >= FLOOR_W || y + 2 >= FLOOR_H) continue;
    const side = (d: number) => f.isOpen(x + DX[(d + 2) % 8], y + DY[(d + 2) % 8]) || f.isOpen(x + DX[(d + 6) % 8], y + DY[(d + 6) % 8]);
    if (side(dir)) continue;
    let steps = randInt(rng, 3) + 3;
    for (;;) {
      if (x <= 1 || y <= 1 || x >= FLOOR_W - 1 || y >= FLOOR_H - 1) break;
      if (f.isOpen(x, y) || f.impassable(x, y)) break;
      const o = (dx: number, dy: number) => f.isOpen(x + dx, y + dy);
      const square =
        (o(1, 0) && o(1, 1) && o(0, 1)) || (o(1, 0) && o(1, -1) && o(0, -1)) ||
        (o(-1, 0) && o(-1, 1) && o(0, 1)) || (o(-1, 0) && o(-1, -1) && o(0, -1));
      if (!square) f.setOpen(x, y);
      if (side(dir)) break;
      if (--steps === 0) {
        steps = randInt(rng, 3) + 3;
        dir = randInt(rng, 100) < 50 ? (dir + 2) % 8 : (dir + 6) % 8;
        if (x >= 32 && f.size === 'small' && dir === 2) break;
        if (x >= 48 && f.size === 'medium' && dir === 2) break;
      }
      x += DX[dir];
      y += DY[dir];
    }
  }
}

/** Para cada esquina: qué vecinos cardinales (abajo, derecha, arriba, izquierda) deben estar abiertos. */
const CORNER_OPEN: boolean[][] = [
  [true, true, false, false], // arriba-izquierda
  [true, false, false, true], // arriba-derecha
  [false, false, true, true], // abajo-derecha
  [false, true, true, false], // abajo-izquierda
];

/**
 * GenerateRoomImperfections: en el 40 % de las salas marcadas, las paredes «crecen» hacia dentro desde
 * las esquinas ((ancho+alto)/4 rondas), sin tocar las casillas próximas a un pasillo y solo donde la
 * casilla sigue siendo una esquina (así la sala no se parte).
 */
function generateImperfections(rng: RngState, f: FloorTiles, grid: Grid, gx: number, gy: number) {
  for (let gxi = 0; gxi < gx; gxi++)
    for (let gyi = 0; gyi < gy; gyi++) {
      const c = grid[gxi][gyi];
      if (c.invalid || c.hasBeenMerged || c.isMerged || !c.isRoom || !c.connected || !c.imperfect) continue;
      if (randInt(rng, 100) < 60) continue;
      const rounds = Math.max(Math.floor((c.ex - c.sx + (c.ey - c.sy)) / 4), 1);
      for (let r = 0; r < rounds; r++)
        for (let i = 0; i < 2; i++) {
          const corner = randInt(rng, 4);
          let px = corner === 0 || corner === 3 ? c.sx : c.ex - 1;
          let py = corner <= 1 ? c.sy : c.ey - 1;
          // Recorrido a lo largo de un borde desde la esquina (vertical u horizontal según i).
          const moves = [
            [[0, 1], [1, 0]], [[-1, 0], [0, 1]], [[0, -1], [-1, 0]], [[1, 0], [0, -1]],
          ][corner][i];
          for (let v = 0; v < 10; v++) {
            if (px < c.sx || px >= c.ex || py < c.sy || py >= c.ey) break;
            if (!f.isOpen(px, py)) {
              px += moves[0];
              py += moves[1];
              continue;
            }
            let nearHall = false;
            for (let d = 0; d < 8 && !nearHall; d++)
              for (let ox = -1; ox <= 1 && !nearHall; ox++)
                for (let oy = -1; oy <= 1 && !nearHall; oy++) {
                  const qx = px + DX[d] + ox, qy = py + DY[d] + oy;
                  if (f.isOpen(qx, qy) && f.roomAt(qx, qy) === HALL) nearHall = true;
                }
            if (!nearHall) {
              const want = CORNER_OPEN[corner];
              const isCorner = [0, 2, 4, 6].every((d, k) => f.isOpen(px + DX[d], py + DY[d]) === want[k]);
              if (isCorner) f.setWall(px, py);
            }
            break;
          }
        }
    }
}

// ── Distribuciones ──────────────────────────────────────────────────────────

function standardFloor(rng: RngState, f: FloorTiles, gx: number, gy: number, fp: FloorProperties) {
  const { lx, ly } = gridPositions(gx, gy);
  const grid = initGrid(f, gx, gy);
  assignRooms(rng, grid, gx, gy, fp.roomDensity);
  createRoomsAndAnchors(rng, f, grid, gx, gy, lx, ly, fp.roomImperfections);
  assignConnections(rng, grid, gx, gy, fp);
  createConnections(rng, f, grid, gx, gy, lx, ly, false);
  ensureConnected(rng, f, grid, gx, gy, lx, ly);
  generateMonsterHouse(rng, f, grid, gx, gy, fp.monsterHouseChance ?? 0);
  generateExtraHallways(rng, f, grid, gx, gy, fp.extraHallways);
  generateImperfections(rng, f, grid, gx, gy);
}

/** Celdas de una distribución especial con conexiones fijas. */
function connectAll(grid: Grid, pairs: [number, number, number, number][]) {
  for (const [ax, ay, bx, by] of pairs) {
    const a = grid[ax][ay], b = grid[bx][by];
    if (bx > ax) (a.cR = true), (b.cL = true);
    else if (bx < ax) (a.cL = true), (b.cR = true);
    else if (by > ay) (a.cB = true), (b.cT = true);
    else (a.cT = true), (b.cB = true);
  }
}

/** Anillo exterior: rejilla 6×4, borde de pasillos y 4×2 salas dentro. */
function outerRingFloor(rng: RngState, f: FloorTiles, fp: FloorProperties) {
  const gx = 6, gy = 4;
  const lx = [0, 5, 16, 28, 39, 51, 56], ly = [2, 7, 16, 25, 30];
  const grid = initGrid(f, gx, gy);
  for (let x = 0; x < gx; x++) for (let y = 0; y < gy; y++) grid[x][y].isRoom = x > 0 && x < gx - 1 && y > 0 && y < gy - 1;
  createFixedLayoutCells(rng, f, grid, gx, gy, lx, ly);
  const ring: [number, number, number, number][] = [];
  for (let x = 0; x < gx - 1; x++) ring.push([x, 0, x + 1, 0], [x, gy - 1, x + 1, gy - 1]);
  for (let y = 0; y < gy - 1; y++) ring.push([0, y, 0, y + 1], [gx - 1, y, gx - 1, y + 1]);
  connectAll(grid, ring);
  assignConnections(rng, grid, gx, gy, fp);
  createConnections(rng, f, grid, gx, gy, lx, ly, false);
  ensureConnected(rng, f, grid, gx, gy, lx, ly);
  generateMonsterHouse(rng, f, grid, gx, gy, fp.monsterHouseChance ?? 0);
  generateExtraHallways(rng, f, grid, gx, gy, fp.extraHallways);
  generateImperfections(rng, f, grid, gx, gy);
}

/** Cruces: malla de pasillos en el interior 3×2 y salas alrededor, sin esquinas. */
function crossroadsFloor(rng: RngState, f: FloorTiles, fp: FloorProperties) {
  const gx = 5, gy = 4;
  const lx = [0, 11, 22, 33, 44, 56], ly = [1, 9, 16, 23, 31];
  const grid = initGrid(f, gx, gy);
  for (let x = 0; x < gx; x++) for (let y = 0; y < gy; y++) grid[x][y].isRoom = !(x > 0 && x < gx - 1 && y > 0 && y < gy - 1);
  grid[0][0].invalid = grid[4][0].invalid = grid[0][3].invalid = grid[4][3].invalid = true;
  createFixedLayoutCells(rng, f, grid, gx, gy, lx, ly);
  const pairs: [number, number, number, number][] = [];
  for (let x = 1; x < gx - 1; x++) for (let y = 0; y < gy - 1; y++) pairs.push([x, y, x, y + 1]);
  for (let y = 1; y < gy - 1; y++) for (let x = 0; x < gx - 1; x++) pairs.push([x, y, x + 1, y]);
  connectAll(grid, pairs);
  createConnections(rng, f, grid, gx, gy, lx, ly, true);
  ensureConnected(rng, f, grid, gx, gy, lx, ly);
  generateMonsterHouse(rng, f, grid, gx, gy, fp.monsterHouseChance ?? 0);
  generateExtraHallways(rng, f, grid, gx, gy, fp.extraHallways);
  generateImperfections(rng, f, grid, gx, gy);
}

/** Línea: 5 celdas en horizontal. */
function lineFloor(rng: RngState, f: FloorTiles, fp: FloorProperties) {
  const gx = 5, gy = 1;
  const lx = [0, 11, 22, 33, 44, 56], ly = [4, 15];
  const grid = initGrid(f, gx, gy);
  assignRooms(rng, grid, gx, gy, fp.roomDensity);
  createRoomsAndAnchors(rng, f, grid, gx, gy, lx, ly, fp.roomImperfections);
  assignConnections(rng, grid, gx, gy, fp);
  createConnections(rng, f, grid, gx, gy, lx, ly, true);
  ensureConnected(rng, f, grid, gx, gy, lx, ly);
  generateMonsterHouse(rng, f, grid, gx, gy, fp.monsterHouseChance ?? 0);
  generateExtraHallways(rng, f, grid, gx, gy, fp.extraHallways);
  generateImperfections(rng, f, grid, gx, gy);
}

/** Cruz: 5 salas en forma de «+». Escarabajo: 3×3 salas con la columna central fusionada. */
function crossOrBeetleFloor(rng: RngState, f: FloorTiles, fp: FloorProperties, beetle: boolean) {
  const gx = 3, gy = 3;
  const lx = beetle ? [5, 15, 35, 50] : [11, 22, 33, 44], ly = [2, 11, 20, 30];
  const grid = initGrid(f, gx, gy);
  if (!beetle) grid[0][0].invalid = grid[2][0].invalid = grid[0][2].invalid = grid[2][2].invalid = true;
  createRoomsAndAnchors(rng, f, grid, gx, gy, lx, ly, fp.roomImperfections);
  if (beetle) {
    const rows: [number, number, number, number][] = [];
    for (let y = 0; y < 3; y++) rows.push([0, y, 1, y], [1, y, 2, y]);
    connectAll(grid, rows);
  } else connectAll(grid, [[0, 1, 1, 1], [1, 1, 2, 1], [1, 0, 1, 1], [1, 1, 1, 2]]);
  createConnections(rng, f, grid, gx, gy, lx, ly, true);
  if (beetle) {
    mergeVertically(f, grid, 1, 0, 1);
    mergeVertically(f, grid, 1, 0, 2);
  }
  ensureConnected(rng, f, grid, gx, gy, lx, ly);
  generateMonsterHouse(rng, f, grid, gx, gy, fp.monsterHouseChance ?? 0);
  generateExtraHallways(rng, f, grid, gx, gy, fp.extraHallways);
  generateImperfections(rng, f, grid, gx, gy);
}

/**
 * Salas exteriores: anillo de salas en el borde de la rejilla y nada dentro. Se reproduce el fallo
 * del original en las conexiones (no une bien el anillo con menos de 4 columnas).
 */
function outerRoomsFloor(rng: RngState, f: FloorTiles, gx: number, gy: number, fp: FloorProperties) {
  const { lx, ly } = gridPositions(gx, gy);
  const grid = initGrid(f, gx, gy);
  for (let x = 1; x < gx - 1; x++) for (let y = 1; y < gy - 1; y++) grid[x][y].invalid = true;
  createRoomsAndAnchors(rng, f, grid, gx, gy, lx, ly, fp.roomImperfections);
  for (let x = 0; x < gx - 1; x++) {
    if (x !== 0) grid[x][0].cR = grid[x][gy - 1].cR = true;
    if (x < gx - 2) grid[x + 1][0].cL = grid[x + 1][gy - 1].cL = true;
  }
  for (let y = 0; y < gy - 1; y++) {
    if (y !== 0) grid[0][y].cT = grid[gx - 1][y].cT = true;
    if (y < gy - 2) grid[0][y].cB = grid[gx - 1][y].cB = true;
  }
  createConnections(rng, f, grid, gx, gy, lx, ly, false);
  ensureConnected(rng, f, grid, gx, gy, lx, ly);
  generateMonsterHouse(rng, f, grid, gx, gy, fp.monsterHouseChance ?? 0);
  generateExtraHallways(rng, f, grid, gx, gy, fp.extraHallways);
  generateImperfections(rng, f, grid, gx, gy);
}

/** Una sola sala enorme, Casa de Monstruos: la distribución de emergencia. */
function oneRoomFloor(rng: RngState, f: FloorTiles) {
  const grid = initGrid(f, 1, 1);
  Object.assign(grid[0][0], { sx: 2, sy: 2, ex: FLOOR_W - 2, ey: FLOOR_H - 2, isRoom: true, connected: true, invalid: false });
  for (let x = 2; x < FLOOR_W - 2; x++)
    for (let y = 2; y < FLOOR_H - 2; y++) {
      f.setOpen(x, y);
      f.setRoom(x, y, 0);
    }
  generateMonsterHouse(rng, f, grid, 1, 1, 999);
}

/** Dos salas grandes (izquierda y derecha) y una de ellas, Casa de Monstruos. */
function twoRoomsFloor(rng: RngState, f: FloorTiles) {
  const gx = 2, gy = 1;
  const lx = [2, 28, 54], ly = [2, 30];
  const grid = initGrid(f, gx, gy);
  for (let x = 0; x < gx; x++) {
    const rangeX = lx[x + 1] - lx[x] - 3, rangeY = ly[1] - ly[0] - 3;
    const w = randRange(rng, 10, rangeX), h = randRange(rng, 16, rangeY);
    const sx = randInt(rng, rangeX - w) + lx[x] + 1, sy = randInt(rng, rangeY - h) + ly[0] + 1;
    Object.assign(grid[x][0], { isRoom: true, sx, sy, ex: sx + w, ey: sy + h });
    for (let rx = sx; rx < sx + w; rx++)
      for (let ry = sy; ry < sy + h; ry++) {
        f.setOpen(rx, ry);
        f.setRoom(rx, ry, x);
      }
  }
  connectAll(grid, [[0, 0, 1, 0]]);
  createConnections(rng, f, grid, gx, gy, lx, ly, false);
  generateMonsterHouse(rng, f, grid, gx, gy, 999);
}

// ── Piso completo ───────────────────────────────────────────────────────────

/** Tamaño de rejilla aleatorio (hasta 32 intentos; si no, 4×4). */
function randomGridSize(rng: RngState, layout: FloorLayout): [number, number] {
  let gx = 2, gy = 2;
  let attempts = 32;
  for (;;) {
    if (layout !== 'large0x8') {
      gx = randRange(rng, 2, 9);
      gy = randRange(rng, 2, 8);
    } else {
      gx = randRange(rng, 2, 5);
      gy = randRange(rng, 2, 4);
    }
    if (gx <= 6 && gy <= 4) break;
    if (--attempts === 0) {
      gx = 4;
      gy = 4;
      break;
    }
  }
  if (Math.floor(FLOOR_W / gx) < 8) gx = 1;
  if (Math.floor(FLOOR_H / gy) < 8) gy = 1;
  return [gx, gy];
}

/** Una distribución completa según floorProps.layout (sin entidades). */
function generateLayout(rng: RngState, f: FloorTiles, fp: FloorProperties): void {
  const [rgx, rgy] = randomGridSize(rng, fp.layout);
  f.size = 'large';
  switch (fp.layout) {
    case 'small':
    case 'medium':
      f.size = fp.layout;
      standardFloor(rng, f, 4, randInt(rng, 2) + 2, fp);
      break;
    case 'oneRoomMonsterHouse': oneRoomFloor(rng, f); break;
    case 'outerRing': outerRingFloor(rng, f, fp); break;
    case 'crossroads': crossroadsFloor(rng, f, fp); break;
    case 'twoRoomsMonsterHouse': twoRoomsFloor(rng, f); break;
    case 'line': lineFloor(rng, f, fp); break;
    case 'cross': crossOrBeetleFloor(rng, f, fp, false); break;
    case 'beetle': crossOrBeetleFloor(rng, f, fp, true); break;
    case 'outerRooms': outerRoomsFloor(rng, f, rgx, rgy, fp); break;
    default: standardFloor(rng, f, rgx, rgy, fp);
  }
  // ResetInnerBoundaryTileRows: las filas 1 y 30 vuelven a ser pared.
  for (let x = 0; x < FLOOR_W; x++) {
    for (const y of [1, FLOOR_H - 2]) {
      f.setWall(x, y);
      f.setRoom(x, y, HALL);
    }
  }
  // Borde exterior: pared irrompible.
  for (let x = 0; x < FLOOR_W; x++) for (let y = 0; y < FLOOR_H; y++) if (f.impassable(x, y)) f.setWall(x, y);
}

/** ¿Distribución aceptable? Al menos 2 salas y un mínimo de casillas de sala. */
function layoutIsGood(f: FloorTiles, minRoomTiles: number): boolean {
  const rooms = new Set<number>();
  let tiles = 0;
  for (let i = 0; i < f.open.length; i++)
    if (f.open[i] && f.room[i] >= 0) {
      tiles++;
      rooms.add(f.room[i]);
    }
  return rooms.size >= 2 && tiles >= minRoomTiles;
}

/** FinalizeJunctions: casilla de sala (o ancla) junto a un pasillo = cruce; las anclas pasan a pasillo. */
function finalizeJunctions(f: FloorTiles) {
  for (let x = 0; x < FLOOR_W; x++)
    for (let y = 0; y < FLOOR_H; y++) {
      if (!f.isOpen(x, y)) continue;
      const r = f.roomAt(x, y);
      if (r === HALL) {
        for (const [nx, ny] of [[x - 1, y], [x, y - 1], [x, y + 1], [x + 1, y]])
          if (nx >= 0 && ny >= 0 && nx < FLOOR_W && ny < FLOOR_H && f.roomAt(nx, ny) !== HALL) f.junction[ny * FLOOR_W + nx] = 1;
      } else if (r === ANCHOR) f.setRoom(x, y, HALL);
    }
}

/** ShuffleSpawnPositions (2n intercambios) y recorrido circular desde un índice al azar. */
function pickSpawns(rng: RngState, valid: Point[], count: number): Point[] {
  if (!valid.length || count <= 0) return [];
  for (let i = 0; i < valid.length * 2; i++) {
    const a = randInt(rng, valid.length), b = randInt(rng, valid.length);
    [valid[a], valid[b]] = [valid[b], valid[a]];
  }
  let k = randInt(rng, valid.length);
  const out: Point[] = [];
  for (let i = 0; i < count; i++) {
    out.push(valid[k]);
    k = (k + 1) % valid.length;
  }
  return out;
}

interface Spawns {
  stairs: Point | null;
  player: Point | null;
  items: Point[];
  traps: Point[];
  enemies: Point[];
}

/**
 * SpawnNonEnemies + SpawnEnemies + ResolveInvalidSpawns: escalera, objetos, trampas, jugador y
 * enemigos sobre casillas de sala abiertas que no sean cruce. Cantidades según la densidad del piso.
 */
function spawnEntities(rng: RngState, f: FloorTiles, fp: FloorProperties, gen: FloorGenRules): Spawns {
  const key = (p: Point) => p.y * FLOOR_W + p.x;
  const roomTiles: Point[] = [];
  for (let x = 0; x < FLOOR_W; x++)
    for (let y = 0; y < FLOOR_H; y++)
      if (f.isOpen(x, y) && f.roomAt(x, y) >= 0 && !f.junction[y * FLOOR_W + x]) roomTiles.push({ x, y });

  const stairsList = roomTiles.slice();
  const stairs = stairsList.length ? stairsList[randInt(rng, stairsList.length)] : null;

  // Objetos: densidad ±2 (mínimo 1) + extra; fuera de la Casa de Monstruos.
  // [PROPIO] tampoco sobre la escalera (el original no lo impide, pero aquí cogerlos y bajar chocan).
  const itemValid = roomTiles.filter((p) => !f.monsterHouse[key(p)] && !(stairs && key(p) === key(stairs)));
  let nItems = fp.itemDensity;
  if (nItems !== 0) nItems = Math.max(randRange(rng, nItems - 2, nItems + 2), 1);
  nItems += gen.extraItemSpawn;
  const items = pickSpawns(rng, itemValid, nItems);
  const itemKeys = new Set(items.map(key));

  // Trampas: entre densidad/2 y densidad-1; nunca sobre objetos ni la escalera (máximo 56).
  const trapValid = roomTiles.filter((p) => !itemKeys.has(key(p)));
  const nTraps = Math.min(randRange(rng, Math.floor(fp.trapDensity / 2), fp.trapDensity), 56);
  const traps = pickSpawns(rng, trapValid, nTraps).filter((p) => !(stairs && key(p) === key(stairs)));
  const trapKeys = new Set(traps.map(key));

  // Jugador: casilla de sala libre de objetos y trampas. [PROPIO] y no sobre la escalera.
  const playerValid = roomTiles.filter((p) => !itemKeys.has(key(p)) && !trapKeys.has(key(p)) && !(stairs && key(p) === key(stairs)));
  const player = playerValid.length ? playerValid[randInt(rng, playerValid.length)] : null;

  // Enemigos: entre densidad/2 y densidad-1 (mínimo 1) + extra; densidad negativa = exacta.
  let nEnemies = fp.enemyDensity > 0 ? Math.max(randRange(rng, Math.floor(fp.enemyDensity / 2), fp.enemyDensity), 1) : Math.abs(fp.enemyDensity);
  nEnemies += gen.extraEnemySpawn;
  const enemyValid = roomTiles.filter(
    (p) => !itemKeys.has(key(p)) && !(stairs && key(p) === key(stairs)) && !(player && key(p) === key(player)) &&
      // [PROPIO] separación mínima con el punto de aparición del equipo (el original solo excluye su casilla).
      !(player && Math.max(Math.abs(p.x - player.x), Math.abs(p.y - player.y)) <= gen.minEnemyDistance),
  );
  const enemies = pickSpawns(rng, enemyValid, nEnemies);
  // Dos enemigos nunca en la misma casilla (el recorrido circular puede repetir si faltan sitios).
  const seen = new Set<number>();
  return { stairs, player, items: dedupe(items), traps, enemies: enemies.filter((p) => !seen.has(key(p)) && seen.add(key(p))) };
}

function dedupe(list: Point[]): Point[] {
  const seen = new Set<string>();
  return list.filter((p) => {
    const k = `${p.x},${p.y}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * StairsAlwaysReachable: desde la escalera se llega a todas las casillas abiertas (8 direcciones, sin
 * cortar esquinas de pared).
 */
function stairsReachable(f: FloorTiles, s: Point): boolean {
  const seen = new Uint8Array(FLOOR_W * FLOOR_H);
  const queue: number[] = [s.y * FLOOR_W + s.x];
  seen[queue[0]] = 1;
  while (queue.length) {
    const k = queue.pop()!;
    const x = k % FLOOR_W, y = (k - x) / FLOOR_W;
    for (let d = 0; d < 8; d++) {
      const nx = x + DX[d], ny = y + DY[d];
      if (!f.isOpen(nx, ny)) continue;
      if (d % 2 === 1 && (!f.isOpen(x + DX[d], y) || !f.isOpen(x, y + DY[d]))) continue;
      const nk = ny * FLOOR_W + nx;
      if (seen[nk]) continue;
      seen[nk] = 1;
      queue.push(nk);
    }
  }
  for (let i = 0; i < f.open.length; i++) if (f.open[i] && !seen[i]) return false;
  return true;
}

/**
 * GenerateFloor: hasta 10 distribuciones por intento y 10 intentos de colocar las entidades con la
 * escalera alcanzable; si todo falla, una sola sala grande (Casa de Monstruos), como en el juego.
 */
export function generateFloor(rng: RngState, fp: FloorProperties, rules: FloorGenRules): GeneratedFloor {
  const f = new FloorTiles();
  for (let spawnAttempt = 0; spawnAttempt < 10; spawnAttempt++) {
    let layout: FloorLayout = fp.layout;
    let fallback = false;
    let good = false;
    for (let genAttempt = 0; genAttempt < 10; genAttempt++) {
      f.reset();
      generateLayout(rng, f, fp);
      if (layoutIsGood(f, rules.minRoomTiles)) {
        good = true;
        break;
      }
    }
    if (!good) {
      f.reset();
      oneRoomFloor(rng, f);
      layout = 'oneRoomMonsterHouse';
      fallback = true;
    }
    finalizeJunctions(f);
    const s = spawnEntities(rng, f, fp, rules);
    if (s.player && s.stairs && stairsReachable(f, s.stairs)) return finish(f, s, layout, fallback);
  }
  f.reset();
  oneRoomFloor(rng, f);
  finalizeJunctions(f);
  return finish(f, spawnEntities(rng, f, fp, rules), 'oneRoomMonsterHouse', true);
}

/** Convierte el estado interno al mapa del motor; las salas, por su rectángulo envolvente real. */
function finish(f: FloorTiles, s: Spawns, layout: FloorLayout, fallback: boolean): GeneratedFloor {
  const tiles: Tile[] = new Array(FLOOR_W * FLOOR_H);
  const roomAt: number[] = new Array(FLOOR_W * FLOOR_H);
  const bounds = new Map<number, Room>();
  const junctions: Point[] = [];
  // Renumeración compacta (0..n-1) en orden de aparición.
  const ids = new Map<number, number>();
  for (let y = 0; y < FLOOR_H; y++)
    for (let x = 0; x < FLOOR_W; x++) {
      const i = y * FLOOR_W + x;
      tiles[i] = f.open[i] ? Tile.Floor : Tile.Wall;
      const raw = f.open[i] ? f.room[i] : HALL;
      if (raw < 0) {
        roomAt[i] = -1;
        continue;
      }
      if (!ids.has(raw)) ids.set(raw, ids.size);
      const id = ids.get(raw)!;
      roomAt[i] = id;
      const b = bounds.get(id);
      if (!b) bounds.set(id, { id, x, y, w: 1, h: 1 });
      else {
        const x1 = Math.max(b.x + b.w, x + 1), y1 = Math.max(b.y + b.h, y + 1);
        b.x = Math.min(b.x, x);
        b.y = Math.min(b.y, y);
        b.w = x1 - b.x;
        b.h = y1 - b.y;
      }
      if (f.junction[i]) junctions.push({ x, y });
    }
  const rooms = [...bounds.values()].sort((a, b) => a.id - b.id);
  const map: DungeonMap = { width: FLOOR_W, height: FLOOR_H, tiles, roomAt, rooms, stairs: s.stairs ?? { x: 0, y: 0 } };
  const mh = f.monsterHouseRoom >= 0 && ids.has(f.monsterHouseRoom) ? ids.get(f.monsterHouseRoom)! : -1;
  return { map, player: s.player ?? s.stairs ?? { x: 2, y: 2 }, items: s.items, traps: s.traps, enemies: s.enemies, layout, fallback, monsterHouse: mh, junctions };
}

/** Punto aleatorio de la habitación, evitando los bordes si es posible. */
export function randomInteriorPoint(rng: RngState, r: Room): Point {
  const x0 = r.w > 2 ? r.x + 1 : r.x, x1 = r.w > 2 ? r.x + r.w - 2 : r.x + r.w - 1;
  const y0 = r.h > 2 ? r.y + 1 : r.y, y1 = r.h > 2 ? r.y + r.h - 2 : r.y + r.h - 1;
  return { x: x0 + randInt(rng, x1 - x0 + 1), y: y0 + randInt(rng, y1 - y0 + 1) };
}

/** Todas las casillas transitables forman una única región conexa (vecindad ortogonal). */
export function validateConnectivity(map: DungeonMap): boolean {
  let first = -1, total = 0;
  for (let i = 0; i < map.tiles.length; i++) if (map.tiles[i] === Tile.Floor) (total++, first < 0 && (first = i));
  if (first < 0) return false;
  const reached = reachableFrom(map, { x: first % map.width, y: Math.floor(first / map.width) });
  return reached.size === total && reached.has(map.stairs.y * map.width + map.stairs.x);
}

export function reachableFrom(map: DungeonMap, start: Point): Set<number> {
  const seen = new Set<number>([start.y * map.width + start.x]);
  const queue: Point[] = [start];
  while (queue.length) {
    const p = queue.shift()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = { x: p.x + dx, y: p.y + dy };
      const k = q.y * map.width + q.x;
      if (!seen.has(k) && isWalkable(map, q)) {
        seen.add(k);
        queue.push(q);
      }
    }
  }
  return seen;
}
