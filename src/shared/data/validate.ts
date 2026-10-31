/**
 * Validación de los datos del juego: referencias rotas, estadísticas
 * inválidas y configuraciones incompletas. Se ejecuta en las pruebas y con
 * `npm run validate:data`.
 */
import { DUNGEONS, FLOOR_LAYOUTS } from './dungeons';
import { ITEMS } from './items';
import { MOVES } from './moves';
import { SPECIES } from './species';
import { STATUSES } from './statuses';
import { TRAPS } from './traps';
import { ALL_TYPES } from './types';

export function validateGameData(): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);

  for (const [id, m] of Object.entries(MOVES)) {
    if (m.id !== id) err(`Movimiento ${id}: id interno "${m.id}" no coincide`);
    if (m.type && !ALL_TYPES.includes(m.type)) err(`Movimiento ${id}: tipo desconocido ${m.type}`);
    if (m.power < 0 || m.accuracy <= 0) err(`Movimiento ${id}: potencia/precisión inválidas`);
    if (id !== 'regularAttack' && m.pp <= 0) err(`Movimiento ${id}: PP debe ser > 0`);
    if (m.category !== 'status' && m.power <= 0) err(`Movimiento ${id}: un movimiento de daño necesita potencia`);
    if (m.range.kind === 'line' && m.range.distance <= 0) err(`Movimiento ${id}: distancia de línea inválida`);
    for (const e of m.effects ?? []) {
      if (e.kind === 'status' && !STATUSES[e.status]) err(`Movimiento ${id}: estado inexistente ${e.status}`);
      if ('chance' in e && (e.chance < 0 || e.chance > 100)) err(`Movimiento ${id}: probabilidad fuera de rango`);
    }
  }

  for (const [id, s] of Object.entries(SPECIES)) {
    if (s.id !== id) err(`Especie ${id}: id interno "${s.id}" no coincide`);
    if (!s.types.length || s.types.length > 2) err(`Especie ${id}: debe tener 1 o 2 tipos`);
    for (const t of s.types) if (!ALL_TYPES.includes(t)) err(`Especie ${id}: tipo desconocido ${t}`);
    // En monster.md algunas defensas a nivel 1 valen 0 (Barboach, Whiscash); solo los PS tienen que ser positivos.
    for (const [k, v] of Object.entries(s.baseStats)) if (!(v >= 0) || (k === 'hp' && v <= 0)) err(`Especie ${id}: estadística ${k} inválida (${v})`);
    if (s.baseExp <= 0) err(`Especie ${id}: baseExp debe ser > 0`);
    if (!s.learnset.some((l) => l.level <= 1)) err(`Especie ${id}: no conoce ningún movimiento a nivel 1`);
    for (const l of s.learnset) if (!MOVES[l.move]) err(`Especie ${id}: movimiento inexistente ${l.move}`);
    if (s.growth.kind === 'table') {
      if (s.growth.rows.length < 2) err(`Especie ${id}: tabla de crecimiento incompleta`);
      for (let i = 1; i < s.growth.rows.length; i++)
        if (s.growth.rows[i].exp < s.growth.rows[i - 1].exp) err(`Especie ${id}: exp no creciente en nivel ${i + 1}`);
    }
  }

  for (const [id, d] of Object.entries(DUNGEONS)) {
    if (d.floors < 1) err(`Mazmorra ${id}: debe tener al menos un piso`);
    for (let f = 1; f <= d.floors; f++)
      if (!d.bands.some((b) => f >= b.fromFloor && f <= b.toFloor)) err(`Mazmorra ${id}: el piso ${f} no tiene tramo de datos`);
    for (const b of d.bands) {
      if (!b.enemies.length) err(`Mazmorra ${id}: tramo ${b.fromFloor}-${b.toFloor} sin enemigos`);
      const fp = b.floor;
      if (!FLOOR_LAYOUTS.includes(fp.layout)) err(`Mazmorra ${id}: distribución desconocida ${fp.layout}`);
      if (fp.floorConnectivity < 1) err(`Mazmorra ${id}: tramo ${b.fromFloor}-${b.toFloor} sin conectividad`);
      if (fp.roomDensity === 0) err(`Mazmorra ${id}: tramo ${b.fromFloor}-${b.toFloor} sin salas`);
      if (fp.itemDensity < 0 || fp.trapDensity < 0 || fp.extraHallways < 0) err(`Mazmorra ${id}: densidades negativas`);
      for (const e of b.enemies) if (!SPECIES[e.species]) err(`Mazmorra ${id}: enemigo inexistente ${e.species}`);
      for (const i of b.items) if (!ITEMS[i.item]) err(`Mazmorra ${id}: objeto inexistente ${i.item}`);
    }
  }

  for (const [id, t] of Object.entries(TRAPS)) {
    if (t.effect.kind === 'status' && !STATUSES[t.effect.status]) err(`Trampa ${id}: estado inexistente`);
  }
  for (const [id, it] of Object.entries(ITEMS)) {
    if (it.id !== id) err(`Objeto ${id}: id interno no coincide`);
  }
  return errors;
}
