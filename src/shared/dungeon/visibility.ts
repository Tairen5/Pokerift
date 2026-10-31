/**
 * Visibilidad al estilo PMD: dentro de una habitación se ve la sala entera
 * (más su contorno); en un pasillo solo el entorno inmediato.
 */
import type { Point } from '../core/geometry';
import { type DungeonMap, roomIdAt } from './map';

export const CORRIDOR_VIEW_RADIUS = 2;

export function visibleTiles(map: DungeonMap, viewers: Point[]): Set<number> {
  const out = new Set<number>();
  const add = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < map.width && y < map.height) out.add(y * map.width + x);
  };
  for (const v of viewers) {
    if (v.x < 0) continue;
    const rid = roomIdAt(map, v);
    if (rid >= 0) {
      const r = map.rooms.find((room) => room.id === rid)!;
      for (let y = r.y - 1; y <= r.y + r.h; y++) for (let x = r.x - 1; x <= r.x + r.w; x++) add(x, y);
    }
    for (let dy = -CORRIDOR_VIEW_RADIUS; dy <= CORRIDOR_VIEW_RADIUS; dy++)
      for (let dx = -CORRIDOR_VIEW_RADIUS; dx <= CORRIDOR_VIEW_RADIUS; dx++) add(v.x + dx, v.y + dy);
  }
  return out;
}
