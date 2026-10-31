/**
 * Sprite de Pokémon reutilizable (mazmorra y zonas exteriores).
 *
 * - Sombra en el suelo como en los juegos de DS: una elipse de píxeles plana y
 *   nítida, sin contorno, del tamaño de PMDCollab (<ShadowSize>: 8×4, 14×6,
 *   22×8 px). Negra para enemigos y compañeros IA; amarilla para los Pokémon
 *   del equipo que manejan jugadores (como en Exploradores del Cielo).
 * - El cuerpo se ancla por frame al punto de apoyo marcado en Shadow-Anim, así
 *   que el Pokémon pisa siempre el mismo punto aunque cambie de animación o el
 *   frame tenga otro tamaño (sin "saltos").
 * - Idle/andar/dormir en bucle; ataque, disparo y daño vuelven solos al reposo.
 *   Al terminar de andar se espera un instante antes de volver al idle, para
 *   que el ciclo de andar no se corte al encadenar pasos.
 */
import Phaser from 'phaser';
import type { Dir } from '../../shared/core/geometry';
import { DIR_DELTA } from '../../shared/core/geometry';
import { type AnimAction, type AnimDef, CATALOG } from '../assets/catalog';
import { pokemonPlaceholderKey } from './placeholders';
import { ROM_MOVE_FX } from '../assets/move-fx.rom.generated';

export type MonAnim = AnimAction;
export type Marker = 'shadow' | 'player' | 'partner';

/**
 * Plantilla de sombra de PMDCollab (la de sus hojas Shadow-Anim, igual para todas
 * las especies): las tres tallas anidadas, 0 = verde (8×4), 1 = + rojo (14×6),
 * 2 = + azul (22×8). La W es el punto de apoyo (de talla 0).
 */
const SHADOW_TEMPLATE = [
  '.......BBBBBBBB.......',
  '...BBBBBRRRRRRBBBBB...',
  '.BBBBRRRGGGGGGRRRBBBB.',
  'BBBBRRRGGGGGGGGRRRBBBB',
  'BBBBRRRGGGGWGGGRRRBBBB',
  '.BBBBRRRGGGGGGRRRBBBB.',
  '...BBBBBRRRRRRBBBBB...',
  '.......BBBBBBBB.......',
];
const LOOPING: ReadonlySet<MonAnim> = new Set(['idle', 'walk', 'sleep']);
/** Margen tras el último paso antes de volver al idle (permite encadenar pasos). */
const IDLE_GRACE_MS = 140;
/** Opacidad de la sombra negra: en los juegos de DS es casi negra del todo. */
const BLACK_SHADOW_ALPHA = 0.9;

/** Margen alrededor de la plantilla en la textura (para el borde amarillo). */
const PAD = 2;

/** Talla (0–2) de cada píxel de la plantilla, en coordenadas de la textura (9 = fuera). */
function shadowLevel(x: number, y: number): number {
  const c = SHADOW_TEMPLATE[y - PAD]?.[x - PAD];
  return c === 'G' || c === 'W' ? 0 : c === 'R' ? 1 : c === 'B' ? 2 : 9;
}

/**
 * Genera (una vez por escena) la textura de sombra a partir de la plantilla,
 * píxel a píxel y sin antialiasing:
 *   - negra: la forma de la talla del Pokémon;
 *   - amarilla (jugadores): esa misma forma en ocre plano #a16a00 y, justo donde
 *     termina, un borde de 2 px por todo el contorno: amarillo intenso #d8b800 y,
 *     por fuera, amarillo pálido #f8e868. Así asoma también bajo los pies, como
 *     en Exploradores del Cielo (medido en capturas: ~18 px de ancho en Torchic).
 * Devuelve también el origen para que el punto de apoyo caiga en el suelo.
 */
function shadowTexture(scene: Phaser.Scene, size: 0 | 1 | 2, yellow: boolean): { key: string; ox: number; oy: number } {
  // Sombra original del juego (dungeon.bin 995, importada de la ROM con import-pmd-scraper): si existe, manda.
  const rom = ROM_MOVE_FX.shadows?.[`${size}-${yellow ? 'y' : 'k'}`];
  if (rom && scene.textures.exists(`shadow-rom-${size}-${yellow ? 'y' : 'k'}`)) return { key: `shadow-rom-${size}-${yellow ? 'y' : 'k'}`, ox: rom.ox, oy: rom.oy };
  const w = SHADOW_TEMPLATE[0].length + PAD * 2, h = SHADOW_TEMPLATE.length + PAD * 2;
  const ox = (PAD + 11.5) / w, oy = (PAD + 4.5) / h; // centro del píxel W
  const key = `shadow-${size}-${yellow ? 'y' : 'k'}`;
  if (scene.textures.exists(key)) return { key, ox, oy };
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  const inner = (x: number, y: number) => shadowLevel(x, y) <= size;
  /** Anillo n (1, 2) alrededor de la forma: a n px en cruz (4 vecinos) del interior. */
  const ring = (x: number, y: number, n: number): boolean =>
    n === 0 ? inner(x, y) : ring(x, y, n - 1) || ring(x - 1, y, n - 1) || ring(x + 1, y, n - 1) || ring(x, y - 1, n - 1) || ring(x, y + 1, n - 1);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (inner(x, y)) ctx.fillStyle = yellow ? '#a16a00' : '#000000';
      else if (yellow && ring(x, y, 1)) ctx.fillStyle = '#d8b800';
      else if (yellow && ring(x, y, 2)) ctx.fillStyle = '#f8e868';
      else continue;
      ctx.fillRect(x, y, 1, 1);
    }
  tex.refresh();
  return { key, ox, oy };
}

export function animKey(species: string, action: string, dir: number) {
  return `${species}-${action}-${dir}`;
}

export interface PokemonSpriteOptions {
  marker: Marker;
  /** Desplazamiento vertical del punto de apoyo respecto al origen del contenedor. */
  groundY?: number;
  /** Multiplicador de velocidad de las animaciones (opción de velocidad del juego). */
  timeScale?: number;
}

export class PokemonSprite {
  readonly container: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  readonly animated: boolean;
  /** Sombra en el suelo (negra o amarilla). */
  readonly shadow: Phaser.GameObjects.Image;
  dir: Dir;
  base: 'idle' | 'sleep' = 'idle';
  private facingArrow?: Phaser.GameObjects.Image;
  private idleTimer?: Phaser.Time.TimerEvent;
  private readonly groundY: number;

  constructor(
    private scene: Phaser.Scene,
    readonly species: string,
    x: number,
    y: number,
    dir: Dir,
    opts: PokemonSpriteOptions,
  ) {
    this.groundY = opts.groundY ?? 0;
    this.dir = dir;
    const assets = CATALOG.pokemon[species];
    this.container = scene.add.container(x, y);
    const g = this.groundY;
    const parts: Phaser.GameObjects.GameObject[] = [];
    const yellow = opts.marker !== 'shadow';
    const sh = shadowTexture(scene, assets?.shadowSize ?? 1, yellow);
    this.shadow = scene.add.image(0, g, sh.key).setOrigin(sh.ox, sh.oy);
    if (!yellow) this.shadow.setAlpha(BLACK_SHADOW_ALPHA);
    parts.push(this.shadow);

    this.animated = !!assets?.anims.idle && scene.anims.exists(animKey(species, 'idle', dir));
    if (this.animated) {
      const s = scene.add.sprite(0, g, `mon-${species}-idle`);
      s.anims.timeScale = opts.timeScale ?? 1;
      // Re-anclar en cada frame: el punto de apoyo puede variar entre frames.
      s.on(Phaser.Animations.Events.ANIMATION_UPDATE, () => this.anchor());
      s.on(Phaser.Animations.Events.ANIMATION_START, () => this.anchor());
      s.on(Phaser.Animations.Events.ANIMATION_RESTART, () => this.anchor());
      this.body = s;
    } else {
      // Placeholder: el círculo de la textura (centro en y=11 de 24) se apoya en el suelo.
      this.body = scene.add.image(0, g - 6.5, pokemonPlaceholderKey(species));
      this.facingArrow = scene.add.image(0, g - 6.5, 'ph-facing');
    }
    parts.push(this.body);
    if (this.facingArrow) parts.push(this.facingArrow);
    this.container.add(parts);
    this.play('idle', dir);
  }

  private def(action: MonAnim): AnimDef | undefined {
    return CATALOG.pokemon[this.species]?.anims[action];
  }

  /** Coloca el cuerpo para que el punto de apoyo del frame actual caiga en el suelo. */
  private anchor() {
    if (!this.animated) return;
    const s = this.body as Phaser.GameObjects.Sprite;
    const key = s.anims.currentAnim?.key;
    if (!key) return;
    const [, action, dirStr] = key.split('-');
    const def = this.def(action as MonAnim);
    if (!def) return;
    const row = def.directions === 8 ? Number(dirStr) : 0;
    const frame = Math.max(0, (s.anims.currentFrame?.index ?? 1) - 1);
    const [ox, oy] = def.shadowPerFrame?.[row]?.[frame] ?? def.shadow ?? [0, 4];
    s.setPosition(-ox, this.groundY - oy);
  }

  /** Duración (ms, a velocidad x1) de una animación completa. */
  duration(action: MonAnim): number {
    const d = this.def(action);
    if (!d?.durations) return 0;
    return (d.durations.reduce((a, b) => a + b, 0) * 1000) / 60;
  }

  /** Momento (ms) en el que el golpe impacta según AnimData (HitFrame). */
  hitDelay(action: MonAnim): number {
    const d = this.def(action);
    if (!d?.durations) return 0;
    const hit = d.hitFrame ?? Math.floor(d.durations.length / 2);
    return (d.durations.slice(0, hit).reduce((a, b) => a + b, 0) * 1000) / 60;
  }

  setTimeScale(v: number) {
    if (this.animated) (this.body as Phaser.GameObjects.Sprite).anims.timeScale = v;
  }

  setBase(base: 'idle' | 'sleep') {
    if (this.base === base) return;
    this.base = base;
    this.play(base, this.dir);
  }

  /**
   * Reproduce una animación mirando en `dir`. Las de un solo ciclo vuelven
   * al reposo al acabar; pedir el reposo justo después de andar espera un
   * instante por si llega otro paso.
   */
  play(action: MonAnim, dir: Dir = this.dir, force = false) {
    const changedDir = dir !== this.dir;
    this.dir = dir;
    this.updateArrow();
    if (!this.animated) return;
    const s = this.body as Phaser.GameObjects.Sprite;
    const has = (a: MonAnim) => this.scene.anims.exists(animKey(this.species, a, dir));
    const resolved: MonAnim = has(action) ? action : has(this.base) ? this.base : 'idle';
    const current = s.anims.currentAnim?.key.split('-')[1] as MonAnim | undefined;

    if (!force && resolved === this.base && current === 'walk' && !changedDir && s.anims.isPlaying) {
      // Deja terminar el paso: si no llega otro movimiento, pasa al reposo.
      // (force=true al vencer el margen; si no, el temporizador se reprogramaría sin fin
      // y el Pokémon seguiría "andando" parado.)
      if (!this.idleTimer) this.idleTimer = this.scene.time.delayedCall(IDLE_GRACE_MS, () => {
        this.idleTimer = undefined;
        this.play(this.base, this.dir, true);
      });
      return;
    }
    this.idleTimer?.remove();
    this.idleTimer = undefined;
    s.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
    // Los bucles no se reinician si ya se están reproduciendo (el idle sigue fluido).
    s.play(animKey(this.species, resolved, dir), LOOPING.has(resolved));
    if (!LOOPING.has(resolved)) {
      s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.play(this.base, this.dir));
    }
    this.anchor();
  }

  private updateArrow() {
    if (!this.facingArrow) return;
    const d = DIR_DELTA[this.dir];
    this.facingArrow.setPosition(d.x * 10, this.groundY - 6.5 + d.y * 10);
    this.facingArrow.setRotation(Math.atan2(d.y, d.x) + Math.PI / 2);
  }

  destroy() {
    this.idleTimer?.remove();
    this.container.destroy();
  }
}
