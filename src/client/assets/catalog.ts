/**
 * CATÁLOGO DE RECURSOS GRÁFICOS
 * ─────────────────────────────
 * Único lugar donde se asocia cada Pokémon, tileset o efecto con sus archivos.
 * Todo lo que no esté aquí se dibuja con un placeholder generado (claramente
 * identificable: círculo de color con la inicial).
 *
 * Las rutas son relativas a /public. Cada hoja define su propia rejilla:
 * no se asume ninguna distribución común de filas y columnas.
 *
 * Ejemplo para un sprite con el formato de PMDCollab (una imagen por
 * animación, 8 filas = 8 direcciones en el orden S, SE, E, NE, N, NW, W, SW;
 * el tamaño de frame viene en su AnimData.xml):
 *
 *   pikachu: {
 *     anims: {
 *       idle:   { url: 'assets/pokemon/pikachu/Idle-Anim.png',   frameWidth: 40, frameHeight: 56, frames: 6,  frameRate: 6,  directions: 8 },
 *       walk:   { url: 'assets/pokemon/pikachu/Walk-Anim.png',   frameWidth: 32, frameHeight: 40, frames: 4,  frameRate: 12, directions: 8 },
 *       attack: { url: 'assets/pokemon/pikachu/Attack-Anim.png', frameWidth: 64, frameHeight: 64, frames: 10, frameRate: 20, directions: 8, loop: false },
 *       hurt:   { url: 'assets/pokemon/pikachu/Hurt-Anim.png',   frameWidth: 32, frameHeight: 48, frames: 2,  frameRate: 8,  directions: 8, loop: false },
 *     },
 *     portrait: 'assets/pokemon/pikachu/Normal.png',
 *     offsetY: -4,
 *   },
 *
 * Licencias: documenta en ASSETS.md la procedencia de cada recurso añadido.
 */

import { SPRITECOLLAB } from './spritecollab.generated';
import { ROM_EXPEDITION } from '../../shared/data/expedition.rom.generated';
import { ITEM_ICONS, MOVE_EFFECTS, STATUS_EFFECTS } from './effects.generated';
import { ROM_MOVE_FX } from './move-fx.rom.generated';

/**
 * Acciones del juego y, como a<índice>, cualquier animación de la especie por su
 * índice en el WAN de EoS (<Index> de AnimData.xml), que es como la tabla de
 * animaciones de los movimientos pide la del atacante.
 */
export type AnimAction = 'idle' | 'walk' | 'attack' | 'shoot' | 'hurt' | 'sleep' | `a${number}`;

export interface AnimDef {
  url: string;
  /** Nombre de la animación en PMDCollab (las a<índice>). */
  name?: string;
  frameWidth: number;
  frameHeight: number;
  /** Frames por dirección (columnas usadas). */
  frames: number;
  frameRate: number;
  /** Duración de cada frame en ticks de 1/60 s (AnimData.xml de PMDCollab). Tiene prioridad sobre frameRate. */
  durations?: number[];
  /** Frame en el que el golpe "impacta" (AnimData.xml). */
  hitFrame?: number;
  /**
   * Punto de apoyo (centro de la sombra) respecto al centro del frame, en px
   * (Shadow-Anim de PMDCollab). Se usa para que el Pokémon pise el suelo.
   */
  shadow?: [number, number];
  /** Igual que shadow pero por dirección y frame, cuando varía dentro de la animación. */
  shadowPerFrame?: [number, number][][];
  /** 8 = una fila por dirección (orden del enum Dir); 1 = misma animación para todas. */
  directions: 8 | 1;
  loop?: boolean;
  /** Fila inicial dentro de la hoja (por si varias animaciones comparten imagen). */
  startRow?: number;
}

export interface PokemonAssets {
  anims: Partial<Record<AnimAction, AnimDef>>;
  /** NPC de decorado (no jugable). */
  npc?: boolean;
  /** Tamaño de la sombra en el suelo (AnimData.xml): 0 pequeña, 1 mediana, 2 grande. */
  shadowSize?: 0 | 1 | 2;
  portrait?: string;
  /** Retratos por emoción (normal, pain, happy...). */
  portraits?: Record<string, string>;
  /** Desplazamiento vertical para centrar el sprite en la casilla. */
  offsetY?: number;
  /** Procedencia (p. ej. "SpriteCollab 0025"). */
  source?: string;
}

export interface TilesetAsset {
  image: string;
  /** JSON generado por tools/build-tileset.mjs (máscara de vecinos → tiles). */
  atlas: string;
  tileSize: number;
  /** Color de fondo de la hoja que debe tratarse como transparente. */
  colorKey?: string;
}

export interface EffectAsset {
  url: string;
  frameWidth: number;
  frameHeight: number;
  frames: number;
  frameRate: number;
  /** 8 = una fila por dirección (orden de Dir); 1 o ausente = sin dirección. */
  dirs?: number;
  /** Duración de cada fotograma en ms (datos de la ROM); si falta, se usa frameRate. */
  durations?: number[];
  /**
   * 'bottom' = cae desde arriba: su parte de abajo se apoya en el suelo del objetivo.
   * 'screen' = efecto a pantalla completa (tipo Screen del juego, 256×160).
   */
  anchor?: 'center' | 'bottom' | 'screen';
  /** Opacidad de cada fotograma (efectos de pantalla). */
  alphas?: number[];
  /** Se repite mientras dure (proyectiles). */
  loop?: boolean;
}

export interface AssetCatalog {
  tilesets: Record<string, TilesetAsset>;
  pokemon: Record<string, PokemonAssets>;
  /** Efectos de movimiento (clave = campo fx/projectile de data/moves.ts). */
  effects: Record<string, EffectAsset>;
  /** Animaciones de estado sobre la cabeza (clave = StatusId). */
  status: Record<string, EffectAsset>;
  /** Iconos de los objetos en el suelo y en la mochila (clave = id del objeto). */
  items: Record<string, string>;
  /** Casillas de trampa originales (clave = id de la trampa); las que faltan usan placeholder. */
  traps: Record<string, string>;
  /** Escaleras de subida y bajada. */
  stairs: Record<'up' | 'down', string>;
  /** Tileset de reserva si una mazmorra referencia uno inexistente. */
  fallbackTileset: string;
}

export const CATALOG: AssetCatalog = {
  tilesets: {
    tinywoods: {
      image: 'assets/tilesets/tinywoods.png',
      atlas: 'assets/tilesets/tinywoods.json',
      tileSize: 24,
      colorKey: '#008080',
    },
    // Tilesets de las mazmorras de EoS (dungeon.bin; tools/import-rom-dungeons.mjs).
    ...Object.fromEntries(
      [...new Set((ROM_EXPEDITION ?? []).map((s) => s.tileset))].map((t) => [t, { image: `assets/tilesets/${t}.png`, atlas: `assets/tilesets/${t}.json`, tileSize: 24 }]),
    ),
  },
  // Generado por tools/fetch-spritecollab.mjs. Las especies sin entrada usan placeholder.
  pokemon: SPRITECOLLAB,
  // Generados por tools/build-effects.mjs a partir de Assets/effects y Assets/items.
  // move_VFX (asignación del registro moveFx.ts) + efectos importados de la ROM con pmd-scraper.
  effects: { ...MOVE_EFFECTS, ...ROM_MOVE_FX.effects } as Record<string, EffectAsset>,
  status: { ...STATUS_EFFECTS, ...(ROM_MOVE_FX.statusIcons ?? {}) },
  // Iconos de la ROM (tools/import-pmd-scraper.mjs) si se ha importado; si no, los recortados de las hojas.
  items: { ...ITEM_ICONS, ...(ROM_MOVE_FX.items ?? {}) },
  // Recortadas por tools/build-objects.mjs (solo las reconocibles con seguridad).
  // Casillas de la ROM (dungeon.bin 1033: dibujo n = trampa n de enum trap_id); sin ROM, las 4 recortadas de la hoja
  // (OJO: la «warpTrap» de la hoja es en realidad la trampa de Sueño, dibujo 9, y la «pitfallTrap», el hoyo roto, dibujo 32).
  traps: Object.keys(ROM_MOVE_FX.traps ?? {}).length ? ROM_MOVE_FX.traps : Object.fromEntries(['warpTrap', 'chestnutTrap', 'spinTrap', 'pitfallTrap'].map((id) => [id, `assets/dungeon/trap-${id}.png`])),
  stairs: { up: ROM_MOVE_FX.stairs?.up ?? 'assets/dungeon/stairs-up.png', down: ROM_MOVE_FX.stairs?.down ?? 'assets/dungeon/stairs-down.png' },
  fallbackTileset: 'tinywoods',
};

/** Validación del catálogo: devuelve una lista de problemas (vacía si todo está bien). */
export function validateCatalog(cat: AssetCatalog, speciesIds: string[], tilesetsUsed: string[]): string[] {
  const problems: string[] = [];
  for (const t of tilesetsUsed) if (!cat.tilesets[t]) problems.push(`Tileset "${t}" no está en el catálogo (se usará ${cat.fallbackTileset}).`);
  for (const [id, p] of Object.entries(cat.pokemon)) {
    // Los NPC de decorado (p. ej. los de la Aldea Tesoro) no son especies del juego.
    if (!p.npc && !speciesIds.includes(id)) problems.push(`Sprites para especie inexistente: ${id}`);
    for (const [a, def] of Object.entries(p.anims)) {
      if (!def) continue;
      if (def.frameWidth <= 0 || def.frameHeight <= 0 || def.frames <= 0) problems.push(`${id}.${a}: dimensiones inválidas`);
    }
  }
  return problems;
}
