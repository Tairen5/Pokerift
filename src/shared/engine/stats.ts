/**
 * Estadísticas, curva de experiencia y subida de nivel.
 * Usa la tabla por nivel de la especie si existe (formato m_level.bin);
 * si no, una tasa media provisional.
 */
import { type SpeciesData, type Stats, getSpecies } from '../data/species';
import { type StatStageId, getMove } from '../data/moves';
import type { Entity } from './state';
import type { EventLog } from './events';

export const MAX_LEVEL = 100;
const STAT_KEYS: (keyof Stats)[] = ['hp', 'atk', 'spAtk', 'def', 'spDef'];

export function statsAtLevel(sp: SpeciesData, level: number): Stats {
  if (sp.growth.kind === 'table') {
    const out = { ...sp.baseStats };
    for (let l = 2; l <= level; l++) {
      const row = sp.growth.rows[l - 1];
      if (!row) break;
      for (const k of STAT_KEYS) out[k] += row[k];
    }
    return out;
  }
  const g = sp.growth.perLevel;
  const out = { ...sp.baseStats };
  for (const k of STAT_KEYS) out[k] += Math.floor(g[k] * (level - 1));
  return out;
}

/**
 * Experiencia total necesaria para alcanzar `level`.
 * [INCIERTO] Curva provisional (cúbica) hasta disponer de m_level.bin.
 */
export function expForLevel(sp: SpeciesData, level: number): number {
  if (level <= 1) return 0;
  if (sp.growth.kind === 'table') return sp.growth.rows[level - 1]?.exp ?? Infinity;
  return level ** 3 - 1;
}

/**
 * Experiencia que concede un enemigo derrotado.
 * [INCIERTO] EoS escala la exp base de la especie con el nivel del enemigo.
 */
export function expYield(sp: SpeciesData, level: number): number {
  return sp.baseExp + Math.floor((sp.baseExp * (level - 1)) / 10);
}

/** Concede experiencia y aplica todas las subidas de nivel pendientes. */
export function grantExp(e: Entity, amount: number, log: EventLog): void {
  const sp = getSpecies(e.species);
  if (e.level >= MAX_LEVEL || amount <= 0) return;
  e.exp += amount;
  log.push({ t: 'exp', id: e.id, amount });
  log.msg(`${e.name} gana ${amount} Ptos. Exp.`);
  while (e.level < MAX_LEVEL && e.exp >= expForLevel(sp, e.level + 1)) {
    levelUp(e, sp, log);
  }
}

function levelUp(e: Entity, sp: SpeciesData, log: EventLog): void {
  const before = statsAtLevel(sp, e.level);
  e.level++;
  const after = statsAtLevel(sp, e.level);
  const hpGain = after.hp - before.hp;
  e.stats = after;
  e.maxHp = after.hp;
  e.hp = Math.min(e.maxHp, e.hp + hpGain);
  log.push({ t: 'levelUp', id: e.id, level: e.level });
  log.msg(`¡${e.name} sube al Nv. ${e.level}!`);
  for (const entry of sp.learnset) {
    if (entry.level !== e.level || e.moves.some((m) => m.id === entry.move)) continue;
    if (e.moves.length < 4) {
      e.moves.push(makeMoveSlot(entry.move));
      log.push({ t: 'learn', id: e.id, move: entry.move });
      log.msg(`¡${e.name} ha aprendido ${moveName(entry.move)}!`);
    }
  }
}

function moveName(id: string) {
  return getMove(id).name;
}

export function makeMoveSlot(id: string) {
  const m = getMove(id);
  return { id, pp: m.pp, maxPp: m.pp };
}

/** Movimientos que conoce una especie a cierto nivel (los 4 más recientes). */
export function movesAtLevel(sp: SpeciesData, level: number): string[] {
  const learned = sp.learnset.filter((l) => l.level <= level).map((l) => l.move);
  return [...new Set(learned)].slice(-4);
}

export const NEUTRAL_STAGES: Record<StatStageId, number> = { atk: 0, def: 0, spAtk: 0, spDef: 0, accuracy: 0, evasion: 0 };
export const STAGE_MIN = -10;
export const STAGE_MAX = 10;

/**
 * Multiplicador de etapa. EoS usa etapas 0–20 (10 = neutral) con tablas
 * propias (OFFENSIVE/DEFENSIVE_STAT_STAGE_MULTIPLIERS).
 * [INCIERTO] Aproximación: +25 % por etapa positiva, inversa para negativas.
 */
export function stageMultiplier(stage: number): number {
  return stage >= 0 ? 1 + 0.25 * stage : 1 / (1 + 0.25 * -stage);
}
