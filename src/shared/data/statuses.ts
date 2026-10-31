/**
 * Definición declarativa de los estados alterados. La lógica (cuándo se
 * actualizan, qué impiden) está en engine/status.ts y lee estos datos.
 *
 * Duraciones de EoS [VERIFICADO] leídas de la ROM (constantes *_TURN_RANGE de
 * overlay10, pmdsky-debug; el rango [a, b) se guarda como [a, b − 1]): sueño 3–6,
 * confusión 6–11, amedrentado 1, Despiste (Pantalla de Humo) 1–3, velocidad
 * reducida 6–7. [INCIERTO] El daño de veneno y quemadura y su ritmo: la ROM da
 * POISON_DAMAGE 2 / BURN_DAMAGE 6 con esperas de 20 y 50 (y 5 el tóxico, 2 las
 * drenadoras), pero no está claro en qué unidad cuentan, así que no se aplican.
 */
export type StatusId = 'poison' | 'burn' | 'paralysis' | 'sleep' | 'confusion' | 'cringe' | 'whiffer' | 'slowed';

export interface StatusData {
  id: StatusId;
  name: string;
  /** Categoría: en PMD solo puede haber un estado "principal" a la vez. */
  group: 'major' | 'volatile';
  /** Duración en turnos [min, max]; null = hasta curarse. */
  duration: [number, number] | null;
  /** HP perdidos cada `damageInterval` turnos. */
  damage?: number;
  damageInterval?: number;
  /** Impide la regeneración natural de HP. */
  blocksRegen?: boolean;
  /** Impide actuar por completo mientras dure. */
  preventsAction?: boolean;
  /** Probabilidad (%) de perder el turno. */
  skipChance?: number;
  /** Mueve/ataca en dirección aleatoria. */
  randomDirection?: boolean;
  /** Sus movimientos fallan (Despiste). [INCIERTO] el juego dice «casi todos»: aquí, todos. */
  missesMoves?: boolean;
  /**
   * Media velocidad: actúa uno de cada dos turnos. En EoS el nivel de velocidad es 1 normal, 0 media
   * velocidad y 2–4 dos a cuatro veces (monster::speed_stage, pmdsky-debug); cada bajada cuenta aparte.
   */
  halfSpeed?: boolean;
  color: string;
  label: string;
}

export const STATUSES: Record<StatusId, StatusData> = {
  poison: {
    id: 'poison', name: 'Envenenado', group: 'major', duration: null,
    damage: 1, damageInterval: 1, blocksRegen: true, color: '#a040c0', label: 'ENV',
  },
  burn: {
    id: 'burn', name: 'Quemado', group: 'major', duration: null,
    damage: 1, damageInterval: 2, blocksRegen: true, color: '#e05020', label: 'QUE',
  },
  paralysis: {
    id: 'paralysis', name: 'Paralizado', group: 'major', duration: null,
    skipChance: 25, color: '#e0c020', label: 'PAR',
  },
  sleep: {
    id: 'sleep', name: 'Dormido', group: 'major', duration: [3, 6],
    preventsAction: true, color: '#8080a0', label: 'DOR',
  },
  confusion: {
    id: 'confusion', name: 'Confuso', group: 'volatile', duration: [6, 11],
    randomDirection: true, color: '#e070c0', label: 'CON',
  },
  // Mordisco (20 %): «hace que sus acciones fallen» durante 1 turno (CRINGE_TURN_RANGE).
  cringe: {
    id: 'cringe', name: 'Amedrentado', group: 'volatile', duration: [1, 1],
    preventsAction: true, color: '#c0a0e0', label: 'AME',
  },
  // Pantalla de Humo: «falla casi todos sus movimientos» 1–3 turnos (SMOKESCREEN_TURN_RANGE).
  whiffer: {
    id: 'whiffer', name: 'Despistado', group: 'volatile', duration: [1, 3],
    missesMoves: true, color: '#a0a0a0', label: 'DES',
  },
  // Disparo Demora: baja la velocidad un nivel 6–7 turnos (SPEED_LOWER_TURN_RANGE): media velocidad.
  // [INCIERTO] No se acumulan varias bajadas (en EoS cada una tiene su contador).
  slowed: {
    id: 'slowed', name: 'Ralentizado', group: 'volatile', duration: [6, 7],
    halfSpeed: true, color: '#80a0c0', label: 'LEN',
  },
};
