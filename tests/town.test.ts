import { describe, expect, it } from 'vitest';
import { RETURN_PLACE, START_PLACE, ZONES, canStand, entryPoint, exitAt, getZone, moveActor } from '../src/shared/town/zone';
import { DUNGEONS } from '../src/shared/data/dungeons';
import { routeTo } from '../src/shared/town/route';

describe('zonas exteriores', () => {
  for (const zone of Object.values(ZONES)) {
    describe(zone.id, () => {
      it('la rejilla de colisión cubre todo el mapa', () => {
        expect(zone.collision.length).toBe(Math.ceil(zone.height / zone.cellSize));
        for (const row of zone.collision) expect(row.length).toBe(Math.ceil(zone.width / zone.cellSize));
      });

      it('las llegadas son transitables, fuera de las salidas, y caben 4 jugadores sin solaparse', () => {
        for (const [name, e] of Object.entries(zone.entries)) {
          expect(canStand(zone, e.x, e.y), `${zone.id}.${name}`).toBe(true);
          expect(exitAt(zone, e.x, e.y, 4), `${zone.id}.${name} pisa una salida`).toBeUndefined();
          const pts = [0, 1, 2, 3].map((i) => entryPoint(zone, name, i));
          expect(new Set(pts.map((p) => `${p.x},${p.y}`)).size, `${zone.id}.${name}`).toBe(4);
        }
      });

      it('todas las salidas son alcanzables a pie desde cada llegada', () => {
        for (const [name, e] of Object.entries(zone.entries))
          for (const exit of zone.exits) expect(routeTo(zone, e, exit.rect), `${name} → ${exit.id}`).not.toBeNull();
      });

      it('las salidas activas apuntan a destinos existentes', () => {
        for (const e of zone.exits.filter((x) => x.enabled)) {
          expect(e.target).toBeDefined();
          if (e.target!.kind === 'dungeon') expect(DUNGEONS[e.target!.dungeonId]).toBeDefined();
          if (e.target!.kind === 'zone') expect(ZONES[e.target!.zoneId]?.entries[e.target!.entry], `${zone.id}.${e.id}`).toBeDefined();
        }
      });
    });
  }

  it('desde casa se llega a todas las zonas y a las mazmorras', () => {
    const seen = new Set<string>([START_PLACE.zoneId]);
    const queue: string[] = [START_PLACE.zoneId];
    let dungeon = false;
    while (queue.length) {
      for (const e of getZone(queue.shift()!).exits.filter((x) => x.enabled)) {
        if (e.target?.kind === 'dungeon') dungeon = true;
        if (e.target?.kind === 'zone' && !seen.has(e.target.zoneId)) (seen.add(e.target.zoneId), queue.push(e.target.zoneId));
      }
    }
    expect([...seen].sort()).toEqual(Object.keys(ZONES).sort());
    expect(dungeon).toBe(true);
    expect(getZone(RETURN_PLACE.zoneId).entries[RETURN_PLACE.entry]).toBeDefined();
  });

  it('el movimiento choca con los obstáculos y se desliza en diagonal', () => {
    const z = getZone('town');
    let p: { x: number; y: number } = entryPoint(z, 'fromBluff');
    // Caminar mucho hacia el norte termina parado en algún obstáculo o borde, nunca dentro.
    for (let i = 0; i < 2000; i++) {
      p = moveActor(z, p, 0, -1);
      expect(canStand(z, p.x, p.y)).toBe(true);
    }
    // Un movimiento nulo no cambia la posición.
    expect(moveActor(z, { x: p.x, y: p.y }, 0, 0)).toEqual({ x: p.x, y: p.y });
    // Diagonal contra un borde: avanza por el eje libre (o se queda), nunca atraviesa.
    const slid = moveActor(z, { x: p.x, y: p.y }, 1, -1);
    expect(slid.y).toBe(p.y);
  });

  it('detecta las salidas al pisarlas', () => {
    const z = getZone('crossroads');
    const east = z.exits.find((e) => e.id === 'east')!;
    expect(exitAt(z, east.rect.x + 2, east.rect.y + east.rect.h / 2)?.id).toBe('east');
    expect(exitAt(z, 216, 190)).toBeUndefined();
  });
});
