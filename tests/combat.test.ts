import { describe, expect, it } from 'vitest';
import { MOVES } from '../src/shared/data/moves';
import { Dir } from '../src/shared/core/geometry';
import { baseDamage, computeDamage, hitChance, rollHit } from '../src/shared/engine/combat';
import { combinedMatchup } from '../src/shared/data/types';
import { getMove } from '../src/shared/data/moves';
import { SKY_RULES } from '../src/shared/data/rules';
import { resolveTurn } from '../src/shared/engine/turn';
import { expForLevel, statsAtLevel } from '../src/shared/engine/stats';
import { getSpecies } from '../src/shared/data/species';
import { ROOM_7x5, addMon, blankState } from './helpers';

describe('fórmula de daño', () => {
  it('con A = D a nivel 1 el término logarítmico casi anula el −311', () => {
    // 50·ln(510) ≈ 311,7
    expect(baseDamage(10, 10, 0, 1)).toBeCloseTo((10 * 39168) / 65536 - 5 + 50 * Math.log(510) - 311, 6);
  });

  it('acota el argumento del logaritmo a [1, 4095]', () => {
    const huge = baseDamage(100000, 0, 0, 100);
    expect(huge).toBeCloseTo((100000 * 39168) / 65536 + 50 * Math.log(4095) - 311, 4);
  });

  it('el daño aleatorio queda en el rango [57344, 73727]/65536 del valor sin aleatoriedad', () => {
    const s = blankState(ROOM_7x5);
    const a = addMon(s, 'charmander', 2, 2, 'team', 10);
    const d = addMon(s, 'wurmple', 3, 2, 'enemy', 10);
    s.rules = { ...SKY_RULES, baseCritChance: 0 };
    const move = { ...getMove('scratch'), critChance: 0 };
    const results = new Set<number>();
    for (let i = 0; i < 300; i++) results.add(computeDamage(s, a, d, move, s.rng).damage);
    const min = Math.min(...results), max = Math.max(...results);
    expect(max).toBeGreaterThan(min);
    expect(max / Math.max(1, min)).toBeLessThan(1.4);
  });

  it('los enemigos hacen menos daño (divisor 340/256)', () => {
    const s = blankState(ROOM_7x5);
    s.rules = { ...SKY_RULES, baseCritChance: 0, damageRandomSpan: 1 };
    const a1 = addMon(s, 'pidgey', 2, 2, 'team', 20);
    const a2 = addMon(s, 'pidgey', 2, 3, 'enemy', 20);
    const d = addMon(s, 'meowth', 3, 2, 'team', 20);
    const move = { ...getMove('tackle'), critChance: 0 };
    const team = computeDamage(s, a1, d, move, s.rng).damage;
    const enemy = computeDamage(s, a2, d, move, s.rng).damage;
    expect(enemy).toBeLessThan(team);
  });

  it('aplica efectividad de tipos de EoS (1,4 / ≈0,71 / 0,5 sin inmunidades reales)', () => {
    expect(combinedMatchup('water', ['fire'])).toBe('superEffective');
    expect(combinedMatchup('fire', ['water'])).toBe('notVeryEffective');
    expect(combinedMatchup('normal', ['ghost'])).toBe('immune');
    expect(SKY_RULES.matchupMultiplier.immune).toBe(0.5);
    expect(combinedMatchup('fire', ['grass', 'poison'])).toBe('superEffective');
    expect(combinedMatchup('grass', ['water', 'ground'])).toBe('superEffective'); // SE+SE = SE
    expect(combinedMatchup('fire', ['grass', 'water'])).toBe('neutral'); // SE+NVE
  });
});

describe('precisión (dos tiradas, como MoveHitCheck)', () => {
  it('acierta solo si pasan las dos tiradas; > 100 no falla', () => {
    const s = blankState(ROOM_7x5);
    const a = addMon(s, 'pikachu', 1, 1, 'team', 5, 'A'), d = addMon(s, 'wurmple', 2, 1, 'enemy', 5);
    const tackle = getMove('tackle');
    const sure = { ...tackle, accuracy: 125, accuracy2: 125 }, never = { ...tackle, accuracy: 125, accuracy2: 0 };
    for (let i = 0; i < 50; i++) {
      expect(rollHit(a, d, sure, s.rng)).toBe(true);
      expect(rollHit(a, d, never, s.rng)).toBe(false);
    }
    expect(hitChance({ ...tackle, accuracy: 100, accuracy2: 95 })).toBeCloseTo(0.95);
    expect(hitChance({ ...tackle, accuracy: 87, accuracy2: 84 })).toBeCloseTo(0.7308);
    // Con ~73 %, en 2000 tiradas sale entre el 68 y el 78 %.
    const m = { ...tackle, accuracy: 87, accuracy2: 84 };
    let n = 0;
    for (let i = 0; i < 2000; i++) if (rollHit(a, d, m, s.rng)) n++;
    expect(n / 2000).toBeGreaterThan(0.68);
    expect(n / 2000).toBeLessThan(0.78);
  });
});

describe('ataques en el mapa', () => {
  it('el ataque normal golpea al enemigo de enfrente y consume turno', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'charmander', 2, 2, 'team', 5, 'A');
    const e = addMon(s, 'wurmple', 3, 2, 'enemy');
    e.moves = [];
    const hp0 = e.hp;
    let hit = false;
    for (let i = 0; i < 10 && !hit; i++) {
      resolveTurn(s, { [p.id]: { type: 'attack', dir: Dir.E } });
      hit = e.hp < hp0 || e.fainted;
    }
    expect(hit).toBe(true);
  });

  it('el ataque no atraviesa esquinas en diagonal', () => {
    const s = blankState(['#####', '#.#.#', '#...#', '#####']);
    const p = addMon(s, 'charmander', 2, 2, 'team', 30, 'A');
    const e = addMon(s, 'wurmple', 3, 1, 'enemy');
    e.moves = [];
    s.rules.noCornerCutting = true;
    const hp0 = e.hp;
    resolveTurn(s, { [p.id]: { type: 'attack', dir: Dir.NE } });
    expect(e.hp).toBe(hp0);
  });

  it('usar un movimiento consume PP y sin PP no se puede usar', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'charmander', 2, 2, 'team', 1, 'A');
    // Su primer movimiento (con la ROM, Charmander a nivel 1 no conoce Ascuas todavía).
    const slot = p.moves.findIndex((m) => m.pp > 0);
    const pp0 = p.moves[slot].pp;
    resolveTurn(s, { [p.id]: { type: 'useMove', slot, dir: Dir.E } });
    expect(p.moves[slot].pp).toBe(pp0 - 1);
    p.moves[slot].pp = 0;
    const r = resolveTurn(s, { [p.id]: { type: 'useMove', slot, dir: Dir.E } });
    expect(r.advanced).toBe(false);
    expect(r.rejected?.reason).toMatch(/PP/);
  });

  it('un movimiento en línea alcanza a un enemigo lejano', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'squirtle', 1, 3, 'team', 10, 'A');
    const e = addMon(s, 'charmander', 7, 3, 'enemy', 1);
    e.moves = [];
    // Un movimiento de daño que llegue a 6 casillas (con la ROM, Hoja Afilada: 10 en línea).
    const line = Object.values(MOVES).find((m) => m.range.kind === 'line' && m.range.distance >= 6 && m.power > 0 && m.targets !== 'self')!;
    p.moves = [{ id: line.id, pp: 99, maxPp: 99 }];
    const slot = 0;
    const hp0 = e.hp;
    let hit = false;
    for (let i = 0; i < 6 && !hit; i++) {
      p.pos = { x: 1, y: 3 };
      e.pos = { x: 7, y: 3 };
      resolveTurn(s, { [p.id]: { type: 'useMove', slot, dir: Dir.E } });
      hit = e.hp < hp0 || e.fainted;
    }
    expect(hit).toBe(true);
  });

  it('derrotar a un enemigo lo elimina y concede experiencia a todo el equipo', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'charmander', 2, 2, 'team', 1, 'A');
    const q = addMon(s, 'squirtle', 2, 4, 'team', 1, 'B');
    const e = addMon(s, 'wurmple', 3, 2, 'enemy');
    e.moves = [];
    e.hp = 1;
    for (let i = 0; i < 10 && s.entities.includes(e); i++) resolveTurn(s, { [p.id]: { type: 'attack', dir: Dir.E } });
    expect(s.entities.includes(e)).toBe(false);
    expect(s.stats.enemiesDefeated).toBe(1);
    expect(p.exp).toBeGreaterThan(0);
    expect(q.exp).toBe(p.exp);
  });

  it('subir de nivel aumenta estadísticas y HP máximo', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'charmander', 2, 2, 'team', 1, 'A');
    const e = addMon(s, 'wurmple', 3, 2, 'enemy', 30);
    e.moves = [];
    e.hp = 1;
    const maxHp0 = p.maxHp;
    for (let i = 0; i < 10 && s.entities.includes(e); i++) resolveTurn(s, { [p.id]: { type: 'attack', dir: Dir.E } });
    expect(p.level).toBeGreaterThan(1);
    expect(p.maxHp).toBeGreaterThan(maxHp0);
    const sp = getSpecies('charmander');
    expect(p.stats).toEqual(statsAtLevel(sp, p.level));
    expect(p.exp).toBeGreaterThanOrEqual(expForLevel(sp, p.level));
  });
});
