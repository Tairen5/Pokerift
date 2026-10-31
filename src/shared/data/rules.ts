/**
 * Reglas configurables del motor. Todo lo que difiere entre Equipo de Rescate
 * Azul (RT) y Exploradores del Cielo (EoS) debe vivir aquí y no en el código.
 *
 * Marcadores en comentarios:
 *   [VERIFICADO]  contrastado con fuente técnica (pmdsky-debug, guías de mecánicas).
 *   [INCIERTO]    valor razonable pendiente de verificar; cambiarlo aquí basta.
 */
import type { FloorGenRules } from '../dungeon/generator';
import type { Matchup } from './types';

export interface Ruleset {
  id: 'sky' | 'blue';
  name: string;

  /** Multiplicadores por categoría de efectividad. */
  matchupMultiplier: Record<Matchup, number>;
  stabMultiplier: number;
  criticalMultiplier: number;
  /** Probabilidad base de crítico (%) si el movimiento no define otra. */
  baseCritChance: number;
  /** Divisor del daño cuando el atacante NO pertenece al equipo del jugador. */
  nonTeamDamageDivisor: number;
  /** Rango del multiplicador aleatorio: (R + randomMin) / 65536, R ∈ [0, randomSpan). */
  damageRandomMin: number;
  damageRandomSpan: number;
  maxDamage: number;
  burnDamageMultiplier: number;

  /** Las diagonales no pueden "cortar" esquinas de pared (ni al moverse ni al atacar). */
  noCornerCutting: boolean;
  /** Al caminar hacia un compañero se intercambian las posiciones. */
  swapWithTeammates: boolean;

  /** Barriga. */
  bellyMax: number;
  /** Barriga perdida por turno (EoS: 0,1 → 1 punto cada 10 turnos). */
  bellyPerTurn: number;
  /** HP perdidos por turno con la barriga a 0. */
  starvingHpLoss: number;

  /** Turnos aproximados para recuperar todo el HP de forma natural. */
  naturalRegenTurnsForFull: number;

  /** Reparto de experiencia al derrotar a un enemigo. */
  expSharing: 'allMembersFull' | 'defeaterOnly';

  /** Tamaño de la mochila durante la expedición. */
  bagCapacity: number;

  /** Si el líder (en solitario) o todo el equipo humano cae, termina la expedición. */
  defeatWhen: 'leaderFaints' | 'allPlayersFaint';

  /** Turnos por piso antes del aviso/expulsión por viento (Kecleon/viento). */
  floorTurnLimit: number;

  /** Generación de pisos (ver dungeon/generator.ts). */
  floorGen: FloorGenRules;
}

export const SKY_RULES: Ruleset = {
  id: 'sky',
  name: 'Exploradores del Cielo',
  // [VERIFICADO] pmdsky-debug overlay10: MATCHUP_*_MULTIPLIER (punto fijo 8 bits).
  // Poco eficaz = representación más cercana a 1/√2 con 8 bits fraccionarios (181/256);
  // superefectivo = la más cercana a 1,4 (0x166/256).
  matchupMultiplier: { immune: 0.5, notVeryEffective: 181 / 256, neutral: 1, superEffective: 0x166 / 0x100 },
  stabMultiplier: 1.5, // [INCIERTO] mismo valor que la serie principal.
  criticalMultiplier: 1.5, // [INCIERTO]
  baseCritChance: 12, // [INCIERTO] la mayoría de movimientos usan ~12 %.
  // [VERIFICADO] guía de mecánicas de daño de T/D/S: Y = 340/256 para no miembros del equipo.
  nonTeamDamageDivisor: 340 / 256,
  // [VERIFICADO] (R + 57344) / 65536, R entero en [0, 16383].
  damageRandomMin: 57344,
  damageRandomSpan: 16384,
  maxDamage: 999,
  burnDamageMultiplier: 0xcc / 0x100, // [VERIFICADO] BURN_DAMAGE_MULTIPLIER ≈ 0,8.

  noCornerCutting: true, // [VERIFICADO] comportamiento conocido de la saga.
  swapWithTeammates: true,

  bellyMax: 100,
  bellyPerTurn: 0.1, // [VERIFICADO] BELLY_LOST_PER_TURN (pmdsky-debug): 0x199A / 65536 ≈ 0,1.
  starvingHpLoss: 1,
  naturalRegenTurnsForFull: 200, // [INCIERTO] aproximación.

  expSharing: 'allMembersFull', // [INCIERTO] en EoS todo el equipo recibe la experiencia.
  bagCapacity: 48, // [INCIERTO] 48 en EoS con la mochila máxima; inicial menor.

  defeatWhen: 'leaderFaints',
  floorTurnLimit: 1000,

  floorGen: {
    // EoS (pmdsky-debug GenerateFloor; dungeon-mystery, rutinas de la ROM NA): distribución válida con
    // 20 casillas de sala, y un objeto y un enemigo más que la densidad.
    minRoomTiles: 20,
    extraItemSpawn: 1,
    extraEnemySpawn: 1,
    // [PROPIO] El original solo impide que un enemigo empiece en la casilla del jugador.
    minEnemyDistance: 2,
  },
};

export const BLUE_RULES: Ruleset = {
  ...SKY_RULES,
  id: 'blue',
  name: 'Equipo de Rescate Azul',
  // [INCIERTO] se asume la misma tabla que EoS hasta verificarla en RT.
  expSharing: 'allMembersFull',
  bagCapacity: 20, // [INCIERTO]
  // [VERIFICADO] pret/pmd-red GenerateFloor/SpawnNonEnemies/SpawnEnemies: 30 casillas, sin extras.
  floorGen: { ...SKY_RULES.floorGen, minRoomTiles: 30, extraItemSpawn: 0, extraEnemySpawn: 0 },
};

export const RULESETS = { sky: SKY_RULES, blue: BLUE_RULES } as const;
