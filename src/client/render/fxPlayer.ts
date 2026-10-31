/**
 * Reproductor de efectos de movimiento, compartido por la mazmorra y el visor de
 * efectos (fx-viewer.html): así lo que se comprueba en el visor es exactamente
 * lo que se ve en el juego.
 *
 *  - play: un efecto anclado en un Pokémon (centro del cuerpo, o el suelo si
 *    el efecto "cae desde arriba"), en su dirección si tiene 8 variantes.
 *  - fly:  un efecto que viaja entre dos puntos (proyectil, o de vuelta al usuario).
 * Las animaciones (fx-<clave>-<dirección>) las crea BootScene a partir de
 * CATALOG.effects, con la duración de cada fotograma si viene de la ROM.
 */
import Phaser from 'phaser';
import type { Dir } from '../../shared/core/geometry';
import { CATALOG } from '../assets/catalog';
import { FX_COLORS } from './placeholders';

export interface Point {
  x: number;
  y: number;
}

export class FxPlayer {
  constructor(
    private readonly scene: Phaser.Scene,
    /** Multiplicador de velocidad de las animaciones (opción del juego). */
    private readonly speed: () => number,
    /** Desplazamiento del suelo respecto al centro de la casilla (px). */
    private readonly groundY: number,
    private readonly depth = 45,
  ) {}

  has(key: string | undefined): key is string {
    return !!key && !!CATALOG.effects[key] && this.scene.textures.exists(`fx-${key}`);
  }

  private animKey(key: string, dir: Dir) {
    return `fx-${key}-${(CATALOG.effects[key].dirs ?? 1) > 1 ? dir : 0}`;
  }

  /**
   * Efecto sobre un Pokémon situado en (x, y) (centro de su casilla). Se resuelve
   * al terminar (los que se repiten, a los 600 ms). Sin recurso, un destello.
   */
  play(key: string, x: number, y: number, dir: Dir): Promise<void> {
    if (!this.has(key)) {
      this.burst(x, y, FX_COLORS[key] ?? 0xffffff);
      return this.delay(220);
    }
    const def = CATALOG.effects[key];
    if (def.anchor === 'screen') return this.screen(key);
    const bottom = def.anchor === 'bottom';
    const spr = this.scene.add.sprite(x, bottom ? y + this.groundY : y - 8, `fx-${key}`).setOrigin(0.5, bottom ? 1 : 0.5).setDepth(this.depth);
    spr.anims.timeScale = this.speed();
    spr.play({ key: this.animKey(key, dir), repeat: def.loop ? -1 : 0 });
    return new Promise((resolve) => {
      const done = () => (spr.destroy(), resolve());
      if (def.loop) this.scene.time.delayedCall(600 / this.speed(), done);
      else spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, done);
    });
  }

  /** Efecto que viaja de `from` a `to` (repitiéndose), a la altura del cuerpo. */
  fly(key: string | undefined, from: Point, to: Point, dir: Dir, ms: number): Promise<void> {
    const dur = ms / this.speed();
    if (!this.has(key)) {
      const ball = this.scene.add.circle(from.x, from.y - 8, 3, FX_COLORS[key ?? ''] ?? 0xffffff).setDepth(this.depth - 5);
      return new Promise((resolve) =>
        this.scene.tweens.add({ targets: ball, x: to.x, y: to.y - 8, alpha: 0.3, duration: dur, onComplete: () => (ball.destroy(), resolve()) }),
      );
    }
    const spr = this.scene.add.sprite(from.x, from.y - 8, `fx-${key}`).setDepth(this.depth);
    spr.anims.timeScale = this.speed();
    spr.play({ key: this.animKey(key, dir), repeat: -1 });
    return new Promise((resolve) =>
      this.scene.tweens.add({ targets: spr, x: to.x, y: to.y - 8, duration: dur, onComplete: () => (spr.destroy(), resolve()) }),
    );
  }

  /**
   * Efecto a pantalla completa (tipo Screen del juego): cubre la vista de la
   * cámara, con la opacidad de cada fotograma. [INCIERTO] La mezcla exacta
   * (el juego la hace con el hardware de la DS) y el sentido de row_height.
   */
  screen(key: string): Promise<void> {
    if (!this.has(key)) return Promise.resolve();
    const def = CATALOG.effects[key];
    const view = this.scene.cameras.main.worldView;
    const spr = this.scene.add.sprite(view.centerX, view.centerY, `fx-${key}`).setDepth(this.depth + 10);
    spr.setScale(Math.max(view.width / def.frameWidth, view.height / def.frameHeight));
    spr.anims.timeScale = this.speed();
    const alpha = (i: number) => def.alphas?.[i] ?? 1;
    spr.setAlpha(alpha(0));
    spr.on(Phaser.Animations.Events.ANIMATION_UPDATE, (_a: unknown, frame: Phaser.Animations.AnimationFrame) => spr.setAlpha(alpha(frame.index - 1)));
    spr.play({ key: this.animKey(key, 0 as Dir), repeat: 0 });
    return new Promise((resolve) => spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => (spr.destroy(), resolve())));
  }

  /** Reserva sin recurso: un destello de color. */
  burst(x: number, y: number, color: number) {
    const c = this.scene.add.circle(x, y, 4, color, 0.8).setDepth(this.depth - 5);
    this.scene.tweens.add({ targets: c, scale: 3, alpha: 0, duration: 220 / this.speed(), onComplete: () => c.destroy() });
  }

  private delay(ms: number) {
    return new Promise<void>((r) => this.scene.time.delayedCall(ms / this.speed(), r));
  }
}
