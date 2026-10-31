import { Dir, type Point } from '../core/geometry';
import { getSpecies } from '../data/species';
import { NEUTRAL_STAGES, expForLevel, makeMoveSlot, movesAtLevel, statsAtLevel } from './stats';
import { type Entity, type GameState, type Team, newId } from './state';

export function createPokemon(
  state: GameState,
  speciesId: string,
  level: number,
  team: Team,
  pos: Point,
  opts: { playerId?: string; name?: string } = {},
): Entity {
  const sp = getSpecies(speciesId);
  const stats = statsAtLevel(sp, level);
  return {
    id: newId(state, team === 'team' ? 'p' : 'e'),
    team,
    playerId: opts.playerId,
    controller: opts.playerId ? 'player' : 'ai',
    species: sp.id,
    name: opts.name ?? sp.name,
    level,
    exp: expForLevel(sp, level),
    pos: { ...pos },
    facing: Dir.S,
    hp: stats.hp,
    maxHp: stats.hp,
    stats,
    stages: { ...NEUTRAL_STAGES },
    moves: movesAtLevel(sp, level).map(makeMoveSlot),
    statuses: [],
    abilities: [...sp.abilities],
    belly: state.rules.bellyMax,
    maxBelly: state.rules.bellyMax,
    fainted: false,
    regenAcc: 0,
    ai: {},
  };
}
