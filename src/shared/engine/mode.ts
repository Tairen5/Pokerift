/**
 * Modo de juego cooperativo.
 *
 *  - 'explore': ningún enemigo está implicado → cada jugador actúa a su ritmo
 *    (resolveExploreAction). Es como en PMD, donde explorar es fluido.
 *  - 'tactical': hay un enemigo implicado → turnos compartidos: todos los
 *    jugadores eligen acción y el turno se resuelve completo (resolveTurn),
 *    con las reglas de combate de siempre.
 *
 * Un enemigo está "implicado" cuando percibe a algún miembro del equipo o es
 * percibido por él (misma habitación, o distancia ≤ 2 en pasillo: la misma
 * regla de percepción que usa la IA). El modo se recalcula tras cada
 * resolución, así que se entra y se sale del combate automáticamente.
 */
import { canPerceive } from './ai';
import { type GameState, teamMembers } from './state';

export type PlayMode = 'explore' | 'tactical';

export function engagedEnemies(state: GameState) {
  const team = teamMembers(state);
  return state.entities.filter(
    (e) => e.team === 'enemy' && !e.fainted && team.some((m) => canPerceive(state.map, e, m) || canPerceive(state.map, m, e)),
  );
}

export function currentMode(state: GameState): PlayMode {
  return engagedEnemies(state).length > 0 ? 'tactical' : 'explore';
}
