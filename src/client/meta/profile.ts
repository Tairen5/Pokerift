/**
 * PROGRESO PERMANENTE (fuera de la expedición).
 * Solo guarda historial, estadísticas y opciones: nada que dé ventaja al
 * empezar una expedición nueva desde nivel 1.
 */
import type { GameState } from '../../shared/engine/state';

export interface ExpeditionRecord {
  date: string;
  dungeonId: string;
  species: string;
  mode: 'solo' | 'online';
  result: 'cleared' | 'defeated';
  floorReached: number;
  level: number;
  enemiesDefeated: number;
  turns: number;
  money: number;
}

export interface Profile {
  name: string;
  lastSpecies: string;
  history: ExpeditionRecord[];
  totals: { expeditions: number; cleared: number; enemiesDefeated: number };
  settings: { animationSpeed: number };
}

const KEY = 'pokerift.profile.v1';

const DEFAULT: Profile = {
  name: '',
  lastSpecies: 'pikachu',
  history: [],
  totals: { expeditions: 0, cleared: 0, enemiesDefeated: 0 },
  settings: { animationSpeed: 1 },
};

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const p = JSON.parse(raw) as Partial<Profile>;
    return { ...structuredClone(DEFAULT), ...p, settings: { ...DEFAULT.settings, ...p.settings }, totals: { ...DEFAULT.totals, ...p.totals } };
  } catch {
    return structuredClone(DEFAULT);
  }
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* almacenamiento no disponible: el juego funciona igual */
  }
}

/** Registra el final de una expedición. Solo copia un resumen, nunca el estado. */
export function recordExpedition(state: GameState, localPlayerId: string, mode: 'solo' | 'online') {
  if (!state.result) return;
  const p = loadProfile();
  const slot = state.players.find((s) => s.playerId === localPlayerId);
  const me = state.entities.find((e) => e.id === slot?.entityId);
  p.history.unshift({
    date: new Date().toISOString(),
    dungeonId: state.dungeonId,
    species: me?.species ?? '?',
    mode,
    result: state.result,
    floorReached: state.floor,
    level: me?.level ?? 1,
    enemiesDefeated: state.stats.enemiesDefeated,
    turns: state.stats.turns,
    money: state.money,
  });
  p.history = p.history.slice(0, 20);
  p.totals.expeditions++;
  if (state.result === 'cleared') p.totals.cleared++;
  p.totals.enemiesDefeated += state.stats.enemiesDefeated;
  saveProfile(p);
}
