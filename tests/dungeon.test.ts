import { describe, expect, it } from 'vitest';
import { createRng } from '../src/shared/core/rng';
import { FLOOR_LAYOUTS, type FloorProperties, bandForFloor, getDungeon } from '../src/shared/data/dungeons';
import { BLUE_RULES, SKY_RULES } from '../src/shared/data/rules';
import { FLOOR_H, FLOOR_W, type GeneratedFloor, generateFloor, reachableFrom, validateConnectivity } from '../src/shared/dungeon/generator';
import { type DungeonMap, isWalkable, roomIdAt } from '../src/shared/dungeon/map';
import { createExpedition } from '../src/shared/engine/expedition';
import { buildFloor, floorSeed } from '../src/shared/engine/floor';

const expeditionFloor = (floor: number) => bandForFloor(getDungeon('expedition'), floor).floor;
/** Piso «normal» de EoS para probar las demás distribuciones. */
const BASE: FloorProperties = {
  layout: 'large', roomDensity: 6, floorConnectivity: 15, enemyDensity: 6, allowDeadEnds: false,
  roomImperfections: true, itemDensity: 4, trapDensity: 6, extraHallways: 10,
};
const key = (p: { x: number; y: number }) => `${p.x},${p.y}`;

/** Comprueba las garantías del generador; devuelve la lista de fallos (vacía si todo va bien). */
function floorProblems(g: GeneratedFloor): string[] {
  const m: DungeonMap = g.map;
  const bad: string[] = [];
  const need = (ok: boolean, what: string) => ok || bad.push(what);
  need(m.width === FLOOR_W && m.height === FLOOR_H, 'tamaño');
  // Conexo y con la escalera dentro: ninguna sala ni pasillo aislado.
  need(validateConnectivity(m), 'conexo');
  need(m.rooms.length >= (g.fallback ? 1 : 2), 'salas');
  // Borde exterior y filas 1 y 30 siempre pared (ResetInnerBoundaryTileRows).
  for (let x = 0; x < m.width; x++)
    for (const y of [0, 1, m.height - 2, m.height - 1]) need(!isWalkable(m, { x, y }), `borde ${x},${y}`);
  for (let y = 0; y < m.height; y++) need(!isWalkable(m, { x: 0, y }) && !isWalkable(m, { x: m.width - 1, y }), `borde lateral ${y}`);
  // Escalera y jugador en una sala, nunca en la casilla de entrada de un pasillo.
  const junction = new Set(g.junctions.map(key));
  for (const p of [m.stairs, g.player]) need(isWalkable(m, p) && roomIdAt(m, p) >= 0 && !junction.has(key(p)), `escalera/jugador ${key(p)}`);
  need(key(g.player) !== key(m.stairs), 'jugador sobre la escalera');
  // Objetos, trampas y enemigos en salas, sin solaparse (un enemigo sí puede empezar sobre una trampa,
  // como en el original).
  const items = new Set(g.items.map(key)), traps = new Set(g.traps.map(key)), enemies = new Set(g.enemies.map(key));
  need(items.size === g.items.length && traps.size === g.traps.length && enemies.size === g.enemies.length, 'repetidos');
  for (const p of [...g.items, ...g.traps, ...g.enemies]) need(isWalkable(m, p) && roomIdAt(m, p) >= 0, `fuera de sala ${key(p)}`);
  for (const p of g.items) need(!traps.has(key(p)) && !enemies.has(key(p)), `objeto solapado ${key(p)}`);
  for (const p of [...g.items, ...g.traps, ...g.enemies]) need(key(p) !== key(m.stairs) && key(p) !== key(g.player), `sobre escalera/jugador ${key(p)}`);
  for (const e of g.enemies)
    need(Math.max(Math.abs(e.x - g.player.x), Math.abs(e.y - g.player.y)) > SKY_RULES.floorGen.minEnemyDistance, `enemigo cerca ${key(e)}`);
  return bad;
}
const checkFloor = (g: GeneratedFloor) => expect(floorProblems(g)).toEqual([]);

describe('generación de mazmorras', () => {
  it('expedición: 100 pisos válidos por cada uno de sus pisos (datos de la ROM)', () => {
    const d = getDungeon('expedition');
    for (let floor = 1; floor <= d.floors; floor++)
      for (let seed = 1; seed <= 100; seed++) checkFloor(generateFloor(createRng(seed * 7 + floor), expeditionFloor(floor), SKY_RULES.floorGen));
  }, 30000);

  it('primer piso (Cueva Bajamar P1, distribución pequeña): solo la mitad izquierda y Casillas Maravilla', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const g = generateFloor(createRng(seed), expeditionFloor(1), SKY_RULES.floorGen);
      checkFloor(g);
        // Distribución pequeña: solo las dos columnas izquierdas de la rejilla (x < 28) tienen salas.
      // Objetos: densidad 1 → 1±2 (mínimo 1) + 1; trampas: densidad 3 → 1–2.
      expect([g.map.rooms.every((r) => r.x + r.w <= 28), g.items.length >= 1 && g.items.length <= 3, g.traps.length <= 2]).toEqual([true, true, true]);
    }
    expect(bandForFloor(getDungeon('expedition'), 1).traps).toEqual([{ trap: 'wonderTile', weight: 10000 }]);
  }, 30000);

  it('todas las distribuciones del juego generan pisos válidos', () => {
    for (const layout of FLOOR_LAYOUTS)
      for (let seed = 1; seed <= 200; seed++) checkFloor(generateFloor(createRng(seed), { ...BASE, layout }, SKY_RULES.floorGen));
  }, 30000);

  it('casi nunca hace falta la sala de emergencia', () => {
    let fallbacks = 0;
    for (let seed = 1; seed <= 1000; seed++) if (generateFloor(createRng(seed), BASE, SKY_RULES.floorGen).fallback) fallbacks++;
    expect(fallbacks).toBeLessThan(10);
  });

  it('los pisos varían: tamaño de rejilla, número de salas y forma', () => {
    const shapes = new Set<string>();
    const roomCounts = new Set<number>();
    for (let seed = 1; seed <= 200; seed++) {
      const g = generateFloor(createRng(seed), BASE, SKY_RULES.floorGen);
      shapes.add(g.map.tiles.join(''));
      roomCounts.add(g.map.rooms.length);
    }
    expect(shapes.size).toBe(200);
    expect(roomCounts.size).toBeGreaterThanOrEqual(4);
  });

  it('cantidades según la densidad: EoS suma uno a objetos y enemigos, RT no', () => {
    const fp = expeditionFloor(1);
    for (let seed = 1; seed <= 300; seed++) {
      const sky = generateFloor(createRng(seed), fp, SKY_RULES.floorGen);
      const blue = generateFloor(createRng(seed), fp, BLUE_RULES.floorGen);
      // Enemigos (densidad 4): RT 2–3, EoS 3–4 (menos si no caben por la distancia mínima).
      expect(blue.enemies.length).toBeLessThanOrEqual(3);
      expect(sky.enemies.length).toBeLessThanOrEqual(4);
      expect(blue.items.length).toBeLessThanOrEqual(2);
    }
  });

  it('es reproducible con la misma semilla', () => {
    const a = generateFloor(createRng(42), BASE, SKY_RULES.floorGen);
    const b = generateFloor(createRng(42), BASE, SKY_RULES.floorGen);
    expect(a).toEqual(b);
    const c = generateFloor(createRng(43), BASE, SKY_RULES.floorGen);
    expect(c.map.tiles).not.toEqual(a.map.tiles);
  });

  it('la semilla del piso depende solo de la expedición y el número de piso', () => {
    expect(floorSeed(123, 'expedition', 2)).toBe(floorSeed(123, 'expedition', 2));
    expect(floorSeed(123, 'expedition', 2)).not.toBe(floorSeed(123, 'expedition', 3));
    expect(floorSeed(123, 'expedition', 2)).not.toBe(floorSeed(124, 'expedition', 2));
    // Mismo piso aunque la partida haya consumido números aleatorios distintos antes.
    const party = [{ playerId: 'A', name: 'A', species: 'pikachu' }];
    const a = createExpedition({ dungeonId: 'expedition', seed: 77, party }).state;
    const b = createExpedition({ dungeonId: 'expedition', seed: 77, party }).state;
    for (let i = 0; i < 50; i++) b.rng.s = (b.rng.s * 1664525 + 1013904223) >>> 0;
    a.floor = b.floor = 2;
    buildFloor(a);
    buildFloor(b);
    expect(b.map).toEqual(a.map);
    expect(b.items.map((i) => i.pos)).toEqual(a.items.map((i) => i.pos));
  });

  it('coloca equipo, enemigos y objetos en casillas transitables y la escalera es alcanzable desde el equipo', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { state } = createExpedition({ dungeonId: 'expedition', seed, party: [{ playerId: 'A', name: 'A', species: 'pikachu' }] });
      const hero = state.entities[0];
      const reach = reachableFrom(state.map, hero.pos);
      expect(reach.has(state.map.stairs.y * state.map.width + state.map.stairs.x)).toBe(true);
      for (const e of state.entities) expect(isWalkable(state.map, e.pos)).toBe(true);
      for (const i of state.items) expect(isWalkable(state.map, i.pos)).toBe(true);
      const positions = state.entities.map((e) => key(e.pos));
      expect(new Set(positions).size).toBe(positions.length);
      expect(state.entities.filter((e) => e.team === 'enemy').length).toBeGreaterThan(0);
    }
  });
});
