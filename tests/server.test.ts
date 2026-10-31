import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { Room, type Peer } from '../src/server/room';
import { startServer, type ServerHandle } from '../src/server/app';
import { PROTOCOL_VERSION, type ServerMessage } from '../src/shared/net/protocol';
import { getZone } from '../src/shared/town/zone';
import { routeTo } from '../src/shared/town/route';
import { ALL_DIRS, Dir } from '../src/shared/core/geometry';
import { validateAction } from '../src/shared/engine/actions';
import { type GameState, entityAt, playerEntity } from '../src/shared/engine/state';
import { currentMode } from '../src/shared/engine/mode';
import { step } from '../src/shared/core/geometry';
import { isWalkable } from '../src/shared/dungeon/map';
import { spawnEnemy } from '../src/shared/engine/floor';

let SEQ = 1;
const act = (room: Room, p: FakePeer, turn: number, action: object, seq = SEQ++) =>
  room.handle(p, { type: 'action', turn, seq, action } as never);

/** Coloca un enemigo junto al jugador → modo táctico (combate). */
function engage(room: Room, p: FakePeer) {
  const s = room.state!;
  const me = playerEntity(s, p.playerId)!;
  const spot = ALL_DIRS.map((d) => step(me.pos, d)).find((q) => isWalkable(s.map, q) && !entityAt(s, q))!;
  const enemy = s.entities.find((e) => e.team === 'enemy') ?? spawnEnemy(s, spot);
  enemy.pos = spot;
  enemy.moves = [];
  enemy.hp = enemy.maxHp = 999;
  // Solo queda este enemigo, para que el combate dependa de él.
  s.entities = s.entities.filter((e) => e.team !== 'enemy' || e === enemy);
  s.rules.floorTurnLimit = 99999;
  return enemy;
}

/** Elimina a todos los enemigos → modo exploración. */
function disengage(room: Room) {
  const s = room.state!;
  s.entities = s.entities.filter((e) => e.team !== 'enemy');
  s.spawnCountdown = 99999;
  s.rules.floorTurnLimit = 99999;
}

class FakePeer implements Peer {
  msgs: ServerMessage[] = [];
  send(m: ServerMessage) {
    this.msgs.push(m);
  }
  last<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }> | undefined {
    for (let i = this.msgs.length - 1; i >= 0; i--) if (this.msgs[i].type === type) return this.msgs[i] as never;
    return undefined;
  }
  get playerId() {
    return this.last('welcome')!.playerId;
  }
}

function setupRoom(timeout = 0) {
  let timerFn: (() => void) | null = null;
  const room = new Room('TEST', 'expedition', {
    turnTimeoutSeconds: timeout,
    seed: 1234,
    setTimer: (fn) => {
      timerFn = fn;
      return 1;
    },
    clearTimer: () => {
      timerFn = null;
    },
  });
  const a = new FakePeer();
  const b = new FakePeer();
  room.addMember('Ana', a);
  room.addMember('Beto', b);
  room.handle(a, { type: 'pickSpecies', species: 'charmander' });
  room.handle(b, { type: 'pickSpecies', species: 'squirtle' });
  room.handle(a, { type: 'start' }); // lobby → casa
  goToDungeon(room, a); // casa → … → Encrucijada → mazmorra
  return { room, a, b, fireTimer: () => timerFn?.() };
}

/** Camina (pasos que el servidor acepta) hasta la salida indicada de la zona en la que está el jugador. */
function walkTo(room: Room, p: FakePeer, exitId: string) {
  const tp = room.town.get(p.playerId)!;
  const zone = getZone(tp.zoneId);
  const route = routeTo(zone, tp, zone.exits.find((e) => e.id === exitId)!.rect)!;
  for (const st of route) room.handle(p, { type: 'townMove', x: st.x, y: st.y, dir: 0, moving: true });
}

/** Salidas de casa a la Encrucijada: casa → Risco Sharpedo → Aldea Tesoro → Encrucijada. */
const TO_CROSSROADS = ['up', 'east', 'east'];

/** De donde esté el jugador (casa o Encrucijada) hasta entrar en la mazmorra por la salida este de la Encrucijada. */
function goToDungeon(room: Room, p: FakePeer) {
  if (room.town.get(p.playerId)!.zoneId === 'home')
    for (const exitId of TO_CROSSROADS) {
      walkTo(room, p, exitId);
      room.handle(p, { type: 'changeZone', exitId });
    }
  walkTo(room, p, 'east');
  room.handle(p, { type: 'enterDungeon', exitId: 'east' });
}

/** Primera dirección en la que el jugador puede moverse. */
function freeDir(state: GameState, playerId: string): Dir {
  const e = playerEntity(state, playerId)!;
  return ALL_DIRS.find((d) => validateAction(state, e, { type: 'move', dir: d }).ok) ?? Dir.S;
}

describe('sala cooperativa: exploración libre y combate por turnos', () => {
  it('solo el anfitrión inicia y cada jugador recibe el mismo estado', () => {
    const { room, a, b } = setupRoom();
    expect(room.state).not.toBeNull();
    expect(JSON.stringify(a.last('state')!.state)).toBe(JSON.stringify(b.last('state')!.state));
  });

  it('EXPLORACIÓN: cada jugador encadena acciones sin esperar al compañero', () => {
    const { room, a, b } = setupRoom();
    disengage(room);
    const s = room.state!;
    expect(currentMode(s)).toBe('explore');
    const ea = playerEntity(s, a.playerId)!;
    const positions = [`${ea.pos.x},${ea.pos.y}`];
    for (let i = 0; i < 4; i++) {
      act(room, a, s.turn, { type: 'move', dir: freeDir(s, a.playerId) });
      positions.push(`${ea.pos.x},${ea.pos.y}`);
    }
    // Las 4 acciones de A se resuelven sin que B haga nada.
    expect(a.msgs.filter((m) => m.type === 'ack')).toHaveLength(4);
    expect(new Set(positions).size).toBeGreaterThan(1);
    expect(a.last('state')!.turnInfo.mode).toBe('explore');
    act(room, b, s.turn, { type: 'wait' });
    expect(b.last('ack')).toBeDefined();
    expect(JSON.stringify(a.last('state')!.state)).toBe(JSON.stringify(b.last('state')!.state));
  });

  it('EXPLORACIÓN: el tiempo del mundo avanza 1 turno por cada N acciones (N = jugadores)', () => {
    const { room, a } = setupRoom();
    disengage(room);
    const s = room.state!;
    const t0 = s.turn;
    for (let i = 0; i < 6; i++) act(room, a, s.turn, { type: 'wait' });
    expect(s.turn - t0).toBe(3);
  });

  it('COMBATE: con un enemigo implicado, el turno no se resuelve hasta que actúan los dos', () => {
    const { room, a, b } = setupRoom();
    engage(room, a);
    const s = room.state!;
    expect(currentMode(s)).toBe('tactical');
    const t0 = s.turn;
    act(room, a, t0, { type: 'wait' });
    expect(s.turn).toBe(t0);
    expect(a.last('turnInfo')!.turnInfo.waitingFor).toEqual([b.playerId]);
    expect(a.last('turnInfo')!.turnInfo.mode).toBe('tactical');
    act(room, b, t0, { type: 'wait' });
    expect(s.turn).toBe(t0 + 1);
    expect(JSON.stringify(a.last('state')!.state)).toBe(JSON.stringify(b.last('state')!.state));
  });

  it('pasa de exploración a combate al encontrar enemigos y vuelve a exploración al terminar', () => {
    const { room, a, b } = setupRoom();
    disengage(room);
    const s = room.state!;
    expect(currentMode(s)).toBe('explore');
    const enemy = engage(room, a);
    expect(currentMode(s)).toBe('tactical');
    enemy.hp = 1;
    enemy.maxHp = 1;
    for (let i = 0; i < 30 && s.entities.includes(enemy); i++) {
      const me = playerEntity(s, a.playerId)!;
      const dir = ALL_DIRS.find((d) => step(me.pos, d).x === enemy.pos.x && step(me.pos, d).y === enemy.pos.y);
      act(room, a, s.turn, dir === undefined ? { type: 'wait' } : { type: 'attack', dir });
      if (currentMode(s) === 'tactical') act(room, b, s.turn, { type: 'wait' });
    }
    expect(s.entities.includes(enemy)).toBe(false);
    expect(a.last('state')!.turnInfo.mode).toBe('explore');
    expect(b.last('state')!.turnInfo.mode).toBe('explore');
  });

  it('rechaza acciones duplicadas (misma secuencia) y turnos desfasados en combate', () => {
    const { room, a } = setupRoom();
    engage(room, a);
    const t = room.state!.turn;
    act(room, a, t, { type: 'wait' }, 5000);
    act(room, a, t, { type: 'wait' }, 5000);
    expect(a.last('rejected')!.reason).toMatch(/duplicada/);
    act(room, a, t, { type: 'wait' }, 5001);
    expect(a.last('rejected')!.reason).toMatch(/Ya has elegido/);
    act(room, a, t + 7, { type: 'wait' }, 5002);
    expect(a.last('rejected')!.reason).toMatch(/desfasado/);
  });

  it('el servidor valida: no acepta moverse contra una pared ni datos inventados', () => {
    const { room, a } = setupRoom();
    const s = room.state!;
    const e = playerEntity(s, a.playerId)!;
    const t0 = s.turn;
    const bad = ALL_DIRS.find((d) => !validateAction(s, e, { type: 'move', dir: d }).ok);
    if (bad !== undefined) {
      act(room, a, s.turn, { type: 'move', dir: bad });
      expect(a.last('rejected')).toBeDefined();
    }
    act(room, a, s.turn, { type: 'move', dir: 42 });
    expect(a.last('rejected')!.reason).toMatch(/Dirección/);
    act(room, a, s.turn, { type: 'useMove', slot: 9 });
    expect(a.last('rejected')!.reason).toMatch(/inexistente/);
    expect(s.turn).toBe(t0);
  });

  it('girarse se aplica al instante sin consumir turno', () => {
    const { room, a } = setupRoom();
    const t0 = room.state!.turn;
    act(room, a, t0, { type: 'face', dir: Dir.W });
    expect(playerEntity(room.state!, a.playerId)!.facing).toBe(Dir.W);
    expect(room.state!.turn).toBe(t0);
  });

  it('COMBATE: si un jugador no actúa, al vencer el tiempo espera automáticamente', () => {
    const { room, a, fireTimer } = setupRoom(30);
    engage(room, a);
    const t0 = room.state!.turn;
    act(room, a, t0, { type: 'wait' });
    expect(room.state!.turn).toBe(t0);
    fireTimer();
    expect(room.state!.turn).toBe(t0 + 1);
  });

  it('al desconectarse, su Pokémon pasa a la IA y el combate no se bloquea; al volver recupera el control', () => {
    const { room, a, b } = setupRoom();
    engage(room, a);
    const token = b.last('welcome')!.token;
    const t0 = room.state!.turn;
    act(room, a, t0, { type: 'wait' });
    room.disconnect(b);
    expect(room.state!.turn).toBe(t0 + 1);
    const eb = playerEntity(room.state!, b.playerId)!;
    expect(eb.controller).toBe('ai');
    act(room, a, room.state!.turn, { type: 'wait' });
    expect(room.state!.turn).toBe(t0 + 2);
    const b2 = new FakePeer();
    room.resume(token, b2);
    expect(eb.controller).toBe('player');
    expect(b2.last('state')!.turnInfo.waitingFor).toContain(b.playerId);
    expect(typeof room.resume('falso', new FakePeer())).toBe('string');
  });

  it('las trampas ocultas no se envían a los clientes', () => {
    const { room, a } = setupRoom();
    room.state!.traps.push({ id: 'tx', trap: 'warpTrap', pos: { x: 1, y: 1 }, revealed: false });
    act(room, a, room.state!.turn, { type: 'face', dir: Dir.N });
    expect(a.last('state')!.state.traps.find((t) => t.id === 'tx')).toBeUndefined();
  });

  it('la escalera la usa cualquier jugador y lleva a todo el equipo al siguiente piso', () => {
    const { room, a, b } = setupRoom();
    disengage(room);
    const s = room.state!;
    playerEntity(s, a.playerId)!.pos = { ...s.map.stairs };
    act(room, a, s.turn, { type: 'stairs' });
    expect(s.floor).toBe(2);
    expect(a.last('state')!.state.floor).toBe(2);
    expect(b.last('state')!.state.floor).toBe(2);
  });

  it('no permite elegir el mismo Pokémon dos veces', () => {
    const room = new Room('X', 'expedition', { turnTimeoutSeconds: 0 });
    const a = new FakePeer();
    const b = new FakePeer();
    room.addMember('A', a);
    room.addMember('B', b);
    room.handle(a, { type: 'pickSpecies', species: 'pikachu' });
    room.handle(b, { type: 'pickSpecies', species: 'pikachu' });
    expect(b.last('rejected')!.reason).toMatch(/ya ha elegido/);
  });
});

describe('zonas exteriores en cooperativo', () => {
  function lobbyRoom(startPlace?: { zoneId: string; entry: string }) {
    const room = new Room('PLZ', 'expedition', { turnTimeoutSeconds: 0, seed: 77, startPlace });
    const a = new FakePeer();
    const b = new FakePeer();
    room.addMember('Ana', a);
    room.addMember('Beto', b);
    room.handle(a, { type: 'pickSpecies', species: 'pikachu' });
    room.handle(b, { type: 'pickSpecies', species: 'totodile' });
    return { room, a, b };
  }

  it('el anfitrión lleva al grupo dentro de casa; ambos aparecen en puntos distintos', () => {
    const { room, a, b } = lobbyRoom();
    room.handle(b, { type: 'start' });
    expect(b.last('rejected')!.reason).toMatch(/anfitrión/);
    room.handle(a, { type: 'start' });
    expect(room.phase).toBe('town');
    const town = b.last('town')!.town;
    expect(town.players).toHaveLength(2);
    expect(town.players.every((p) => p.zoneId === 'home')).toBe(true);
    expect(new Set(town.players.map((p) => `${p.x},${p.y}`)).size).toBe(2);
    expect(a.last('lobby')!.lobby.phase).toBe('town');
    // Ya no se puede unir nadie ni cambiar de Pokémon.
    expect(typeof room.addMember('Carla', new FakePeer())).toBe('string');
  });

  it('las posiciones válidas se difunden al compañero; las inválidas se corrigen', () => {
    const { room, a, b } = lobbyRoom();
    room.handle(a, { type: 'start' });
    const tp = room.town.get(a.playerId)!;
    const before = b.msgs.length;
    room.handle(a, { type: 'townMove', x: tp.x, y: tp.y - 10, dir: 4, moving: true });
    expect(b.msgs.length).toBe(before + 1);
    expect(b.last('town')!.town.players.find((p) => p.playerId === a.playerId)!.y).toBe(tp.y);
    // Teletransporte (demasiado lejos) → corrección solo al emisor.
    const y0 = tp.y;
    room.handle(a, { type: 'townMove', x: 6, y: 330, dir: 6, moving: true });
    expect(tp.y).toBe(y0);
    expect(a.last('town')!.correction).toBe(true);
    // Dentro de un obstáculo (borde del mapa) → corrección.
    room.handle(a, { type: 'townMove', x: tp.x, y: -5, dir: 4, moving: true });
    expect(tp.y).toBe(y0);
  });

  it('cada jugador cambia de zona por su cuenta, solo desde la salida', () => {
    const { room, a, b } = lobbyRoom();
    room.handle(a, { type: 'start' });
    const tp = room.town.get(a.playerId)!;
    // Lejos de la salida: no cambia (se le reenvía su posición).
    room.handle(a, { type: 'changeZone', exitId: 'up' });
    expect(tp.zoneId).toBe('home');
    room.handle(a, { type: 'changeZone', exitId: 'nope' });
    expect(a.last('rejected')!.reason).toMatch(/todavía/);
    walkTo(room, a, 'up');
    room.handle(a, { type: 'changeZone', exitId: 'up' });
    expect(tp.zoneId).toBe('bluff');
    expect(room.town.get(b.playerId)!.zoneId).toBe('home');
    // El compañero lo ve en la otra zona; los movimientos se validan con el mapa de su zona.
    expect(b.last('town')!.town.players.find((p) => p.playerId === a.playerId)!.zoneId).toBe('bluff');
    const at = { x: tp.x, y: tp.y };
    walkTo(room, a, 'east');
    expect(tp.x).toBeGreaterThan(at.x + 100);
  });

  it('entrar en la mazmorra exige estar en una salida activa', () => {
    const { room, a, b } = lobbyRoom({ zoneId: 'crossroads', entry: 'fromTown' });
    room.handle(a, { type: 'start' });
    room.handle(a, { type: 'enterDungeon', exitId: 'east' });
    expect(a.last('rejected')!.reason).toMatch(/Acércate/);
    room.handle(a, { type: 'enterDungeon', exitId: 'north' });
    expect(a.last('rejected')!.reason).toMatch(/todavía/);
    goToDungeon(room, b);
    expect(room.phase).toBe('expedition');
    expect(a.last('state')!.state.dungeonId).toBe('expedition');
    expect(JSON.stringify(a.last('state')!.state)).toBe(JSON.stringify(b.last('state')!.state));
  });

  it('al terminar la expedición el grupo vuelve junto a la Encrucijada (y no antes)', () => {
    const { room, a, b } = lobbyRoom();
    room.handle(a, { type: 'start' });
    goToDungeon(room, a);
    room.handle(b, { type: 'returnToTown' });
    expect(b.last('rejected')!.reason).toMatch(/no ha terminado/);
    room.state!.result = 'cleared';
    room.handle(b, { type: 'returnToTown' });
    expect(room.phase).toBe('town');
    expect(room.state).toBeNull();
    const players = a.last('town')!.town.players;
    expect(players).toHaveLength(2);
    expect(players.every((p) => p.zoneId === 'crossroads')).toBe(true);
    // Se puede volver a salir hacia otra expedición nueva.
    goToDungeon(room, a);
    expect(room.phase).toBe('expedition');
    expect(room.state!.floor).toBe(1);
  });

  it('desconectarse fuera de la mazmorra no expulsa del grupo y se puede volver', () => {
    const { room, a, b } = lobbyRoom();
    room.handle(a, { type: 'start' });
    const token = b.last('welcome')!.token;
    room.disconnect(b);
    expect(a.last('town')!.town.players.find((p) => p.playerId === b.playerId)!.connected).toBe(false);
    const b2 = new FakePeer();
    room.resume(token, b2);
    expect(b2.last('town')!.town.players.find((p) => p.playerId === b.playerId)!.connected).toBe(true);
  });
});

describe('integración WebSocket real (dos clientes)', () => {
  let server: ServerHandle;
  beforeAll(async () => {
    server = await startServer({ port: 0, turnTimeoutSeconds: 0, quiet: true, startPlace: { zoneId: 'crossroads', entry: 'fromDungeon' } });
  });
  afterAll(async () => {
    await server.close();
  });

  function client() {
    const ws = new WebSocket(`ws://localhost:${server.port}`);
    const inbox: ServerMessage[] = [];
    const waiters: { pred: (m: ServerMessage) => boolean; resolve: (m: ServerMessage) => void }[] = [];
    ws.on('message', (d) => {
      const m = JSON.parse(String(d)) as ServerMessage;
      inbox.push(m);
      for (const w of [...waiters]) if (w.pred(m)) {
        waiters.splice(waiters.indexOf(w), 1);
        w.resolve(m);
      }
    });
    const opened = new Promise<void>((r) => ws.on('open', () => r()));
    return {
      ws,
      inbox,
      opened,
      send: (m: object) => ws.send(JSON.stringify(m)),
      wait: <T extends ServerMessage['type']>(type: T, pred: (m: Extract<ServerMessage, { type: T }>) => boolean = () => true) =>
        new Promise<Extract<ServerMessage, { type: T }>>((resolve, reject) => {
          const found = inbox.find((m) => m.type === type && pred(m as never));
          if (found) return resolve(found as never);
          waiters.push({ pred: (m) => m.type === type && pred(m as never), resolve: resolve as never });
          setTimeout(() => reject(new Error(`timeout esperando ${type}`)), 4000);
        }),
    };
  }

  it('dos navegadores crean/unen sesión, juegan un turno y ven el mismo estado', async () => {
    const A = client();
    await A.opened;
    A.send({ type: 'hello', version: PROTOCOL_VERSION });
    A.send({ type: 'create', name: 'Ana' });
    const welcomeA = await A.wait('welcome');
    const B = client();
    await B.opened;
    B.send({ type: 'join', code: welcomeA.code, name: 'Beto' });
    const welcomeB = await B.wait('welcome');
    await A.wait('lobby', (m) => m.lobby.players.length === 2);

    A.send({ type: 'pickSpecies', species: 'pikachu' });
    B.send({ type: 'pickSpecies', species: 'totodile' });
    await A.wait('lobby', (m) => m.lobby.players.every((p) => p.species));
    A.send({ type: 'start' });
    const town = await A.wait('town');
    const me = town.town.players.find((p) => p.playerId === welcomeA.playerId)!;
    const cross = getZone('crossroads');
    for (const st of routeTo(cross, me, cross.exits.find((e) => e.id === 'east')!.rect)!) A.send({ type: 'townMove', x: st.x, y: st.y, dir: 2, moving: true });
    A.send({ type: 'enterDungeon', exitId: 'east' });
    const s0 = await B.wait('state');
    expect(s0.state.players).toHaveLength(2);

    A.send({ type: 'action', turn: s0.state.turn, seq: 1, action: { type: 'wait' } });
    B.send({ type: 'action', turn: s0.state.turn, seq: 1, action: { type: 'move', dir: freeDir(s0.state, welcomeB.playerId) } });
    const a1 = await A.wait('state', (m) => m.state.turn === 1);
    const b1 = await B.wait('state', (m) => m.state.turn === 1);
    expect(JSON.stringify(a1.state)).toBe(JSON.stringify(b1.state));
    expect(a1.events.length).toBeGreaterThan(0);
    A.ws.close();
    B.ws.close();
  });

  it('unirse a una sala inexistente devuelve un error', async () => {
    const C = client();
    await C.opened;
    C.send({ type: 'join', code: 'ZZZZZ', name: 'C' });
    const err = await C.wait('error');
    expect(err.message).toMatch(/no existe/);
    C.ws.close();
  });
});
