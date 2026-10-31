import { describe, expect, it } from 'vitest';
import { Dir } from '../src/shared/core/geometry';
import { validateAction } from '../src/shared/engine/actions';
import { applyFreeAction, resolveTurn } from '../src/shared/engine/turn';
import { ROOM_7x5, addMon, blankState } from './helpers';

describe('movimiento', () => {
  it('permite moverse a una casilla libre y consume turno', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'pikachu', 2, 2, 'team', 1, 'A');
    const r = resolveTurn(s, { [p.id]: { type: 'move', dir: Dir.E } });
    expect(r.advanced).toBe(true);
    expect(p.pos).toEqual({ x: 3, y: 2 });
    expect(s.turn).toBe(1);
  });

  it('rechaza moverse contra una pared sin avanzar el turno', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'pikachu', 1, 1, 'team', 1, 'A');
    const r = resolveTurn(s, { [p.id]: { type: 'move', dir: Dir.N } });
    expect(r.advanced).toBe(false);
    expect(r.rejected?.reason).toMatch(/No se puede/);
    expect(p.pos).toEqual({ x: 1, y: 1 });
    expect(s.turn).toBe(0);
  });

  it('rechaza moverse a una casilla ocupada por un enemigo', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'pikachu', 2, 2, 'team', 1, 'A');
    addMon(s, 'wurmple', 3, 2, 'enemy');
    expect(validateAction(s, p, { type: 'move', dir: Dir.E }).ok).toBe(false);
  });

  it('permite las 8 direcciones en campo abierto', () => {
    for (let d = 0; d < 8; d++) {
      const s = blankState(ROOM_7x5);
      const p = addMon(s, 'pikachu', 4, 3, 'team', 1, 'A');
      expect(validateAction(s, p, { type: 'move', dir: d as Dir }).ok).toBe(true);
    }
  });

  it('no permite cortar esquinas en diagonal', () => {
    const s = blankState([
      '#####',
      '#.#.#',
      '#...#',
      '#####',
    ]);
    const p = addMon(s, 'pikachu', 1, 2, 'team', 1, 'A');
    // (1,2) → NE (2,1) es pared: inválido. Desde (1,1) → SE (2,2): la casilla (2,1) es pared.
    expect(validateAction(s, p, { type: 'move', dir: Dir.NE }).ok).toBe(false);
    p.pos = { x: 1, y: 1 };
    expect(validateAction(s, p, { type: 'move', dir: Dir.SE }).ok).toBe(false);
    p.pos = { x: 2, y: 2 };
    expect(validateAction(s, p, { type: 'move', dir: Dir.NE }).ok).toBe(false);
    expect(validateAction(s, p, { type: 'move', dir: Dir.E }).ok).toBe(true);
  });

  it('intercambia posiciones con un compañero', () => {
    const s = blankState(ROOM_7x5);
    const a = addMon(s, 'pikachu', 2, 2, 'team', 1, 'A');
    const b = addMon(s, 'squirtle', 3, 2, 'team', 1, 'B');
    resolveTurn(s, { [a.id]: { type: 'move', dir: Dir.E }, [b.id]: { type: 'wait' } });
    expect(a.pos).toEqual({ x: 3, y: 2 });
    expect(b.pos).toEqual({ x: 2, y: 2 });
  });

  it('girarse no consume turno', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'pikachu', 2, 2, 'team', 1, 'A');
    const r = applyFreeAction(s, p.id, { type: 'face', dir: Dir.W });
    expect(r.advanced).toBe(false);
    expect(p.facing).toBe(Dir.W);
    expect(s.turn).toBe(0);
  });

  it('los enemigos actúan después del jugador en el mismo turno', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'pikachu', 1, 3, 'team', 1, 'A');
    const e = addMon(s, 'wurmple', 6, 3, 'enemy');
    e.moves = []; // solo ataque normal / movimiento
    resolveTurn(s, { [p.id]: { type: 'wait' } });
    // Caterpie ve al jugador (misma habitación) y se acerca un paso.
    expect(e.pos.x).toBe(5);
  });
});
