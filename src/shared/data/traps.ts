/**
 * Trampas. En PMD las trampas están ocultas hasta que alguien las pisa, y los
 * enemigos no las activan. [INCIERTO] cantidades de daño/duración.
 */
import type { StatusId } from './statuses';
import type { StatStageId } from './moves';

export type TrapEffect =
  | { kind: 'warp' }
  | { kind: 'status'; status: StatusId }
  | { kind: 'damage'; amount: number }
  | { kind: 'stage'; stat: StatStageId; stages: number }
  | { kind: 'summon'; count: number }
  | { kind: 'pitfall' }
  | { kind: 'resetStages' };

export interface TrapData {
  id: string;
  name: string;
  effect: TrapEffect;
  color: string;
  weight: number;
  /** Se ve desde el principio (no está oculta como las trampas). */
  visible?: boolean;
}

export const TRAPS: Record<string, TrapData> = {
  warpTrap: { id: 'warpTrap', name: 'Trampa Teletransporte', effect: { kind: 'warp' }, color: '#60a0ff', weight: 3 },
  slumberTrap: { id: 'slumberTrap', name: 'Trampa Sueño', effect: { kind: 'status', status: 'sleep' }, color: '#9090c0', weight: 2 },
  poisonTrap: { id: 'poisonTrap', name: 'Trampa Veneno', effect: { kind: 'status', status: 'poison' }, color: '#a040c0', weight: 2 },
  spinTrap: { id: 'spinTrap', name: 'Trampa Giro', effect: { kind: 'status', status: 'confusion' }, color: '#e070c0', weight: 2 },
  chestnutTrap: { id: 'chestnutTrap', name: 'Trampa Castaña', effect: { kind: 'damage', amount: 10 }, color: '#a06030', weight: 2 },
  mudTrap: { id: 'mudTrap', name: 'Trampa Barro', effect: { kind: 'stage', stat: 'def', stages: -1 }, color: '#806040', weight: 2 },
  summonTrap: { id: 'summonTrap', name: 'Trampa Invocación', effect: { kind: 'summon', count: 2 }, color: '#e04040', weight: 1 },
  pitfallTrap: { id: 'pitfallTrap', name: 'Trampa Hoyo', effect: { kind: 'pitfall' }, color: '#303030', weight: 1 },
  // [VERIFICADO] text_e.str 16335: «a ground tile with a green arrow. It's called a Wonder Tile. Step on it to
  // heal any stat changes.» Se ve en el suelo y no desaparece. Peso 0: solo aparece si la mazmorra la incluye.
  wonderTile: { id: 'wonderTile', name: 'Casilla Maravilla', effect: { kind: 'resetStages' }, color: '#40c060', weight: 0, visible: true },
};

export function getTrap(id: string): TrapData {
  const t = TRAPS[id];
  if (!t) throw new Error(`Trampa desconocida: ${id}`);
  return t;
}
