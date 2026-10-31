export interface Point {
  x: number;
  y: number;
}

/**
 * Las 8 direcciones de Mundo Misterioso. El orden coincide con el de las filas
 * de los spritesheets de PMDCollab (Abajo, AbajoDcha, Dcha, ArribaDcha,
 * Arriba, ArribaIzq, Izq, AbajoIzq), lo que simplifica el mapeo de animaciones.
 */
export enum Dir {
  S = 0,
  SE = 1,
  E = 2,
  NE = 3,
  N = 4,
  NW = 5,
  W = 6,
  SW = 7,
}

export const ALL_DIRS: readonly Dir[] = [Dir.S, Dir.SE, Dir.E, Dir.NE, Dir.N, Dir.NW, Dir.W, Dir.SW];

export const DIR_DELTA: Record<Dir, Point> = {
  [Dir.S]: { x: 0, y: 1 },
  [Dir.SE]: { x: 1, y: 1 },
  [Dir.E]: { x: 1, y: 0 },
  [Dir.NE]: { x: 1, y: -1 },
  [Dir.N]: { x: 0, y: -1 },
  [Dir.NW]: { x: -1, y: -1 },
  [Dir.W]: { x: -1, y: 0 },
  [Dir.SW]: { x: -1, y: 1 },
};

export function isDiagonal(d: Dir): boolean {
  return d % 2 === 1;
}

export function step(p: Point, d: Dir, n = 1): Point {
  const dd = DIR_DELTA[d];
  return { x: p.x + dd.x * n, y: p.y + dd.y * n };
}

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Distancia de Chebyshev: la métrica natural con movimiento en 8 direcciones. */
export function chebyshev(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function dirTowards(from: Point, to: Point): Dir | null {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  if (dx === 0 && dy === 0) return null;
  return deltaToDir(dx, dy)!;
}

export function deltaToDir(dx: number, dy: number): Dir | null {
  for (const d of ALL_DIRS) {
    if (DIR_DELTA[d].x === dx && DIR_DELTA[d].y === dy) return d;
  }
  return null;
}

export function oppositeDir(d: Dir): Dir {
  return ((d + 4) % 8) as Dir;
}

export function key(p: Point): string {
  return `${p.x},${p.y}`;
}
