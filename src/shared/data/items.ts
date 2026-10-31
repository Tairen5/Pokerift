/**
 * Objetos. Los efectos son datos; engine/items.ts los interpreta.
 * Valores de EoS [VERIFICADO] (Mystery Dungeon Wiki, Serebii; pmdsky-debug):
 * Manzana +50 de Barriga (+5 a la máxima si está llena), Manzana Grande +100 (+10),
 * Baya Aranja 100 PS y +5 de Barriga, Semilla Explosiva +5 de Barriga, Máx. Elixir
 * todos los PP (MAX_ELIXIR_PP_RESTORATION = 999). El resto se indica en cada objeto.
 */
import type { StatusId } from './statuses';

export type ItemEffect =
  | { kind: 'heal'; amount: number } //                   Baya Aranja: 100 HP en EoS
  | { kind: 'belly'; amount: number; raiseMaxIfFull?: number }
  | { kind: 'cureStatus'; statuses: StatusId[] | 'all' }
  | { kind: 'restorePP'; amount: number | 'full' }
  | { kind: 'revive' } //                                 pasivo: Semilla Revivir
  | { kind: 'damageFront'; amount: number } //            Semilla Explosiva
  | { kind: 'money' };

export interface ItemData {
  id: string;
  name: string;
  description: string;
  category: 'food' | 'berry' | 'seed' | 'drink' | 'money' | 'other';
  effect: ItemEffect;
  /** Barriga que llena además de su efecto (bayas y semillas: «llena un poco la Barriga»). */
  belly?: number;
  /** Se consume automáticamente al caer debilitado (Semilla Revivir). */
  autoOnFaint?: boolean;
  color: string;
}

export const ITEMS: Record<string, ItemData> = {
  apple: {
    id: 'apple', name: 'Manzana', description: 'Llena 50 de Barriga.', category: 'food',
    effect: { kind: 'belly', amount: 50, raiseMaxIfFull: 5 }, color: '#e03030',
  },
  bigApple: {
    id: 'bigApple', name: 'Manzana Grande', description: 'Llena 100 de Barriga.', category: 'food',
    effect: { kind: 'belly', amount: 100, raiseMaxIfFull: 10 }, color: '#c01818',
  },
  oranBerry: {
    id: 'oranBerry', name: 'Baya Aranja', description: 'Restaura 100 HP.', category: 'berry',
    effect: { kind: 'heal', amount: 100 }, belly: 5, color: '#3070e0',
  },
  pechaBerry: {
    id: 'pechaBerry', name: 'Baya Meloc', description: 'Cura el envenenamiento.', category: 'berry',
    // [INCIERTO] +5 de Barriga: la wiki solo dice que «llena un poco» (igual que la Aranja, que sí da +5).
    effect: { kind: 'cureStatus', statuses: ['poison'] }, belly: 5, color: '#f090c0',
  },
  cheriBerry: {
    id: 'cheriBerry', name: 'Baya Zreza', description: 'Cura la parálisis.', category: 'berry',
    effect: { kind: 'cureStatus', statuses: ['paralysis'] }, belly: 5, color: '#e04060',
  },
  rawstBerry: {
    id: 'rawstBerry', name: 'Baya Safre', description: 'Cura las quemaduras.', category: 'berry',
    effect: { kind: 'cureStatus', statuses: ['burn'] }, belly: 5, color: '#60c0a0',
  },
  healSeed: {
    id: 'healSeed', name: 'Semilla Cura', description: 'Cura todos los estados.', category: 'seed',
    effect: { kind: 'cureStatus', statuses: 'all' }, belly: 5, color: '#80e080', // [INCIERTO] +5 de Barriga
  },
  reviverSeed: {
    id: 'reviverSeed', name: 'Semilla Revivir', description: 'Revive automáticamente al caer.', category: 'seed',
    effect: { kind: 'revive' }, autoOnFaint: true, color: '#f0e060',
  },
  blastSeed: {
    // Alcanza a cualquier Pokémon de enfrente, aliado o enemigo (Mystery Dungeon Wiki). [INCIERTO] El daño:
    // el juego lo carga de una tabla (ApplyBlastSeedEffect, pmdsky-debug) y no hay fuente con la cifra.
    id: 'blastSeed', name: 'Semilla Explosiva', description: 'Daña al Pokémon de enfrente.', category: 'seed',
    effect: { kind: 'damageFront', amount: 25 }, belly: 5, color: '#f07020',
  },
  maxElixir: {
    id: 'maxElixir', name: 'Máx. Elixir', description: 'Restaura todos los PP.', category: 'drink',
    effect: { kind: 'restorePP', amount: 'full' }, color: '#a060e0',
  },
  poke: {
    id: 'poke', name: 'Poké', description: 'Dinero.', category: 'money',
    effect: { kind: 'money' }, color: '#f0c000',
  },
};

export function getItem(id: string): ItemData {
  const it = ITEMS[id];
  if (!it) throw new Error(`Objeto desconocido: ${id}`);
  return it;
}
