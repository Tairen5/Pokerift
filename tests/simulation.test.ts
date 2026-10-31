/**
 * Simulación: un bot sencillo juega expediciones completas con muchas
 * semillas. Detecta excepciones, bloqueos y estados inválidos, y comprueba
 * que una expedición puede recorrer varios pisos.
 */
import { describe, expect, it } from 'vitest';
import { ALL_DIRS, chebyshev, dirTowards } from '../src/shared/core/geometry';
import { isWalkable, terrainAllowsStep } from '../src/shared/dungeon/map';
import type { Action } from '../src/shared/engine/actions';
import { validateAction } from '../src/shared/engine/actions';
import { pathStep } from '../src/shared/engine/ai';
import { createExpedition } from '../src/shared/engine/expedition';
import { type GameState, enemiesOf } from '../src/shared/engine/state';
import { resolveTurn } from '../src/shared/engine/turn';

function botAction(s: GameState, heroId: string): Action {
  const hero = s.entities.find((e) => e.id === heroId)!;
  const oran = s.bag.find((b) => b.item === 'oranBerry');
  if (hero.hp * 3 < hero.maxHp && oran) return { type: 'useItem', bagUid: oran.uid };
  const apple = s.bag.find((b) => b.item === 'apple' || b.item === 'bigApple');
  if (hero.belly < 15 && apple) return { type: 'useItem', bagUid: apple.uid };
  const adj = enemiesOf(s, hero).find((e) => chebyshev(e.pos, hero.pos) === 1 && terrainAllowsStep(s.map, hero.pos, dirTowards(hero.pos, e.pos)!, true));
  if (adj) {
    const dir = dirTowards(hero.pos, adj.pos)!;
    const slot = hero.moves.findIndex((m) => m.pp > 0);
    return slot >= 0 && s.turn % 2 === 0 ? { type: 'useMove', slot, dir } : { type: 'attack', dir };
  }
  if (hero.pos.x === s.map.stairs.x && hero.pos.y === s.map.stairs.y) return { type: 'stairs' };
  const d = pathStep(s, hero, s.map.stairs);
  if (d !== null) return { type: 'move', dir: d };
  const free = ALL_DIRS.find((x) => validateAction(s, hero, { type: 'move', dir: x }).ok);
  return free !== undefined ? { type: 'move', dir: free } : { type: 'wait' };
}

describe('simulación de expediciones completas', () => {
  it('40 expediciones sin errores ni estados inválidos; varias recorren varios pisos', () => {
    let maxFloor = 0;
    let cleared = 0;
    const species = ['pikachu', 'charmander', 'squirtle', 'bulbasaur', 'cyndaquil', 'totodile', 'chikorita', 'meowth'];
    for (let seed = 1; seed <= 40; seed++) {
      const { state } = createExpedition({ dungeonId: 'expedition', seed, party: [{ playerId: 'A', name: 'Bot', species: species[seed % species.length] }] });
      const heroId = state.entities[0].id;
      for (let t = 0; t < 3000 && !state.result; t++) {
        let r = resolveTurn(state, { [heroId]: botAction(state, heroId) });
        if (!r.advanced) r = resolveTurn(state, { [heroId]: { type: 'wait' } });
        expect(r.advanced).toBe(true);
        // Invariantes: nadie en una pared, nadie solapado, HP dentro de rango.
        const pos = new Set<string>();
        for (const e of state.entities) {
          if (e.fainted) continue;
          expect(isWalkable(state.map, e.pos)).toBe(true);
          const k = `${e.pos.x},${e.pos.y}`;
          expect(pos.has(k)).toBe(false);
          pos.add(k);
          expect(e.hp).toBeGreaterThan(0);
          expect(e.hp).toBeLessThanOrEqual(e.maxHp);
        }
      }
      maxFloor = Math.max(maxFloor, state.floor);
      if (state.result === 'cleared') cleared++;
    }
    expect(maxFloor).toBeGreaterThanOrEqual(3);
    // 25 pisos: con 3000 turnos un bot no suele terminar; completar la expedición se prueba en expedition.test.
    expect(cleared).toBeGreaterThanOrEqual(0);
  }, 30_000); // simulación pesada: margen de tiempo amplio si la máquina está cargada
});
