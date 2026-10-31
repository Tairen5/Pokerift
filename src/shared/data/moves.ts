/**
 * Catálogo de movimientos. Los valores siguen la ESCALA de Mundo Misterioso
 * (potencias pequeñas que se suman al Ataque en la fórmula de daño), no la de
 * los juegos principales.
 *
 * Con la ROM importada (npm run import:fx, tools/import-pmd-scraper.mjs), la
 * potencia, el tipo, la categoría, los PP, las dos precisiones, los golpes, el
 * crítico, el objetivo y el alcance son los REALES de EoS (waza_p.bin,
 * moves.rom.generated.ts) y se aplican sobre los de aquí. Sin ROM, los de aquí
 * son aproximaciones [INCIERTO]. Los efectos secundarios (estados, fases y sus
 * probabilidades) están en el código del juego, no en la tabla: siguen siendo
 * nuestros [INCIERTO].
 */
import { ROM_MOVE_DATA } from './moves.rom.generated';
import type { PokeType } from './types';
import type { StatusId } from './statuses';

export type MoveCategory = 'physical' | 'special' | 'status';
export type StatStageId = 'atk' | 'def' | 'spAtk' | 'spDef' | 'accuracy' | 'evasion';

/** Patrón de alcance. Ver engine/targeting.ts. */
export type MoveRange =
  | { kind: 'front' } //               casilla de enfrente (sin cortar esquinas)
  | { kind: 'frontCutsCorners' } //    enfrente, ignora la regla de esquinas
  | { kind: 'line'; distance: number } // primer objetivo en línea recta (proyectil)
  | { kind: 'adjacent' } //            las 8 casillas alrededor
  | { kind: 'room' } //                toda la habitación (o radio 2 en pasillo)
  | { kind: 'self' };

/** party = el grupo incluido el usuario (TARGET_PARTY); all = cualquiera menos el usuario. */
export type MoveTargets = 'enemies' | 'allies' | 'party' | 'self' | 'all';

export type MoveEffect =
  | { kind: 'status'; status: StatusId; chance: number; on: 'target' | 'user' }
  | { kind: 'stage'; stat: StatStageId; stages: number; chance: number; on: 'target' | 'user' }
  | { kind: 'healPercent'; percent: number; on: 'target' | 'user' } // % del HP máximo
  | { kind: 'drain'; percent: number }; //                              % del daño causado

export interface MoveData {
  id: string;
  name: string;
  /** null = sin tipo (el ataque normal de EoS no tiene tipo ni STAB). */
  type: PokeType | null;
  category: MoveCategory;
  power: number;
  /**
   * Porcentaje; > 100 significa que esa tirada no puede fallar. En EoS hay dos
   * precisiones y se tiran las dos (MoveHitCheck, pmdsky-debug): accuracy y,
   * si la hay, accuracy2.
   */
  accuracy: number;
  accuracy2?: number;
  /** move_id de Exploradores del Cielo (si se ha importado la ROM). */
  eosMoveId?: number;
  pp: number;
  critChance?: number;
  range: MoveRange;
  targets: MoveTargets;
  hits?: number;
  /** Golpes aleatorios [mín, máx] (Presa: «de 2 a 5 ataques»). [INCIERTO] Reparto uniforme. */
  hitsRange?: [number, number];
  /** Doble daño contra este tipo (Tornado contra Volador, según su descripción en el juego). */
  doubleVsType?: PokeType;
  makesContact?: boolean;
  effects?: MoveEffect[];
}

const front = { kind: 'front' } as const;

const BASE_MOVES: Record<string, MoveData> = {
  regularAttack: {
    id: 'regularAttack', name: 'Ataque', type: null, category: 'physical',
    power: 1, accuracy: 88, pp: 0, range: front, targets: 'enemies', makesContact: true,
  },
  tackle: {
    id: 'tackle', name: 'Placaje', type: 'normal', category: 'physical',
    power: 4, accuracy: 88, pp: 25, range: front, targets: 'enemies', makesContact: true,
  },
  pound: {
    id: 'pound', name: 'Destructor', type: 'normal', category: 'physical',
    power: 4, accuracy: 88, pp: 25, range: front, targets: 'enemies', makesContact: true,
  },
  mudSlap: {
    id: 'mudSlap', name: 'Bofetón Lodo', type: 'ground', category: 'special',
    power: 4, accuracy: 88, pp: 15, range: front, targets: 'enemies',
    effects: [{ kind: 'stage', stat: 'accuracy', stages: -1, chance: 100, on: 'target' }],
  },
  scratch: {
    id: 'scratch', name: 'Arañazo', type: 'normal', category: 'physical',
    power: 4, accuracy: 88, pp: 25, range: front, targets: 'enemies', makesContact: true,
  },
  quickAttack: {
    id: 'quickAttack', name: 'Ataque Rápido', type: 'normal', category: 'physical',
    power: 4, accuracy: 90, pp: 20, range: front, targets: 'enemies', makesContact: true,
  },
  ember: {
    id: 'ember', name: 'Ascuas', type: 'fire', category: 'special',
    power: 5, accuracy: 88, pp: 25, range: front, targets: 'enemies',
    effects: [{ kind: 'status', status: 'burn', chance: 10, on: 'target' }],
  },
  waterGun: {
    id: 'waterGun', name: 'Pistola Agua', type: 'water', category: 'special',
    power: 5, accuracy: 88, pp: 25, range: { kind: 'line', distance: 10 }, targets: 'enemies',
  },
  vineWhip: {
    id: 'vineWhip', name: 'Látigo Cepa', type: 'grass', category: 'physical',
    power: 5, accuracy: 88, pp: 25, range: front, targets: 'enemies', makesContact: true,
  },
  razorLeaf: {
    id: 'razorLeaf', name: 'Hoja Afilada', type: 'grass', category: 'physical',
    power: 5, accuracy: 85, pp: 20, critChance: 25, range: { kind: 'frontCutsCorners' }, targets: 'enemies',
  },
  thunderShock: {
    id: 'thunderShock', name: 'Impactrueno', type: 'electric', category: 'special',
    power: 5, accuracy: 88, pp: 25, range: front, targets: 'enemies',
    effects: [{ kind: 'status', status: 'paralysis', chance: 10, on: 'target' }],
  },
  poisonSting: {
    id: 'poisonSting', name: 'Picotazo Ven.', type: 'poison', category: 'physical',
    power: 3, accuracy: 88, pp: 30, range: front, targets: 'enemies',
    // 18 %: POISON_STING_POISON_CHANCE (overlay10, leído de la ROM).
    effects: [{ kind: 'status', status: 'poison', chance: 18, on: 'target' }],
  },
  peck: {
    id: 'peck', name: 'Picotazo', type: 'flying', category: 'physical',
    power: 4, accuracy: 88, pp: 30, range: front, targets: 'enemies', makesContact: true,
  },
  gust: {
    id: 'gust', name: 'Tornado', type: 'flying', category: 'special',
    power: 4, accuracy: 88, pp: 25, range: { kind: 'line', distance: 10 }, targets: 'enemies', doubleVsType: 'flying',
  },
  bite: {
    id: 'bite', name: 'Mordisco', type: 'dark', category: 'physical',
    power: 6, accuracy: 88, pp: 25, range: front, targets: 'enemies', makesContact: true,
    // 20 %: BITE_CRINGE_CHANCE (overlay10, leído de la ROM).
    effects: [{ kind: 'status', status: 'cringe', chance: 20, on: 'target' }],
  },
  absorb: {
    id: 'absorb', name: 'Absorber', type: 'grass', category: 'special',
    power: 4, accuracy: 88, pp: 25, range: front, targets: 'enemies',
    effects: [{ kind: 'drain', percent: 50 }],
  },
  growl: {
    id: 'growl', name: 'Gruñido', type: 'normal', category: 'status',
    power: 0, accuracy: 101, pp: 30, range: { kind: 'room' }, targets: 'enemies',
    effects: [{ kind: 'stage', stat: 'atk', stages: -1, chance: 100, on: 'target' }],
  },
  tailWhip: {
    id: 'tailWhip', name: 'Látigo', type: 'normal', category: 'status',
    power: 0, accuracy: 101, pp: 30, range: { kind: 'room' }, targets: 'enemies',
    effects: [{ kind: 'stage', stat: 'def', stages: -1, chance: 100, on: 'target' }],
  },
  leer: {
    id: 'leer', name: 'Malicioso', type: 'normal', category: 'status',
    power: 0, accuracy: 101, pp: 30, range: { kind: 'room' }, targets: 'enemies',
    effects: [{ kind: 'stage', stat: 'def', stages: -1, chance: 100, on: 'target' }],
  },
  sandAttack: {
    id: 'sandAttack', name: 'Ataque Arena', type: 'ground', category: 'status',
    power: 0, accuracy: 88, pp: 20, range: front, targets: 'enemies',
    effects: [{ kind: 'stage', stat: 'accuracy', stages: -1, chance: 100, on: 'target' }],
  },
  stringShot: {
    id: 'stringShot', name: 'Disparo Demora', type: 'bug', category: 'status',
    power: 0, accuracy: 88, pp: 25, range: front, targets: 'enemies',
    // En EoS baja la velocidad de movimiento (descripción del juego), no la evasión.
    effects: [{ kind: 'status', status: 'slowed', chance: 100, on: 'target' }],
  },
  harden: {
    id: 'harden', name: 'Fortaleza', type: 'normal', category: 'status',
    power: 0, accuracy: 101, pp: 30, range: { kind: 'self' }, targets: 'self',
    effects: [{ kind: 'stage', stat: 'def', stages: 1, chance: 100, on: 'user' }],
  },
  sing: {
    id: 'sing', name: 'Canto', type: 'normal', category: 'status',
    power: 0, accuracy: 55, pp: 15, range: front, targets: 'enemies',
    effects: [{ kind: 'status', status: 'sleep', chance: 100, on: 'target' }],
  },
  confusion: {
    id: 'confusion', name: 'Confusión', type: 'psychic', category: 'special',
    power: 5, accuracy: 88, pp: 25, range: front, targets: 'enemies',
    effects: [{ kind: 'status', status: 'confusion', chance: 10, on: 'target' }],
  },
  smokescreen: {
    id: 'smokescreen', name: 'Pantalla Humo', type: 'normal', category: 'status',
    power: 0, accuracy: 88, pp: 20, range: front, targets: 'enemies',
    // En EoS pone el estado Despiste (descripción del juego), no baja la precisión.
    effects: [{ kind: 'status', status: 'whiffer', chance: 100, on: 'target' }],
  },
  barrage: {
    id: 'barrage', name: 'Presa', type: 'normal', category: 'physical',
    power: 2, accuracy: 85, pp: 20, hits: 2, hitsRange: [2, 5], range: { kind: 'line', distance: 10 }, targets: 'enemies',
  },
  hypnosis: {
    id: 'hypnosis', name: 'Hipnosis', type: 'psychic', category: 'status',
    power: 0, accuracy: 60, pp: 20, range: front, targets: 'enemies',
    effects: [{ kind: 'status', status: 'sleep', chance: 100, on: 'target' }],
  },
  growth: {
    id: 'growth', name: 'Desarrollo', type: 'normal', category: 'status',
    power: 0, accuracy: 101, pp: 20, range: { kind: 'self' }, targets: 'self',
    effects: [{ kind: 'stage', stat: 'spAtk', stages: 1, chance: 100, on: 'user' }],
  },
  furyCutter: {
    id: 'furyCutter', name: 'Corte Furia', type: 'bug', category: 'physical',
    power: 3, accuracy: 85, pp: 20, range: front, targets: 'enemies', makesContact: true,
  },

  // ── Movimientos de los enemigos de la expedición (Cueva Bajamar … Manzanar) ──
  // Tipo, categoría, potencia, precisión, PP, alcance y golpes salen de la ROM (moves.rom.generated);
  // aquí, el nombre en español y el efecto según su descripción en el juego (text_e.str 10145 + id).
  // Probabilidades [VERIFICADO] en overlay10: CONSTRICT_LOWER_SPEED_CHANCE 20, BUBBLE_LOWER_SPEED_CHANCE 10,
  // ACID_PSYCHIC_LOWER_DEFENSE_CHANCE 20.
  astonish: {
    id: 'astonish', name: 'Impresionar', type: 'ghost', category: 'physical', power: 6, accuracy: 100, pp: 15, range: front, targets: 'enemies',
    // [INCIERTO] Probabilidad de amedrentar (no se ha localizado su constante).
    effects: [{ kind: 'status', status: 'cringe', chance: 30, on: 'target' }],
  },
  constrict: {
    id: 'constrict', name: 'Restricción', type: 'normal', category: 'physical', power: 2, accuracy: 88, pp: 25, range: front, targets: 'enemies',
    effects: [{ kind: 'status', status: 'slowed', chance: 20, on: 'target' }],
  },
  wrap: {
    id: 'wrap', name: 'Constricción', type: 'normal', category: 'physical', power: 0, accuracy: 100, pp: 15, range: front, targets: 'enemies',
    // [INCIERTO] Simplificado: en el juego atrapa a los dos (estados Wrap/Wrapped) y daña cada pocos
    // turnos; aquí el objetivo pierde su siguiente turno.
    effects: [{ kind: 'status', status: 'cringe', chance: 100, on: 'target' }],
  },
  lowKick: {
    id: 'lowKick', name: 'Patada Baja', type: 'fighting', category: 'physical', power: 7, accuracy: 100, pp: 15, range: front, targets: 'enemies',
    // [INCIERTO] En el juego hace más daño cuanto más pesa el objetivo; aquí, potencia fija.
  },
  defenseCurl: {
    id: 'defenseCurl', name: 'Rizo Defensa', type: 'normal', category: 'status', power: 0, accuracy: 101, pp: 30, range: { kind: 'self' }, targets: 'self',
    effects: [{ kind: 'stage', stat: 'def', stages: 1, chance: 100, on: 'user' }],
  },
  scaryFace: {
    id: 'scaryFace', name: 'Cara Susto', type: 'normal', category: 'status', power: 0, accuracy: 70, pp: 10, range: front, targets: 'enemies',
    effects: [{ kind: 'status', status: 'slowed', chance: 100, on: 'target' }],
  },
  wingAttack: {
    id: 'wingAttack', name: 'Ataque Ala', type: 'flying', category: 'physical', power: 6, accuracy: 100, pp: 25, range: front, targets: 'enemies',
  },
  bubble: {
    id: 'bubble', name: 'Burbuja', type: 'water', category: 'special', power: 4, accuracy: 95, pp: 25, range: front, targets: 'enemies',
    effects: [{ kind: 'status', status: 'slowed', chance: 10, on: 'target' }],
  },
  poisonGas: {
    id: 'poisonGas', name: 'Gas Venenoso', type: 'poison', category: 'status', power: 0, accuracy: 88, pp: 20, range: front, targets: 'enemies',
    effects: [{ kind: 'status', status: 'poison', chance: 100, on: 'target' }],
  },
  sleepPowder: {
    id: 'sleepPowder', name: 'Somnífero', type: 'grass', category: 'status', power: 0, accuracy: 80, pp: 15, range: front, targets: 'enemies',
    effects: [{ kind: 'status', status: 'sleep', chance: 100, on: 'target' }],
  },
  mudShot: {
    id: 'mudShot', name: 'Disparo Lodo', type: 'ground', category: 'special', power: 12, accuracy: 100, pp: 15, range: front, targets: 'enemies',
    effects: [{ kind: 'status', status: 'slowed', chance: 100, on: 'target' }],
  },
  zenHeadbutt: {
    id: 'zenHeadbutt', name: 'Cabezazo Zen', type: 'psychic', category: 'physical', power: 15, accuracy: 100, pp: 15, range: front, targets: 'enemies',
    // [INCIERTO] Probabilidad de amedrentar.
    effects: [{ kind: 'status', status: 'cringe', chance: 20, on: 'target' }],
  },
  stunSpore: {
    id: 'stunSpore', name: 'Paralizador', type: 'grass', category: 'status', power: 0, accuracy: 88, pp: 20, range: front, targets: 'enemies',
    effects: [{ kind: 'status', status: 'paralysis', chance: 100, on: 'target' }],
  },
  poisonPowder: {
    id: 'poisonPowder', name: 'Polvo Veneno', type: 'poison', category: 'status', power: 0, accuracy: 100, pp: 20, range: front, targets: 'enemies',
    effects: [{ kind: 'status', status: 'poison', chance: 100, on: 'target' }],
  },
  sweetScent: {
    id: 'sweetScent', name: 'Dulce Aroma', type: 'normal', category: 'status', power: 0, accuracy: 100, pp: 20, range: { kind: 'room' }, targets: 'enemies',
    effects: [{ kind: 'stage', stat: 'evasion', stages: -1, chance: 100, on: 'target' }],
  },
  acid: {
    id: 'acid', name: 'Ácido', type: 'poison', category: 'special', power: 8, accuracy: 100, pp: 20, range: front, targets: 'enemies',
    // La descripción dice Defensa Especial (la constante de overlay10 se llama «…LOWER_DEFENSE»).
    effects: [{ kind: 'stage', stat: 'spDef', stages: -1, chance: 20, on: 'target' }],
  },
  leechLife: {
    id: 'leechLife', name: 'Chupavidas', type: 'bug', category: 'physical', power: 4, accuracy: 100, pp: 15, range: front, targets: 'enemies',
    // [INCIERTO] Proporción del daño que recupera (como Absorber).
    effects: [{ kind: 'drain', percent: 50 }],
  },
  synthesis: {
    id: 'synthesis', name: 'Síntesis', type: 'grass', category: 'status', power: 0, accuracy: 101, pp: 10, range: { kind: 'self' }, targets: 'self',
    // [INCIERTO] En el juego depende del tiempo (SYNTHESIS_HP_RESTORATION_TABLE); sin clima, la mitad.
    effects: [{ kind: 'healPercent', percent: 50, on: 'user' }],
  },
  ingrain: {
    id: 'ingrain', name: 'Arraigo', type: 'grass', category: 'status', power: 0, accuracy: 101, pp: 20, range: { kind: 'self' }, targets: 'self',
    // [INCIERTO] Simplificado: en el juego no deja moverse y regenera PS cada pocos turnos.
    effects: [{ kind: 'healPercent', percent: 25, on: 'user' }],
  },
  stomp: {
    id: 'stomp', name: 'Pisotón', type: 'normal', category: 'physical', power: 12, accuracy: 100, pp: 20, range: front, targets: 'enemies',
    // [INCIERTO] Probabilidad de amedrentar.
    effects: [{ kind: 'status', status: 'cringe', chance: 30, on: 'target' }],
  },
  seedBomb: {
    id: 'seedBomb', name: 'Bomba Germen', type: 'grass', category: 'physical', power: 16, accuracy: 100, pp: 15, range: front, targets: 'enemies',
  },
  furyAttack: {
    id: 'furyAttack', name: 'Ataque Furia', type: 'normal', category: 'physical', power: 1, accuracy: 80, pp: 20, range: front, targets: 'enemies',
    hitsRange: [2, 5],
  },
  bugBite: {
    id: 'bugBite', name: 'Picadura', type: 'bug', category: 'physical', power: 11, accuracy: 100, pp: 20, range: front, targets: 'enemies',
    // [INCIERTO] Sin robar bayas al objetivo (no lleva objetos).
  },
  // Sin efecto todavía (no hay la mecánica): estados de suelo, enfoque, protección, etc.
  mudSport: { id: 'mudSport', name: 'Chapoteo Lodo', type: 'ground', category: 'status', power: 0, accuracy: 101, pp: 15, range: { kind: 'self' }, targets: 'self' },
  waterSport: { id: 'waterSport', name: 'Hidrochorro', type: 'water', category: 'status', power: 0, accuracy: 101, pp: 15, range: { kind: 'self' }, targets: 'self' },
  focusEnergy: { id: 'focusEnergy', name: 'Foco Energía', type: 'normal', category: 'status', power: 0, accuracy: 101, pp: 30, range: { kind: 'self' }, targets: 'self' },
  naturePower: { id: 'naturePower', name: 'Adaptación', type: 'normal', category: 'status', power: 0, accuracy: 101, pp: 20, range: { kind: 'self' }, targets: 'self' },
  mist: { id: 'mist', name: 'Neblina', type: 'ice', category: 'status', power: 0, accuracy: 101, pp: 30, range: { kind: 'self' }, targets: 'self' },
  splash: { id: 'splash', name: 'Salpicadura', type: 'normal', category: 'status', power: 0, accuracy: 101, pp: 40, range: { kind: 'self' }, targets: 'self' },
  protect: { id: 'protect', name: 'Protección', type: 'normal', category: 'status', power: 0, accuracy: 75, pp: 10, range: { kind: 'self' }, targets: 'self' },
};

/** Movimientos que de momento no hacen nada (falta su mecánica): la IA no los elige. */
export const NO_EFFECT_MOVES = new Set(['mudSport', 'waterSport', 'focusEnergy', 'naturePower', 'mist', 'splash', 'protect']);

/** Catálogo final: los valores reales de la ROM (si se ha importado) sobre los provisionales. */
export const MOVES: Record<string, MoveData> = Object.fromEntries(
  Object.entries(BASE_MOVES).map(([id, m]) => {
    const rom = ROM_MOVE_DATA[id];
    // El ataque normal no gasta PP en el juego (la tabla le da 17): se mantienen ilimitados.
    // Los de potencia 0 en la ROM (Constricción) no hacen daño directo: se tratan como de estado.
    return [id, { ...m, ...rom, ...(rom && id === 'regularAttack' ? { pp: m.pp } : {}), ...(rom?.power === 0 ? { category: 'status' as const } : {}) }];
  }),
);

/** ¿Vienen los datos de los movimientos de la ROM? */
export const HAS_ROM_MOVES = Object.keys(ROM_MOVE_DATA).length > 0;

export function getMove(id: string): MoveData {
  const m = MOVES[id];
  if (!m) throw new Error(`Movimiento desconocido: ${id}`);
  return m;
}
