/**
 * Sala cooperativa: lobby + expedición autoritativa + coordinador de turnos.
 * Sin dependencias de red: recibe "sockets" abstractos para poder probarla.
 */
import { randomBytes } from 'node:crypto';
import { type Action, TURN_COST, validateAction } from '../shared/engine/actions';
import type { GameEvent } from '../shared/engine/events';
import { createExpedition } from '../shared/engine/expedition';
import { type GameState, getEntity } from '../shared/engine/state';
import { applyFreeAction, resolveExploreAction, resolveTurn, setController } from '../shared/engine/turn';
import { currentMode } from '../shared/engine/mode';
import { RETURN_PLACE, START_PLACE, canTraverse, entryPoint, getZone, inRect } from '../shared/town/zone';
import { PLAYABLE_SPECIES } from '../shared/data/species';
import { DUNGEONS } from '../shared/data/dungeons';
import {
  type ClientMessage,
  type LobbyInfo,
  MAX_PLAYERS,
  type ServerMessage,
  type TownInfo,
  type TownPlayer,
  type TurnInfo,
  viewForClients,
} from '../shared/net/protocol';

/** Distancia máxima (px) entre dos actualizaciones de posición en una zona. */
const MAX_TOWN_STEP = 40;

export interface Peer {
  send(msg: ServerMessage): void;
}

interface Member {
  playerId: string;
  token: string;
  name: string;
  species: string | null;
  peer: Peer | null;
  isHost: boolean;
  /** Última secuencia de acción aceptada (evita duplicados por reenvíos/reconexiones). */
  lastSeq: number;
}

export interface RoomOptions {
  /** Segundos de espera antes de forzar "esperar" a los rezagados (0 = sin límite). */
  turnTimeoutSeconds: number;
  seed?: number | string;
  /** Dónde aparece el grupo al salir del lobby (por defecto, dentro de casa). Útil para pruebas. */
  startPlace?: { zoneId: string; entry: string };
  now?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (h: unknown) => void;
}

export class Room {
  readonly members: Member[] = [];
  /**
   * Fases de la sala:
   *   lobby      → eligiendo Pokémon (aún se puede unir gente)
   *   town       → en las zonas exteriores, cada uno se mueve libremente (y en su propia zona)
   *   expedition → en una mazmorra (state != null)
   * Al terminar una expedición se vuelve a 'town'.
   */
  phase: 'lobby' | 'town' | 'expedition' = 'lobby';
  state: GameState | null = null;
  readonly town = new Map<string, TownPlayer>();
  /** Acciones bloqueadas para el turno actual: playerId → acción. */
  private pending = new Map<string, Action>();
  private timer: unknown = null;
  private deadlineAt: number | null = null;
  lastActivity: number;
  private now: () => number;

  constructor(
    readonly code: string,
    readonly dungeonId: string,
    private opts: RoomOptions,
  ) {
    this.now = opts.now ?? Date.now;
    this.lastActivity = this.now();
  }

  // ── Lobby ──────────────────────────────────────────────────────────────

  addMember(name: string, peer: Peer): Member | string {
    if (this.phase !== 'lobby') return 'El grupo ya ha salido de la sala de espera.';
    if (this.members.length >= MAX_PLAYERS) return 'La sala está llena.';
    const m: Member = {
      playerId: `P${this.members.length + 1}-${randomBytes(3).toString('hex')}`,
      token: randomBytes(16).toString('hex'),
      name: sanitizeName(name),
      species: null,
      peer,
      isHost: this.members.length === 0,
      lastSeq: -Infinity,
    };
    this.members.push(m);
    peer.send({ type: 'welcome', playerId: m.playerId, token: m.token, code: this.code });
    this.broadcastLobby();
    return m;
  }

  resume(token: string, peer: Peer): Member | string {
    const m = this.members.find((x) => x.token === token);
    if (!m) return 'La sesión no existe o ha expirado.';
    m.peer = peer;
    peer.send({ type: 'welcome', playerId: m.playerId, token: m.token, code: this.code });
    this.broadcastLobby();
    if (this.phase === 'town') {
      const tp = this.town.get(m.playerId);
      if (tp) tp.connected = true;
      this.broadcastTown();
    }
    if (this.state) {
      const slot = this.state.players.find((p) => p.playerId === m.playerId);
      if (slot) {
        slot.connected = true;
        setController(this.state, slot.entityId, 'player');
      }
      this.broadcastState([{ t: 'message', text: `${m.name} se ha reconectado.` }]);
    }
    return m;
  }

  disconnect(peer: Peer) {
    const m = this.members.find((x) => x.peer === peer);
    if (!m) return;
    m.peer = null;
    if (this.phase === 'town') {
      const tp = this.town.get(m.playerId);
      if (tp) tp.connected = false;
      this.broadcastLobby();
      this.broadcastTown();
      return;
    }
    if (this.phase === 'lobby' || !this.state) {
      // En el lobby, desconectarse equivale a salir.
      this.members.splice(this.members.indexOf(m), 1);
      if (m.isHost && this.members[0]) this.members[0].isHost = true;
      this.broadcastLobby();
      return;
    }
    const slot = this.state.players.find((p) => p.playerId === m.playerId);
    if (slot) {
      slot.connected = false;
      // Su Pokémon pasa a manejarlo la IA de compañero hasta que vuelva.
      setController(this.state, slot.entityId, 'ai');
    }
    this.pending.delete(m.playerId);
    this.broadcastLobby();
    this.broadcastState([{ t: 'message', text: `${m.name} se ha desconectado. Su Pokémon le seguirá automáticamente.` }]);
    this.maybeResolve();
  }

  handle(peer: Peer, msg: ClientMessage) {
    this.lastActivity = this.now();
    const m = this.members.find((x) => x.peer === peer);
    if (!m) return peer.send({ type: 'error', message: 'No perteneces a esta sala.' });
    switch (msg.type) {
      case 'pickSpecies': {
        if (this.phase !== 'lobby') return peer.send({ type: 'rejected', reason: 'Ya no se puede cambiar de Pokémon.' });
        if (!PLAYABLE_SPECIES.includes(msg.species)) return peer.send({ type: 'rejected', reason: 'Pokémon no disponible.' });
        if (this.members.some((o) => o !== m && o.species === msg.species))
          return peer.send({ type: 'rejected', reason: 'Otro jugador ya ha elegido ese Pokémon.' });
        m.species = msg.species;
        this.broadcastLobby();
        return;
      }
      case 'start':
        return this.goToTown(m);
      case 'townMove':
        return this.onTownMove(m, msg.x, msg.y, msg.dir, msg.moving);
      case 'changeZone':
        return this.onChangeZone(m, msg.exitId);
      case 'enterDungeon':
        return this.onEnterDungeon(m, msg.exitId);
      case 'returnToTown':
        return this.onReturnToTown(m);
      case 'action':
        if (this.phase !== 'expedition') return peer.send({ type: 'rejected', reason: 'No estáis en una mazmorra.' });
        return this.onAction(m, msg.turn, msg.seq, msg.action);
      case 'leave':
        return this.disconnect(peer);
    }
  }

  // ── Zonas exteriores ──────────────────────────────────────────────────────────

  /** El anfitrión lleva al grupo del lobby a las zonas exteriores (dentro de casa). */
  private goToTown(m: Member) {
    if (this.phase !== 'lobby') return m.peer?.send({ type: 'rejected', reason: 'Ya habéis salido de la sala de espera.' });
    if (!m.isHost) return m.peer?.send({ type: 'rejected', reason: 'Solo el anfitrión puede iniciar.' });
    if (this.members.some((x) => !x.species)) return m.peer?.send({ type: 'rejected', reason: 'Todos deben elegir Pokémon.' });
    this.enterTown(this.opts.startPlace ?? START_PLACE);
  }

  /** Todo el grupo aparece junto en un punto de llegada. */
  private enterTown(place: { zoneId: string; entry: string }) {
    this.phase = 'town';
    this.state = null;
    this.pending.clear();
    this.clearTimer();
    const zone = getZone(place.zoneId);
    this.town.clear();
    this.members.forEach((x, i) => {
      const p = entryPoint(zone, place.entry, i);
      this.town.set(x.playerId, { playerId: x.playerId, name: x.name, species: x.species!, zoneId: zone.id, x: p.x, y: p.y, dir: p.dir, moving: false, connected: !!x.peer });
    });
    this.broadcastLobby();
    this.broadcastTown();
  }

  /** Posición enviada por un cliente: se valida que el trayecto desde la última posición no atraviese obstáculos y no supere la distancia máxima. */
  private onTownMove(m: Member, x: unknown, y: unknown, dir: unknown, moving: unknown) {
    if (this.phase !== 'town') return;
    const tp = this.town.get(m.playerId);
    if (!tp) return;
    const zone = getZone(tp.zoneId);
    const ok =
      typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) &&
      Math.hypot(x - tp.x, y - tp.y) <= MAX_TOWN_STEP && canTraverse(zone, tp, { x, y });
    if (!ok) return m.peer?.send({ type: 'town', town: this.townInfo(), correction: true });
    tp.x = Math.round(x * 10) / 10;
    tp.y = Math.round(y * 10) / 10;
    tp.dir = typeof dir === 'number' && dir >= 0 && dir < 8 ? Math.floor(dir) : tp.dir;
    tp.moving = moving === true;
    this.broadcastTown(m);
  }

  /** Un jugador pasa a otra zona por una salida: solo él (cada uno explora a su aire). */
  private onChangeZone(m: Member, exitId: unknown) {
    if (this.phase !== 'town') return m.peer?.send({ type: 'rejected', reason: 'Ahora no puedes cambiar de zona.' });
    const tp = this.town.get(m.playerId);
    if (!tp) return;
    const exit = getZone(tp.zoneId).exits.find((e) => e.id === exitId);
    if (!exit || !exit.enabled || exit.target?.kind !== 'zone') return m.peer?.send({ type: 'rejected', reason: 'Por ahí no se puede ir todavía.' });
    if (!inRect(exit.rect, tp.x, tp.y, 16)) return m.peer?.send({ type: 'town', town: this.townInfo(), correction: true });
    const zone = getZone(exit.target.zoneId);
    const arrivals = [...this.town.values()].filter((p) => p.zoneId === zone.id).length;
    const p = entryPoint(zone, exit.target.entry, arrivals);
    Object.assign(tp, { zoneId: zone.id, x: p.x, y: p.y, dir: p.dir, moving: false });
    this.broadcastTown();
  }

  /** Un jugador entra por una salida activa hacia una mazmorra: va todo el grupo (como en PMD). */
  private onEnterDungeon(m: Member, exitId: unknown) {
    if (this.phase !== 'town') return m.peer?.send({ type: 'rejected', reason: 'No estáis fuera de la mazmorra.' });
    const tp = this.town.get(m.playerId);
    const exit = tp && getZone(tp.zoneId).exits.find((e) => e.id === exitId);
    if (!exit || !exit.enabled || exit.target?.kind !== 'dungeon') return m.peer?.send({ type: 'rejected', reason: 'Por ahí no se puede ir todavía.' });
    if (!tp || !inRect(exit.rect, tp.x, tp.y, 16)) return m.peer?.send({ type: 'rejected', reason: 'Acércate a la salida.' });
    this.startExpedition(exit.target.dungeonId);
  }

  /** Tras terminar una expedición, el grupo vuelve a la Encrucijada. */
  private onReturnToTown(m: Member) {
    if (this.phase === 'town') return this.broadcastTown();
    if (this.phase !== 'expedition' || !this.state?.result)
      return m.peer?.send({ type: 'rejected', reason: 'La expedición aún no ha terminado.' });
    this.enterTown(RETURN_PLACE);
  }

  townInfo(): TownInfo {
    return { players: [...this.town.values()].map((p) => ({ ...p })) };
  }

  /** Difunde las posiciones (a todos menos a "except", que ya conoce su propia posición). */
  private broadcastTown(except?: Member) {
    const msg: ServerMessage = { type: 'town', town: this.townInfo() };
    for (const x of this.members) if (x !== except) x.peer?.send(msg);
  }

  // ── Expedición ─────────────────────────────────────────────────────────

  private startExpedition(dungeonId: string) {
    this.phase = 'expedition';
    const { state, events } = createExpedition({
      dungeonId,
      seed: this.opts.seed ?? randomBytes(4).readUInt32LE(0),
      coop: true,
      party: this.members.map((x) => ({ playerId: x.playerId, name: x.name, species: x.species! })),
    });
    this.state = state;
    for (const x of this.members) {
      if (!x.peer) {
        const slot = state.players.find((p) => p.playerId === x.playerId)!;
        slot.connected = false;
        setController(state, slot.entityId, 'ai');
      }
    }
    this.broadcastLobby();
    this.broadcastState(events);
  }

  // ── Turnos ─────────────────────────────────────────────────────────────

  /**
   * Jugadores que pueden actuar ahora. En exploración, todos los vivos y
   * conectados (cada uno a su ritmo); en combate, los que aún no han elegido.
   */
  waitingFor(): string[] {
    if (!this.state || this.state.result) return [];
    if (currentMode(this.state) === 'explore') {
      return this.state.players.filter((p) => p.connected && !getEntity(this.state!, p.entityId)?.fainted).map((p) => p.playerId);
    }
    return this.state.players
      .filter((p) => p.connected && !getEntity(this.state!, p.entityId)?.fainted)
      .map((p) => p.playerId)
      .filter((id) => !this.pending.has(id));
  }

  turnInfo(): TurnInfo {
    return {
      turn: this.state?.turn ?? 0,
      mode: this.state ? currentMode(this.state) : 'explore',
      waitingFor: this.waitingFor(),
      deadline: this.deadlineAt === null ? null : Math.max(0, Math.round((this.deadlineAt - this.now()) / 1000)),
    };
  }

  private onAction(m: Member, turn: number, seq: number, action: Action) {
    const state = this.state;
    if (!state) return m.peer?.send({ type: 'rejected', reason: 'La expedición no ha empezado.' });
    if (typeof seq !== 'number' || !(seq > m.lastSeq)) return m.peer?.send({ type: 'rejected', reason: 'Acción duplicada.', seq });
    const mode = currentMode(state);
    // En combate todos deciden sobre el mismo turno; en exploración el estado
    // cambia con las acciones del compañero, así que no se exige coincidencia.
    if (mode === 'tactical' && turn !== state.turn) return m.peer?.send({ type: 'rejected', reason: 'Turno desfasado.', seq });
    const slot = state.players.find((p) => p.playerId === m.playerId)!;
    const entity = getEntity(state, slot.entityId);
    const v = validateAction(state, entity, action);
    if (!v.ok) return m.peer?.send({ type: 'rejected', reason: v.reason, seq });

    if (!TURN_COST[action.type]) {
      const r = applyFreeAction(state, slot.entityId, action);
      if (r.rejected) return m.peer?.send({ type: 'rejected', reason: r.rejected.reason, seq });
      m.lastSeq = seq;
      this.broadcastState(r.events);
      return m.peer?.send({ type: 'ack', seq });
    }

    if (mode === 'explore') {
      const r = resolveExploreAction(state, slot.entityId, action);
      if (r.rejected) return m.peer?.send({ type: 'rejected', reason: r.rejected.reason, seq });
      m.lastSeq = seq;
      this.broadcastState(r.events);
      return m.peer?.send({ type: 'ack', seq });
    }

    if (this.pending.has(m.playerId)) return m.peer?.send({ type: 'rejected', reason: 'Ya has elegido tu acción este turno.', seq });
    m.lastSeq = seq;
    this.pending.set(m.playerId, action);
    if (!this.maybeResolve()) {
      this.armTimer();
      this.broadcast({ type: 'turnInfo', turnInfo: this.turnInfo() });
    }
    m.peer?.send({ type: 'ack', seq });
  }

  /** Resuelve el turno si nadie más tiene que actuar. */
  private maybeResolve(): boolean {
    const state = this.state;
    if (!state || state.result || this.pending.size === 0) return false;
    if (currentMode(state) === 'tactical' && this.waitingFor().length > 0) return false;
    this.resolveNow();
    return true;
  }

  private resolveNow() {
    const state = this.state!;
    this.clearTimer();
    const intents: Record<string, Action> = {};
    for (const [playerId, action] of this.pending) {
      const slot = state.players.find((p) => p.playerId === playerId);
      if (slot && validateAction(state, getEntity(state, slot.entityId), action).ok) intents[slot.entityId] = action;
    }
    this.pending.clear();
    const r = resolveTurn(state, intents);
    this.broadcastState(r.events);
  }

  private armTimer() {
    if (this.timer !== null || !this.opts.turnTimeoutSeconds) return;
    const ms = this.opts.turnTimeoutSeconds * 1000;
    this.deadlineAt = this.now() + ms;
    const set = this.opts.setTimer ?? ((fn, t) => setTimeout(fn, t));
    this.timer = set(() => this.onTimeout(), ms);
  }

  /** Tiempo agotado: los rezagados "esperan" este turno. */
  onTimeout() {
    this.timer = null;
    this.deadlineAt = null;
    if (!this.state || this.state.result) return;
    for (const id of this.waitingFor()) this.pending.set(id, { type: 'wait' });
    this.resolveNow();
  }

  private clearTimer() {
    if (this.timer !== null) (this.opts.clearTimer ?? ((h) => clearTimeout(h as NodeJS.Timeout)))(this.timer);
    this.timer = null;
    this.deadlineAt = null;
  }

  // ── Difusión ───────────────────────────────────────────────────────────

  lobbyInfo(): LobbyInfo {
    return {
      code: this.code,
      dungeonId: this.dungeonId,
      started: this.phase !== 'lobby',
      phase: this.phase,
      players: this.members.map((m) => ({
        playerId: m.playerId,
        name: m.name,
        species: m.species,
        connected: !!m.peer,
        isHost: m.isHost,
      })),
    };
  }

  private broadcastLobby() {
    this.broadcast({ type: 'lobby', lobby: this.lobbyInfo() });
  }

  private broadcastState(events: GameEvent[]) {
    if (!this.state) return;
    this.broadcast({ type: 'state', state: viewForClients(this.state), events, turnInfo: this.turnInfo() });
  }

  private broadcast(msg: ServerMessage) {
    for (const m of this.members) m.peer?.send(msg);
  }

  isEmpty(): boolean {
    return this.members.every((m) => !m.peer);
  }

  dispose() {
    this.clearTimer();
  }
}

export function sanitizeName(name: unknown): string {
  const s = typeof name === 'string' ? name.replace(/[^\p{L}\p{N} _-]/gu, '').trim() : '';
  return (s || 'Explorador').slice(0, 14);
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeCode(exists: (c: string) => boolean): string {
  for (;;) {
    const bytes = randomBytes(5);
    const code = [...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
    if (!exists(code)) return code;
  }
}

export function isKnownDungeon(id: unknown): id is string {
  return typeof id === 'string' && id in DUNGEONS;
}
