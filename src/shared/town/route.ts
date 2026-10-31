/**
 * Rutas a pie por las zonas exteriores (pruebas; en el futuro, NPC): búsqueda en anchura
 * sobre los centros de las celdas de colisión, con tramos que el servidor
 * aceptaría (canTraverse y ≤ 30 px).
 */
import type { Point } from '../core/geometry';
import { type Rect, type ZoneDef, canStand, canTraverse, inRect } from './zone';

/** Pasos desde "from" hasta un punto dentro de "rect"; null si no hay camino. */
export function routeTo(zone: ZoneDef, from: Point, rect: Rect): Point[] | null {
  const cs = zone.cellSize, GW = Math.ceil(zone.width / cs), GH = Math.ceil(zone.height / cs);
  const center = (i: number): Point => ({ x: (i % GW) * cs + cs / 2, y: Math.floor(i / GW) * cs + cs / 2 });
  /** Un punto dentro de la salida al que se llega en línea recta desde c. */
  const finish = (c: Point): Point | null => {
    const q = { x: Math.min(Math.max(c.x, rect.x + 1), rect.x + rect.w - 1), y: Math.min(Math.max(c.y, rect.y + 1), rect.y + rect.h - 1) };
    for (const p of [q, c])
      if (inRect(rect, p.x, p.y) && canStand(zone, p.x, p.y) && Math.hypot(p.x - c.x, p.y - c.y) <= 30 && canTraverse(zone, c, p)) return p;
    return null;
  };
  const prev = new Map<number, number>();
  const queue: number[] = [];
  for (let i = 0; i < GW * GH; i++) {
    const c = center(i);
    if (canStand(zone, c.x, c.y) && Math.hypot(c.x - from.x, c.y - from.y) <= 12 && canTraverse(zone, from, c)) (prev.set(i, -1), queue.push(i));
  }
  while (queue.length) {
    const i = queue.shift()!;
    const c = center(i);
    const end = finish(c);
    if (end) {
      const path = [end];
      for (let k = i; k !== -1; k = prev.get(k)!) path.unshift(center(k));
      return path;
    }
    const gx = i % GW, gy = Math.floor(i / GW);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = gx + dx, ny = gy + dy, k = ny * GW + nx;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || prev.has(k)) continue;
      const n = center(k);
      if (!canStand(zone, n.x, n.y) || !canTraverse(zone, c, n)) continue;
      prev.set(k, i);
      queue.push(k);
    }
  }
  return null;
}
