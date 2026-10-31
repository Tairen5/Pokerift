/**
 * REGISTRO CENTRAL: movimiento → efectos visuales
 * ───────────────────────────────────────────────
 * Único sitio donde se decide qué efecto reproduce cada movimiento. Los datos de
 * combate (src/shared/data/moves.ts) no saben nada de gráficos.
 *
 * Cómo lo hace el juego original (Exploradores del Cielo), según SkyTemple
 * (skytemple-files: data/anim) y vinzmyko/pmd-eos-battle-visuals:
 *  - La tabla de animaciones de movimientos da, para cada move_id, hasta 4 ID de
 *    "animación de efecto" (capas: carga, secundario, principal, proyectil).
 *  - La tabla EFFECT_ANIMATION_INFO traduce cada ID de animación de efecto a un
 *    archivo de EFFECT/effect.bin (file_index) y una secuencia (animation_index;
 *    + dirección si el archivo tiene 8 variantes), con su punto de anclaje y bucle.
 *  - Ambas tablas están en el binario del juego: no hay volcado público. La
 *    herramienta vinzmyko/pmd-scraper las extrae de una ROM a asset_index.json, y
 *    tools/import-pmd-scraper.mjs lo convierte a ./move-fx.rom.generated.ts.
 *
 * Por eso cada entrada indica de dónde sale:
 *  - 'rom':    de las tablas del juego (importadas con pmd-scraper). Fiable.
 *  - 'pixel':  el gráfico se ha comprobado píxel a píxel contra una hoja con el
 *              nombre del ataque. Fiable para el gráfico, no para el orden/capas.
 *  - 'visual': elegido a ojo entre las carpetas de move_VFX. SIN VERIFICAR.
 * Si hay datos 'rom' para el move_id, se usan siempre en lugar de los demás.
 *
 * Las claves de efecto apuntan a CATALOG.effects: las de move_VFX las genera
 * tools/build-effects.mjs (carpeta = archivo de effect.bin, NO el ID de animación
 * de efecto); las importadas de la ROM se llaman "eos-<ID de animación de efecto>".
 */
import { ROM_MOVE_FX } from './move-fx.rom.generated';
import { type AnimAction, CATALOG } from './catalog';

/** Papel de un efecto dentro del movimiento (las 4 capas de la tabla del juego). */
/** screen = efecto a pantalla completa (tipo Screen del juego). */
export type FxRole = 'charge' | 'secondary' | 'primary' | 'projectile' | 'screen';

export interface MoveFxEntry {
  /** move_id interno de Exploradores del Cielo (pmdsky-debug, headers/types/common/enums.h). */
  eosMoveId: number;
  /** Efecto (clave de CATALOG.effects) por papel: carga sobre el usuario, proyectil hacia el objetivo, principal/secundario sobre el objetivo. */
  effects: Partial<Record<FxRole, string>>;
  /** Partícula que vuelve del objetivo al usuario (movimientos que absorben). */
  returnShot?: string;
  source: 'rom' | 'pixel' | 'visual';
  /** Justificación o duda (se muestra en el visor de efectos). */
  note?: string;
}

const visual = (eosMoveId: number, effects: MoveFxEntry['effects'], note: string, extra: Partial<MoveFxEntry> = {}): MoveFxEntry => ({
  eosMoveId, effects, source: 'visual', note, ...extra,
});

/** Asignación sin ROM. Solo Picotazo Veneno está comprobado (gráfico idéntico a la hoja "Poison Sting"). */
const FALLBACK: Record<string, MoveFxEntry> = {
  regularAttack: visual(355, { primary: 'hit' }, 'Destello genérico de golpe. En el juego es un efecto compartido de effect.bin 0/1, que no está en move_VFX.'),
  tackle: visual(154, { primary: 'hit' }, 'Según la wiki, Placaje solo usa un sonido de arranque (efecto 227, WAN File 0) y la reacción al golpe; el destello es aproximado.'),
  pound: visual(250, { primary: 'hit' }, 'Destello genérico de golpe.'),
  quickAttack: visual(190, { primary: 'hit' }, 'Destello genérico de golpe.'),
  scratch: visual(260, { primary: 'slash' }, 'Tres zarpazos (move_VFX 0050). La wiki llama "Scratch" a la animación de efecto 138, pero su archivo no se ha comprobado.'),
  furyCutter: visual(346, { primary: 'cutter' }, 'Media luna verde (move_VFX 0245).'),
  bite: visual(63, { primary: 'bite' }, 'Colmillos por dirección (move_VFX 0122).'),
  ember: visual(262, { primary: 'fire' }, 'Llamitas (move_VFX 0070). La wiki da proyectil 137 e impacto 317 para Ascuas; falta saber sus archivos.'),
  waterGun: visual(308, { primary: 'water', projectile: 'waterShot' }, 'Gota (0127) e impacto (0021). La wiki da proyectil 333 (WAN) e impacto 334 (WAN File 0: no está en move_VFX).'),
  vineWhip: visual(182, { primary: 'vine' }, 'Látigo verde (move_VFX 0131).'),
  razorLeaf: visual(251, { primary: 'leaf' }, 'Hojas por dirección (move_VFX 0129). En el juego salen 8 instancias en abanico.'),
  thunderShock: visual(188, { primary: 'electric' }, 'Rayo fino que cae desde arriba (move_VFX 0119). Ni la wiki ni otras fuentes públicas confirman su efecto: pendiente de la ROM.'),
  poisonSting: {
    eosMoveId: 200, effects: { projectile: 'poison', primary: 'hit' }, source: 'pixel',
    note: 'Agujas de move_VFX 0136: mismos píxeles (colores a 5 bits) que "Poison Sting" en Assets/.../Time and dark/Poison attack effects. La wiki la describe como proyectil (efecto 217).',
  },
  peck: visual(174, { primary: 'peck' }, 'Pico por dirección (move_VFX 0106, 1 fotograma).'),
  gust: visual(57, { primary: 'wind' }, 'Remolino (move_VFX 0135).'),
  absorb: visual(135, { primary: 'drainOrb' }, 'Orbe verde que vuelve al usuario (move_VFX 0145).', { returnShot: 'drainOrb' }),
  growl: visual(217, { primary: 'growl' }, 'Ondas con notas (move_VFX 0162).'),
  tailWhip: visual(122, { primary: 'statDown' }, 'Anillos (move_VFX 0081).'),
  leer: visual(224, { primary: 'leer' }, 'Ojos amenazantes (move_VFX 0064).'),
  sandAttack: visual(142, { primary: 'sand' }, 'Arena (move_VFX 0114).'),
  mudSlap: visual(213, { primary: 'sand' }, 'Arena (move_VFX 0114).'),
  stringShot: visual(23, { primary: 'string' }, 'Hilos (move_VFX 0109).'),
  harden: visual(58, { primary: 'harden' }, 'Anillo que se expande (move_VFX 0020).'),
  sing: visual(34, { primary: 'sing' }, 'Ondas con notas (move_VFX 0162).'),
  confusion: visual(234, { primary: 'psychic' }, 'Onda rosa (move_VFX 0017).'),
  smokescreen: visual(37, { primary: 'smoke' }, 'Humo (move_VFX 0041).'),
  barrage: visual(168, { primary: 'egg' }, 'Huevo (move_VFX 0116).'),
  hypnosis: visual(111, { primary: 'hypnosis' }, 'Espiral (move_VFX 0058).'),
  growth: visual(148, { primary: 'growth' }, 'Remolino verde (move_VFX 0186).'),
  // Enemigos de la expedición: con la ROM importada se usa su efecto original; sin ella, uno genérico.
  astonish: visual(46, { primary: 'hit' }, 'Genérico sin ROM.'),
  constrict: visual(71, { primary: 'hit' }, 'Genérico sin ROM.'),
  wrap: visual(294, { primary: 'hit' }, 'Genérico sin ROM.'),
  lowKick: visual(92, { primary: 'hit' }, 'Genérico sin ROM.'),
  defenseCurl: visual(302, { primary: 'growth' }, 'Genérico sin ROM.'),
  scaryFace: visual(106, { primary: 'leer' }, 'Genérico sin ROM.'),
  wingAttack: visual(178, { primary: 'hit' }, 'Genérico sin ROM.'),
  bubble: visual(16, { primary: 'hit' }, 'Genérico sin ROM.'),
  poisonGas: visual(196, { primary: 'smoke' }, 'Genérico sin ROM.'),
  sleepPowder: visual(231, { primary: 'hypnosis' }, 'Genérico sin ROM.'),
  mudShot: visual(299, { primary: 'hit' }, 'Genérico sin ROM.'),
  zenHeadbutt: visual(473, { primary: 'psychic' }, 'Genérico sin ROM.'),
  stunSpore: visual(124, { primary: 'statDown' }, 'Genérico sin ROM.'),
  poisonPowder: visual(199, { primary: 'statDown' }, 'Genérico sin ROM.'),
  sweetScent: visual(10, { primary: 'statDown' }, 'Genérico sin ROM.'),
  acid: visual(332, { primary: 'hit' }, 'Genérico sin ROM.'),
  leechLife: visual(80, { primary: 'drainOrb' }, 'Genérico sin ROM.', { returnShot: 'drainOrb' }),
  synthesis: visual(94, { primary: 'growth' }, 'Genérico sin ROM.'),
  ingrain: visual(233, { primary: 'growth' }, 'Genérico sin ROM.'),
  stomp: visual(271, { primary: 'hit' }, 'Genérico sin ROM.'),
  seedBomb: visual(486, { primary: 'hit' }, 'Genérico sin ROM.'),
  furyAttack: visual(311, { primary: 'hit' }, 'Genérico sin ROM.'),
  bugBite: visual(529, { primary: 'hit' }, 'Genérico sin ROM.'),
  mudSport: visual(212, { primary: 'growth' }, 'Genérico sin ROM.'),
  waterSport: visual(307, { primary: 'growth' }, 'Genérico sin ROM.'),
  focusEnergy: visual(74, { primary: 'growth' }, 'Genérico sin ROM.'),
  naturePower: visual(119, { primary: 'growth' }, 'Genérico sin ROM.'),
  mist: visual(130, { primary: 'smoke' }, 'Genérico sin ROM.'),
  splash: visual(254, { primary: 'growth' }, 'Genérico sin ROM.'),
  protect: visual(301, { primary: 'growth' }, 'Genérico sin ROM.'),
};

/** ¿Se han importado las tablas del juego? */
export const HAS_ROM_FX = Object.keys(ROM_MOVE_FX.moves).length > 0;

/**
 * Efectos de un movimiento: los de la ROM si se han importado; si no, la
 * asignación de respaldo. Con la ROM importada, un movimiento sin capas en su
 * tabla (Placaje, ataque normal...) no lleva efecto propio: en el juego solo se
 * ve la reacción al golpe (hitReactionFx).
 */
export function moveFx(moveId: string): MoveFxEntry | undefined {
  const base = FALLBACK[moveId];
  if (!base) return undefined;
  const rom = ROM_MOVE_FX.moves[String(base.eosMoveId)];
  if (rom && Object.keys(rom).length) return { eosMoveId: base.eosMoveId, effects: rom, source: 'rom', note: 'Tablas del juego (pmd-scraper).' };
  if (HAS_ROM_FX) return { eosMoveId: base.eosMoveId, effects: {}, source: 'rom', note: 'Sin capas en la tabla del juego: solo la reacción al golpe.' };
  return base;
}

/**
 * Reacción al golpe que el juego reproduce en cada golpe con daño, según la
 * eficacia (efectos 8–11: 0,5× / poco eficaz / neutro / muy eficaz; ver
 * pmd-eos-battle-visuals, damage_visual_pipeline.md). Sin ROM, no hay.
 */
export function hitReactionFx(matchup: string): string | undefined {
  return (ROM_MOVE_FX as { hitReactions?: Record<string, string> }).hitReactions?.[matchup];
}

/** Todos los movimientos con efecto registrado (para el visor y las comprobaciones). */
export const MOVE_FX_IDS = Object.keys(FALLBACK);

/** Nº de Pokédex de una especie (el de su carpeta de SpriteCollab). */
function dexOf(species: string): number | undefined {
  const m = CATALOG.pokemon[species]?.source?.match(/(\d+)/);
  return m ? Number(m[1]) : undefined;
}

/**
 * Animación que hace el ATACANTE al usar un movimiento del juego: la de la tabla
 * de animaciones (pokemon_anim_id) o la excepción de su especie
 * (special_animations), como "a<índice>" del catálogo. undefined si no se ha
 * importado la ROM o la especie no tiene esa animación (se usa attack/shoot).
 */
export function userAnimForEos(eosMoveId: number, species: string): AnimAction | undefined {
  const ua = (ROM_MOVE_FX as { userAnims?: Record<string, { anim: number; bySpecies?: Record<string, number> }> }).userAnims?.[String(eosMoveId)];
  if (!ua) return undefined;
  const dex = dexOf(species);
  const idx = (dex !== undefined ? ua.bySpecies?.[String(dex)] : undefined) ?? ua.anim;
  const key = `a${idx}` as AnimAction;
  return CATALOG.pokemon[species]?.anims[key] ? key : undefined;
}

export function userAnimFor(moveId: string, species: string): AnimAction | undefined {
  const base = FALLBACK[moveId];
  return base ? userAnimForEos(base.eosMoveId, species) : undefined;
}

/** Animaciones a<índice> que necesita una especie para los movimientos del juego (las que se cargan al arrancar). */
export function neededUserAnims(species: string): Set<string> {
  return new Set(MOVE_FX_IDS.map((id) => userAnimFor(id, species)).filter((a): a is AnimAction => !!a));
}

/** Capas de cualquier movimiento del juego por su move_id (todas las importadas de la ROM). */
export function eosMoveFx(eosMoveId: number): Partial<Record<FxRole, string>> | undefined {
  return ROM_MOVE_FX.moves[String(eosMoveId)];
}

/**
 * Efectos que se cargan al arrancar: los de los movimientos del juego, las
 * reacciones al golpe y los efectos sueltos que no vienen de la ROM (explosión,
 * golpe de trampa…). El resto de los importados se cargan bajo demanda.
 */
export function bootEffects(allKeys: string[]): Set<string> {
  const keys = new Set(allKeys.filter((k) => !k.startsWith('eos-')));
  for (const id of MOVE_FX_IDS) {
    const e = moveFx(id);
    for (const k of Object.values(e?.effects ?? {})) if (k) keys.add(k);
    if (e?.returnShot) keys.add(e.returnShot);
  }
  for (const k of Object.values((ROM_MOVE_FX as { hitReactions?: Record<string, string> }).hitReactions ?? {})) keys.add(k);
  return keys;
}
