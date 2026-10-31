import { describe, expect, it } from 'vitest';
import { getDungeon } from '../src/shared/data/dungeons';
import { getSpecies } from '../src/shared/data/species';
import { Dir } from '../src/shared/core/geometry';
import { START_LEVEL, createExpedition } from '../src/shared/engine/expedition';
import { resolveTurn } from '../src/shared/engine/turn';
import { decideAction } from '../src/shared/engine/ai';
import { ROOM_7x5, addMon, blankState } from './helpers';

const party = [{ playerId: 'A', name: 'Ana', species: 'charmander' }];

describe('expedición', () => {
  it('empieza desde cero: nivel inicial (5, como EoS), mochila vacía, 0 Poké', () => {
    const { state } = createExpedition({ dungeonId: 'expedition', seed: 7, party });
    const hero = state.entities.find((e) => e.playerId === 'A')!;
    expect(hero.level).toBe(START_LEVEL);
    expect(state.bag).toEqual([]);
    expect(state.money).toBe(0);
    expect(state.floor).toBe(1);
    expect(state.result).toBeNull();
  });

  it('una expedición nueva no hereda nada de la anterior', () => {
    const first = createExpedition({ dungeonId: 'expedition', seed: 7, party }).state;
    first.money = 999;
    first.bag.push({ uid: 'x', item: 'oranBerry' });
    first.entities[0].level = 20;
    const second = createExpedition({ dungeonId: 'expedition', seed: 7, party }).state;
    expect(second.money).toBe(0);
    expect(second.bag).toEqual([]);
    expect(second.entities[0].level).toBe(START_LEVEL);
  });

  it('la misma semilla y las mismas acciones producen el mismo estado (determinismo)', () => {
    const run = () => {
      const { state } = createExpedition({ dungeonId: 'expedition', seed: 99, party });
      const id = state.entities[0].id;
      const dirs = [Dir.E, Dir.S, Dir.W, Dir.N, Dir.SE, Dir.NW];
      for (let i = 0; i < 60; i++) {
        const r = resolveTurn(state, { [id]: { type: 'move', dir: dirs[i % dirs.length] } });
        if (!r.advanced) resolveTurn(state, { [id]: { type: 'wait' } });
      }
      return JSON.stringify(state);
    };
    expect(run()).toBe(run());
  });

  it('usar la escalera genera el siguiente piso y conserva los datos de la expedición', () => {
    const { state } = createExpedition({ dungeonId: 'expedition', seed: 5, party });
    const hero = state.entities[0];
    state.money = 50;
    state.bag.push({ uid: 'b1', item: 'apple' });
    hero.pos = { ...state.map.stairs };
    const r = resolveTurn(state, { [hero.id]: { type: 'stairs' } });
    expect(r.events.some((e) => e.t === 'floor')).toBe(true);
    expect(state.floor).toBe(2);
    expect(state.money).toBe(50);
    expect(state.bag).toHaveLength(1);
    expect(state.entities.every((e) => e.team === 'team' || e.level >= 1)).toBe(true);
  });

  it('completar el último piso termina la expedición con éxito', () => {
    const { state } = createExpedition({ dungeonId: 'expedition', seed: 5, party });
    const hero = state.entities[0];
    for (let f = 1; f <= getDungeon('expedition').floors + 1 && !state.result; f++) {
      hero.pos = { ...state.map.stairs };
      resolveTurn(state, { [hero.id]: { type: 'stairs' } });
    }
    expect(state.result).toBe('cleared');
    // Tras terminar no se aceptan más acciones.
    expect(resolveTurn(state, { [hero.id]: { type: 'wait' } }).advanced).toBe(false);
  });

  it('si el líder cae en solitario, la expedición termina en derrota', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'charmander', 2, 2, 'team', 1, 'A');
    const e = addMon(s, 'pidgey', 3, 2, 'enemy', 30);
    e.moves = [];
    p.hp = 1;
    for (let i = 0; i < 20 && !s.result; i++) resolveTurn(s, { [p.id]: { type: 'wait' } });
    expect(p.fainted).toBe(true);
    expect(s.result).toBe('defeated');
  });

  it('en cooperativo la expedición sigue mientras quede algún jugador en pie', () => {
    const s = blankState(ROOM_7x5);
    s.rules.defeatWhen = 'allPlayersFaint';
    const a = addMon(s, 'charmander', 2, 2, 'team', 1, 'A');
    const b = addMon(s, 'squirtle', 6, 5, 'team', 1, 'B');
    const e = addMon(s, 'pidgey', 3, 2, 'enemy', 30);
    e.moves = [];
    a.hp = 1;
    for (let i = 0; i < 20 && !a.fainted; i++) resolveTurn(s, { [a.id]: { type: 'wait' }, [b.id]: { type: 'wait' } });
    expect(a.fainted).toBe(true);
    expect(s.result).toBeNull();
    // Un jugador debilitado no puede actuar.
    expect(resolveTurn(s, { [a.id]: { type: 'wait' } }).advanced).toBe(false);
  });

  it('la Semilla Revivir se consume sola al caer', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'charmander', 2, 2, 'team', 1, 'A');
    const e = addMon(s, 'pidgey', 3, 2, 'enemy', 30);
    e.moves = [];
    s.bag.push({ uid: 'r', item: 'reviverSeed' });
    p.hp = 1;
    for (let i = 0; i < 10 && s.bag.length; i++) resolveTurn(s, { [p.id]: { type: 'wait' } });
    expect(s.bag).toHaveLength(0);
    expect(p.fainted).toBe(false);
    expect(s.result).toBeNull();
  });
});

describe('objetos', () => {
  it('caminar sobre un objeto lo recoge en la mochila; el dinero va al monedero', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'pikachu', 2, 2, 'team', 1, 'A');
    s.items.push({ id: 'i1', item: 'oranBerry', pos: { x: 3, y: 2 }, amount: 1 }, { id: 'i2', item: 'poke', pos: { x: 4, y: 2 }, amount: 40 });
    resolveTurn(s, { [p.id]: { type: 'move', dir: Dir.E } });
    resolveTurn(s, { [p.id]: { type: 'move', dir: Dir.E } });
    expect(s.bag.map((b) => b.item)).toEqual(['oranBerry']);
    expect(s.money).toBe(40);
    expect(s.items).toHaveLength(0);
  });

  it('usar una Baya Aranja cura y se consume', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'pikachu', 2, 2, 'team', 1, 'A');
    p.hp = 1;
    s.bag.push({ uid: 'b1', item: 'oranBerry' });
    const r = resolveTurn(s, { [p.id]: { type: 'useItem', bagUid: 'b1' } });
    expect(r.advanced).toBe(true);
    expect(p.hp).toBe(p.maxHp);
    expect(s.bag).toHaveLength(0);
  });

  it('con la mochila llena el objeto se queda en el suelo', () => {
    const s = blankState(ROOM_7x5);
    s.rules.bagCapacity = 1;
    const p = addMon(s, 'pikachu', 2, 2, 'team', 1, 'A');
    s.bag.push({ uid: 'b1', item: 'apple' });
    s.items.push({ id: 'i1', item: 'oranBerry', pos: { x: 3, y: 2 }, amount: 1 });
    resolveTurn(s, { [p.id]: { type: 'move', dir: Dir.E } });
    expect(s.items).toHaveLength(1);
    expect(s.bag).toHaveLength(1);
  });

  it('la barriga baja con los turnos y la manzana la llena', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'pikachu', 2, 2, 'team', 1, 'A');
    for (let i = 0; i < 100; i++) resolveTurn(s, { [p.id]: { type: 'wait' } });
    expect(p.belly).toBeCloseTo(90, 5);
    s.bag.push({ uid: 'a', item: 'apple' });
    resolveTurn(s, { [p.id]: { type: 'useItem', bagUid: 'a' } });
    // Comer consume turno: al final de ese turno la barriga ya ha bajado 0,1.
    expect(p.belly).toBeCloseTo(p.maxBelly - s.rules.bellyPerTurn, 5);
  });
});

describe('estados y trampas', () => {
  it('el veneno quita HP cada turno y bloquea la regeneración', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'pikachu', 2, 2, 'team', 1, 'A');
    p.statuses.push({ id: 'poison', turnsLeft: null, counter: 0 });
    const hp0 = p.hp;
    resolveTurn(s, { [p.id]: { type: 'wait' } });
    resolveTurn(s, { [p.id]: { type: 'wait' } });
    expect(p.hp).toBe(hp0 - 2);
  });

  it('dormido no puede actuar', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'pikachu', 2, 2, 'team', 1, 'A');
    p.statuses.push({ id: 'sleep', turnsLeft: 3, counter: 0 });
    resolveTurn(s, { [p.id]: { type: 'move', dir: Dir.E } });
    expect(p.pos).toEqual({ x: 2, y: 2 });
  });

  it('pisar una trampa la revela y aplica su efecto; los enemigos no las activan', () => {
    const s = blankState(ROOM_7x5);
    const p = addMon(s, 'pikachu', 2, 2, 'team', 1, 'A');
    s.traps.push({ id: 't1', trap: 'poisonTrap', pos: { x: 3, y: 2 }, revealed: false });
    resolveTurn(s, { [p.id]: { type: 'move', dir: Dir.E } });
    expect(s.traps[0].revealed).toBe(true);
    expect(p.statuses.some((x) => x.id === 'poison')).toBe(true);

    const e = addMon(s, 'wurmple', 5, 4, 'enemy');
    s.traps.push({ id: 't2', trap: 'poisonTrap', pos: { x: 5, y: 4 }, revealed: false });
    resolveTurn(s, { [p.id]: { type: 'wait' } });
    expect(e.statuses).toHaveLength(0);
  });
});

describe('IA', () => {
  it('no persigue a un jugador que no puede percibir (otra zona, lejos)', () => {
    const s = blankState([
      '###############',
      '#...#,,,,,#...#',
      '#...#,###,#...#',
      '#.....###.....#',
      '###############',
    ]);
    // Habitaciones: el helper marca '.' como sala 0; separamos la derecha en sala 1.
    for (let y = 0; y < s.map.height; y++) for (let x = 10; x < 15; x++) if (s.map.roomAt[y * s.map.width + x] === 0) s.map.roomAt[y * s.map.width + x] = 1;
    s.map.rooms.push({ id: 1, x: 11, y: 1, w: 3, h: 3 });
    s.map.rooms[0] = { id: 0, x: 1, y: 1, w: 3, h: 3 };
    const p = addMon(s, 'pikachu', 1, 1, 'team', 1, 'A');
    const e = addMon(s, 'wurmple', 13, 1, 'enemy');
    decideAction(s, e);
    expect(e.ai.targetId).toBeUndefined();
    e.pos = { x: 3, y: 1 };
    decideAction(s, e);
    expect(e.ai.targetId).toBe(p.id);
  });

  it('ataca cuando el objetivo está adyacente', () => {
    const s = blankState(ROOM_7x5);
    addMon(s, 'pikachu', 2, 2, 'team', 1, 'A');
    const e = addMon(s, 'wurmple', 3, 2, 'enemy');
    e.moves = [];
    expect(decideAction(s, e)).toEqual({ type: 'attack', dir: Dir.W });
  });
});

describe('equipo inicial (como InitMainTeamAfterQuiz de EoS)', () => {
  it('empieza a nivel 5 con los movimientos de su especie hasta ese nivel y el de huevo si lo tiene', () => {
    const s = createExpedition({ dungeonId: 'expedition', seed: 3, party: [{ playerId: 'A', name: 'A', species: 'meowth' }] }).state;
    const meowth = s.entities.find((e) => e.playerId === 'A')!;
    expect(START_LEVEL).toBe(5);
    expect(meowth.level).toBe(5);
    expect(meowth.moves.length).toBeLessThanOrEqual(4);
    // Con la ROM importada, Meowth recibe Hipnosis (STARTER_MOVES_ARRAY).
    const sp = getSpecies('meowth');
    if (sp.starterEggMove) expect(meowth.moves.map((m) => m.id)).toContain(sp.starterEggMove);
  });
});
