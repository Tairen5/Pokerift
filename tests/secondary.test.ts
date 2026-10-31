/**
 * Efectos secundarios y estados con los datos de EoS (descripciones de los
 * movimientos en el juego y constantes de overlay10 leídas de la ROM).
 */
import { describe, expect, it } from 'vitest';
import { getMove } from '../src/shared/data/moves';
import { STATUSES } from '../src/shared/data/statuses';
import { computeDamage, rollHit } from '../src/shared/engine/combat';
import { executeMove } from '../src/shared/engine/effects';
import { EventLog } from '../src/shared/engine/events';
import { actionGate } from '../src/shared/engine/status';
import { Dir } from '../src/shared/core/geometry';
import { ROOM_7x5, addMon, blankState } from './helpers';

describe('efectos secundarios de EoS', () => {
  it('probabilidades de la ROM: Picotazo Veneno 18 %, Mordisco amedrenta 20 %', () => {
    expect(getMove('poisonSting').effects).toEqual([{ kind: 'status', status: 'poison', chance: 18, on: 'target' }]);
    expect(getMove('bite').effects).toEqual([{ kind: 'status', status: 'cringe', chance: 20, on: 'target' }]);
    expect(getMove('ember').effects?.[0]).toMatchObject({ status: 'burn', chance: 10 });
    expect(getMove('thunderShock').effects?.[0]).toMatchObject({ status: 'paralysis', chance: 10 });
    expect(getMove('confusion').effects?.[0]).toMatchObject({ status: 'confusion', chance: 10 });
  });

  it('duraciones de la ROM (rango [a, b) guardado como [a, b − 1])', () => {
    expect(STATUSES.sleep.duration).toEqual([3, 6]);
    expect(STATUSES.confusion.duration).toEqual([6, 11]);
    expect(STATUSES.cringe.duration).toEqual([1, 1]);
    expect(STATUSES.whiffer.duration).toEqual([1, 3]);
    expect(STATUSES.slowed.duration).toEqual([6, 7]);
  });

  it('amedrentado pierde su acción', () => {
    const s = blankState(ROOM_7x5);
    const e = addMon(s, 'pidgey', 2, 2, 'enemy', 5);
    e.statuses.push({ id: 'cringe', turnsLeft: 1, counter: 0 });
    expect(actionGate(s, e, new EventLog())).toBe('skip');
  });

  it('con Despiste (Pantalla de Humo) sus movimientos fallan', () => {
    const s = blankState(ROOM_7x5);
    const a = addMon(s, 'pikachu', 1, 1, 'team', 5, 'A'), d = addMon(s, 'wurmple', 2, 1, 'enemy', 5);
    a.statuses.push({ id: 'whiffer', turnsLeft: 2, counter: 0 });
    const sure = { ...getMove('tackle'), accuracy: 125, accuracy2: 125 };
    for (let i = 0; i < 20; i++) expect(rollHit(a, d, sure, s.rng)).toBe(false);
    expect(getMove('smokescreen').effects?.[0]).toMatchObject({ kind: 'status', status: 'whiffer' });
  });

  it('Presa golpea de 2 a 5 veces', () => {
    const counts = new Set<number>();
    const s = blankState(ROOM_7x5);
    const a = addMon(s, 'exeggcute', 1, 1, 'enemy', 30), d = addMon(s, 'squirtle', 2, 1, 'team', 99, 'A');
    for (let k = 0; k < 60; k++) {
      d.hp = d.maxHp = 9999;
      const move = { ...getMove('barrage'), accuracy: 125, accuracy2: 125, range: { kind: 'front' as const } };
      const log = new EventLog();
      executeMove(s, a, move, Dir.E, log);
      counts.add(log.events.filter((ev) => ev.t === 'damage').length);
    }
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...counts)).toBeLessThanOrEqual(5);
    expect(counts.size).toBeGreaterThan(1);
  });

  it('Tornado hace el doble a un Volador', () => {
    const s = blankState(ROOM_7x5);
    const a = addMon(s, 'pidgey', 1, 1, 'enemy', 10), flying = addMon(s, 'pidgey', 2, 1, 'team', 10, 'A'), other = addMon(s, 'squirtle', 3, 1, 'team', 10, 'B'); // Agua: neutro ante Volador
    const gust = getMove('gust');
    const avg = (t: typeof flying) => {
      let sum = 0;
      for (let i = 0; i < 200; i++) sum += computeDamage(s, a, t, { ...gust, critChance: 0 }, s.rng).damage;
      return sum / 200;
    };
    // Mismas defensas para comparar: se copia la del objetivo no volador.
    flying.stats = { ...other.stats };
    expect(avg(flying) / avg(other)).toBeGreaterThan(1.6);
  });
});

describe('velocidad (Disparo Demora)', () => {
  it('con la velocidad reducida actúa uno de cada dos turnos', () => {
    const s = blankState(ROOM_7x5);
    const e = addMon(s, 'pidgey', 2, 2, 'enemy', 5);
    e.statuses.push({ id: 'slowed', turnsLeft: 6, counter: 0 });
    const gates: string[] = [];
    for (let t = 0; t < 4; t++) {
      gates.push(actionGate(s, e, new EventLog()));
      e.statuses[0].counter++;
    }
    expect(gates).toEqual(['act', 'skip', 'act', 'skip']);
  });
});
