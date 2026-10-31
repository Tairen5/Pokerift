/**
 * Carga todos los recursos del catálogo y genera los placeholders y
 * animaciones. Si un recurso falla, se registra y se usa el placeholder.
 */
import Phaser from 'phaser';
import { ALL_DIRS } from '../../shared/core/geometry';
import { CATALOG } from '../assets/catalog';
import { ROM_MOVE_FX } from '../assets/move-fx.rom.generated';
import { ROM_NUMBERS } from '../assets/damage-numbers.generated';
import { ROM_UI } from '../assets/ui-rom.generated';
import { bootEffects, neededUserAnims } from '../assets/moveFx';
import { createFxAnims } from '../render/fxAnims';
import { uiAsset } from '../ui/romUi';
import { DMG_NUMBERS_KEY } from '../render/damageNumbers';
import { generatePlaceholders } from '../render/placeholders';
import { ZONES } from '../../shared/town/zone';

export const missingAssets: string[] = [];

/**
 * Milisegundos por tick de AnimData.xml: 1/60 s, el ritmo oficial (la DS va a
 * 60 fps y PMDO, el motor de PMDCollab, interpreta así las duraciones:
 * GraphicsManager.MAX_FPS = 60). TICK_MS permite ajustar una acción concreta
 * si hiciera falta; ahora todas van al ritmo original.
 */
const DEFAULT_TICK_MS = 1000 / 60;
const TICK_MS: Partial<Record<string, number>> = {};

export { animKey } from '../render/pokemonSprite';
import { animKey } from '../render/pokemonSprite';

/**
 * ¿Se carga esta animación al arrancar? Las acciones del juego, siempre; las
 * a<índice>, solo las que usan los movimientos del juego (o todas si la página
 * lo pide, como el visor de efectos: registry 'allMonAnims').
 */
let ALL_MON_ANIMS = false;
const needed = new Map<string, Set<string>>();
function wantAnim(species: string, action: string) {
  if (!/^a\d+$/.test(action) || ALL_MON_ANIMS) return true;
  if (!needed.has(species)) needed.set(species, neededUserAnims(species));
  return needed.get(species)!.has(action);
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  /**
   * Pokémon de decorado de la intro (no son especies del juego): Vulpix camina
   * hacia la derecha y Pelipper vuela hacia la izquierda. Filas de PMDCollab:
   * S, SE, E, NE, N, NW, W, SW.
   */
  private createIntroSprites() {
    for (const [name, row] of [['vulpix', 2], ['pelipper', 6]] as const) {
      const data = this.cache.json.get(`intro-${name}-data`) as { frameWidth: number; frameHeight: number; durations: number[] } | undefined;
      if (!data || !this.textures.exists(`intro-${name}-img`)) continue;
      const img = this.textures.get(`intro-${name}-img`).getSourceImage() as HTMLImageElement;
      this.textures.addSpriteSheet(`intro-${name}`, img, { frameWidth: data.frameWidth, frameHeight: data.frameHeight });
      const cols = Math.floor(img.width / data.frameWidth);
      this.anims.create({
        key: `intro-${name}-walk`,
        frames: data.durations.map((d, i) => ({ key: `intro-${name}`, frame: row * cols + i, duration: d * DEFAULT_TICK_MS })),
        repeat: -1,
      });
    }
  }

  preload() {
    ALL_MON_ANIMS = !!this.registry.get('allMonAnims');
    const bar = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, 0, 6, 0xffd84a).setOrigin(0, 0.5);
    const w = Math.min(320, this.scale.width * 0.6);
    bar.x -= w / 2;
    this.load.on('progress', (v: number) => (bar.width = w * v));
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      missingAssets.push(file.key);
      console.warn(`[recursos] No se pudo cargar ${file.key} (${file.url}); se usará un placeholder.`);
    });
    for (const [key, ts] of Object.entries(CATALOG.tilesets)) {
      this.load.image(`tileset-${key}`, ts.image);
      this.load.json(`atlas-${key}`, ts.atlas);
    }
    for (const [species, p] of Object.entries(CATALOG.pokemon)) {
      for (const [action, def] of Object.entries(p.anims)) {
        if (def && wantAnim(species, action)) this.load.spritesheet(`mon-${species}-${action}`, def.url, { frameWidth: def.frameWidth, frameHeight: def.frameHeight });
      }
      if (p.portrait) this.load.image(`portrait-${species}`, p.portrait);
    }
    // Solo los efectos de la partida; el resto (todas las animaciones del juego) bajo demanda (render/fxAnims.ts).
    for (const key of bootEffects(Object.keys(CATALOG.effects))) {
      const fx = CATALOG.effects[key];
      if (fx) this.load.spritesheet(`fx-${key}`, fx.url, { frameWidth: fx.frameWidth, frameHeight: fx.frameHeight });
    }
    for (const [id, fx] of Object.entries(CATALOG.status)) {
      this.load.spritesheet(`status-${id}`, fx.url, { frameWidth: fx.frameWidth, frameHeight: fx.frameHeight });
    }
    for (const [id, url] of Object.entries(CATALOG.items)) this.load.image(`item-${id}`, url);
    // Intro, título y menú (tools/build-intro-assets.mjs, tools/build-font.mjs).
    for (const img of ['sea-sky', 'sea-water', 'plains-back', 'plains-front', 'ruins-back', 'town-pano', 'logo', 'title-back']) this.load.image(`intro-${img}`, `assets/intro/${img}.png`);
    for (const n of ['vulpix', 'pelipper']) {
      this.load.image(`intro-${n}-img`, `assets/intro/${n}-walk.png`);
      this.load.json(`intro-${n}-data`, `assets/intro/${n}-walk.json`);
    }
    for (const a of ['lapras', 'treasure', 'town']) this.load.atlas(`intro-${a}`, `assets/intro/${a}-atlas.png`, `assets/intro/${a}-atlas.json`);
    this.load.bitmapFont('pmd-title', 'assets/fonts/pmd-title.png', 'assets/fonts/pmd-title.xml');
    // Interfaz al estilo original (tools/build-ui.mjs): fuente de diálogo, cajas y cursor.
    // Con la ROM importada (tools/import-rom-ui.mjs), la fuente y las cajas del juego.
    if (ROM_UI) this.load.bitmapFont('pmd-message', ROM_UI.bitmapFont.png, ROM_UI.bitmapFont.xml);
    else this.load.bitmapFont('pmd-message', 'assets/fonts/pmd-message.png', 'assets/fonts/pmd-message.xml');
    for (const style of ['frame', 'plain'])
      for (const color of ['blue', 'green', 'pink']) this.load.image(`ui-${style}-${color}`, uiAsset(`${style}-${color}`));
    this.load.image('ui-cursor', 'assets/ui/cursor.png');
    // Ilustraciones del menú principal (ROM importada; ver MainMenuScene).
    (ROM_UI?.menuBackgrounds ?? []).forEach((url, i) => this.load.image(`menu-bg-${i}`, url));
    for (const dir of ['up', 'down'] as const) this.load.image(`stairs-${dir}`, CATALOG.stairs[dir]);
    for (const [id, url] of Object.entries(CATALOG.traps)) this.load.image(`trap-${id}`, url);
    // Sombras originales del juego, si se ha importado la ROM (ver render/pokemonSprite.ts).
    for (const [id, s] of Object.entries(ROM_MOVE_FX.shadows ?? {})) this.load.image(`shadow-rom-${id}`, s.url);
    // Números de daño/curación del juego, si se ha importado la ROM (ver render/damageNumbers.ts).
    if (ROM_NUMBERS) this.load.image(DMG_NUMBERS_KEY, ROM_NUMBERS.url);
    // Zonas explorables.
    for (const z of Object.values(ZONES)) {
      this.load.image(`zone-${z.id}`, z.image);
      if (z.upper) this.load.image(`zone-${z.id}-upper`, z.upper);
      for (const p of z.props ?? []) if (!this.textures.exists(`prop-${p.image}`)) this.load.image(`prop-${p.image}`, p.image);
      for (const a of z.anims) this.load.spritesheet(`zone-${z.id}-${a.key}`, a.image, { frameWidth: a.w, frameHeight: a.h });
    }
  }

  create() {
    generatePlaceholders(this);
    // Animaciones por especie/acción/dirección a partir de la rejilla declarada.
    for (const [species, p] of Object.entries(CATALOG.pokemon)) {
      for (const [action, def] of Object.entries(p.anims)) {
        const tex = `mon-${species}-${action}`;
        if (!def || !this.textures.exists(tex)) continue;
        const cols = Math.floor(this.textures.get(tex).getSourceImage().width / def.frameWidth);
        for (const dir of ALL_DIRS) {
          const row = (def.startRow ?? 0) + (def.directions === 8 ? dir : 0);
          const frames = Array.from({ length: def.frames }, (_, i) => ({
            key: tex,
            frame: row * cols + i,
            // Duraciones de AnimData.xml en ticks. En Phaser 3.90 la duración de un
            // frame SUSTITUYE a msPerFrame (Animation.getNextTick).
            ...(def.durations?.[i] ? { duration: def.durations[i] * (TICK_MS[action] ?? DEFAULT_TICK_MS) } : {}),
          }));
          this.anims.create({
            key: animKey(species, action, dir),
            frames,
            frameRate: def.frameRate,
            repeat: def.loop === false ? 0 : -1,
          });
        }
      }
    }
    this.createIntroSprites();
    // Efectos: una animación por fila (fx-<clave>-<dirección>; sin dirección, solo la 0).
    for (const key of Object.keys(CATALOG.effects)) createFxAnims(this, key);
    for (const [id, fx] of Object.entries(CATALOG.status)) {
      if (!this.textures.exists(`status-${id}`)) continue;
      this.anims.create({ key: `status-${id}`, frames: this.anims.generateFrameNumbers(`status-${id}`, { start: 0, end: fx.frames - 1 }), frameRate: fx.frameRate, repeat: -1 });
    }
    // El controlador de la aplicación decide la primera escena (intro o reanudar partida).
    (this.registry.get('onBooted') as () => void)();
  }
}
