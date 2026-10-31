/**
 * Tipos y tabla de efectividad (generación IV, la usada por Exploradores del Cielo).
 *
 * En Mundo Misterioso la *categoría* de efectividad se calcula igual que en los
 * juegos principales, pero el multiplicador de daño es distinto y está en las
 * reglas (ver rules.ts). Exploradores no tiene inmunidades reales: una
 * "inmunidad" del juego principal se convierte en daño reducido.
 */
export type PokeType =
  | 'normal' | 'fire' | 'water' | 'grass' | 'electric' | 'ice' | 'fighting' | 'poison' | 'ground'
  | 'flying' | 'psychic' | 'bug' | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel';

export const ALL_TYPES: readonly PokeType[] = [
  'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel',
];

export type Matchup = 'immune' | 'notVeryEffective' | 'neutral' | 'superEffective';

const SE: Partial<Record<PokeType, PokeType[]>> = {
  fire: ['grass', 'ice', 'bug', 'steel'],
  water: ['fire', 'ground', 'rock'],
  grass: ['water', 'ground', 'rock'],
  electric: ['water', 'flying'],
  ice: ['grass', 'ground', 'flying', 'dragon'],
  fighting: ['normal', 'ice', 'rock', 'dark', 'steel'],
  poison: ['grass'],
  ground: ['fire', 'electric', 'poison', 'rock', 'steel'],
  flying: ['grass', 'fighting', 'bug'],
  psychic: ['fighting', 'poison'],
  bug: ['grass', 'psychic', 'dark'],
  rock: ['fire', 'ice', 'flying', 'bug'],
  ghost: ['psychic', 'ghost'],
  dragon: ['dragon'],
  dark: ['psychic', 'ghost'],
  steel: ['ice', 'rock'],
};

const NVE: Partial<Record<PokeType, PokeType[]>> = {
  normal: ['rock', 'steel'],
  fire: ['fire', 'water', 'rock', 'dragon'],
  water: ['water', 'grass', 'dragon'],
  grass: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'],
  electric: ['electric', 'grass', 'dragon'],
  ice: ['fire', 'water', 'ice', 'steel'],
  fighting: ['poison', 'flying', 'psychic', 'bug'],
  poison: ['poison', 'ground', 'rock', 'ghost'],
  ground: ['grass', 'bug'],
  flying: ['electric', 'rock', 'steel'],
  psychic: ['psychic', 'steel'],
  bug: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel'],
  rock: ['fighting', 'ground', 'steel'],
  ghost: ['dark', 'steel'],
  dragon: ['steel'],
  dark: ['fighting', 'dark', 'steel'],
  steel: ['fire', 'water', 'electric', 'steel'],
};

const IMMUNE: Partial<Record<PokeType, PokeType[]>> = {
  normal: ['ghost'],
  electric: ['ground'],
  fighting: ['ghost'],
  poison: ['steel'],
  ground: ['flying'],
  psychic: ['dark'],
  ghost: ['normal'],
};

export function singleMatchup(attack: PokeType, defend: PokeType): Matchup {
  if (IMMUNE[attack]?.includes(defend)) return 'immune';
  if (SE[attack]?.includes(defend)) return 'superEffective';
  if (NVE[attack]?.includes(defend)) return 'notVeryEffective';
  return 'neutral';
}

const RANK: Record<Matchup, number> = { immune: 0, notVeryEffective: 1, neutral: 2, superEffective: 3 };
const BY_RANK: Matchup[] = ['immune', 'notVeryEffective', 'neutral', 'superEffective'];

/**
 * Exploradores del Cielo combina las dos efectividades de un Pokémon de doble
 * tipo en UNA sola categoría (TYPE_MATCHUP_COMBINATOR_TABLE, pmdsky-debug).
 * La tabla que usamos es la reconstrucción más aceptada:
 *   inmune domina; SE+SE=SE; SE+NVE=neutral; NVE+NVE=NVE; neutral+X=X.
 * [INCIERTO] Verificar la tabla exacta en pmdsky-debug si se dispone de ella.
 */
const COMBINATOR: Matchup[][] = [
  ['immune', 'immune', 'immune', 'immune'],
  ['immune', 'notVeryEffective', 'notVeryEffective', 'neutral'],
  ['immune', 'notVeryEffective', 'neutral', 'superEffective'],
  ['immune', 'neutral', 'superEffective', 'superEffective'],
];

export function combinedMatchup(attack: PokeType, defenders: readonly PokeType[]): Matchup {
  if (defenders.length === 0) return 'neutral';
  let result = singleMatchup(attack, defenders[0]);
  for (let i = 1; i < defenders.length; i++) {
    const m = singleMatchup(attack, defenders[i]);
    result = COMBINATOR[RANK[result]][RANK[m]];
  }
  return BY_RANK[RANK[result]];
}
