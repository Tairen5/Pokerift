/**
 * Habilidades. Solo se implementan las relevantes para el contenido actual;
 * el resto existen como datos sin efecto (documentado en el README).
 * [INCIERTO] Umbrales y probabilidades exactas de EoS.
 */
import { chance, type RngState } from '../core/rng';
import type { MoveData } from '../data/moves';
import type { Entity } from './state';

const PINCH_ABILITIES: Record<string, string> = {
  overgrow: 'grass',
  blaze: 'fire',
  torrent: 'water',
  swarm: 'bug',
};

export const ABILITY_NAMES: Record<string, string> = {
  overgrow: 'Espesura', blaze: 'Mar Llamas', torrent: 'Torrente', swarm: 'Enjambre',
  static: 'Elec. Estática', keenEye: 'Vista Lince', runAway: 'Fuga', shieldDust: 'Polvo Escudo',
  chlorophyll: 'Clorofila', shedSkin: 'Mudar', pickup: 'Recogida',
  // Sin efecto aún (las tienen nuestras especies según monster.md):
  solarPower: 'Poder Solar', tangledFeet: 'Tumbos', technician: 'Experto',
  stench: 'Hedor', rainDish: 'Cura Lluvia', rockHead: 'Cabeza Roca', battleArmor: 'Armadura Batalla', sturdy: 'Robustez',
  suctionCups: 'Ventosas', guts: 'Agallas', shellArmor: 'Caparazón', naturalCure: 'Cura Natural', damp: 'Humedad',
  swiftSwim: 'Nado Rápido', waterAbsorb: 'Absorbe Agua', poisonPoint: 'Punto Tóxico', oblivious: 'Despiste', stickyHold: 'Viscosidad',
  cloudNine: 'Aclimatación', earlyBird: 'Madrugar', hustle: 'Entusiasmo', compoundeyes: 'Ojo Compuesto', insomnia: 'Insomnio',
  levitate: 'Levitación', effectSpore: 'Efecto Espora', drySkin: 'Piel Seca', anticipation: 'Anticipación', skillLink: 'Encadenado',
  rivalry: 'Rivalidad', noGuard: 'Indefenso', honeyGather: 'Recogemiel', stormDrain: 'Colector', leafGuard: 'Defensa Hoja',
};

/** Espesura/Mar Llamas/Torrente/Enjambre: ×1,5 con HP ≤ 1/4. */
export function abilityDamageMultiplier(attacker: Entity, move: MoveData): number {
  for (const ab of attacker.abilities) {
    const type = PINCH_ABILITIES[ab];
    if (type && move.type === type && attacker.hp * 4 <= attacker.maxHp) return 1.5;
  }
  return 1;
}

/** Polvo Escudo bloquea los efectos secundarios de los movimientos. */
export function blocksSecondaryEffects(target: Entity): boolean {
  return target.abilities.includes('shieldDust');
}

/** Vista Lince impide que baje la precisión. */
export function blocksStageDrop(target: Entity, stat: string): boolean {
  return stat === 'accuracy' && target.abilities.includes('keenEye');
}

/** Elec. Estática: puede paralizar a quien golpea por contacto. */
export function contactParalysis(defender: Entity, move: MoveData, rng: RngState): boolean {
  return !!move.makesContact && defender.abilities.includes('static') && chance(rng, 30);
}
