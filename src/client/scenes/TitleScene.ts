/**
 * Pantalla de título: llanura de la intro con nubes en movimiento, logotipo
 * con la fuente de títulos de PMD y "Pulsa Intro" parpadeante.
 */
import Phaser from 'phaser';
import { STAGE_H, STAGE_W, app, fitStage, msgText, pmdText } from './stage';

/** Fondo animado compartido por el título y el menú principal. */
export function titleBackdrop(scene: Phaser.Scene, dim = 0) {
  // Más grande que el escenario para cubrir también los márgenes que deja el zoom entero.
  const K = 1.4, M = 60;
  const back = scene.add.image(-M, -M / 2, 'intro-plains-back').setOrigin(0).setScale(K);
  const front = scene.add.image(-M, STAGE_H + M / 2, 'intro-plains-front').setOrigin(0, 1).setScale(K);
  scene.tweens.add({ targets: back, x: STAGE_W + M - 384 * K, duration: 24000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: front, x: STAGE_W + M - 384 * K, duration: 16000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const petals = scene.textures.get('intro-town').getFrameNames().filter((n) => n.startsWith('petal'));
  scene.time.addEvent({
    delay: 380, loop: true, callback: () => {
      const p = scene.add.image(Phaser.Math.Between(-60, STAGE_W), -10, 'intro-town', Phaser.Utils.Array.GetRandom(petals)).setScale(0.6).setDepth(5);
      scene.tweens.add({ targets: p, y: STAGE_H + 20, x: p.x + Phaser.Math.Between(60, 160), angle: Phaser.Math.Between(-360, 360), duration: Phaser.Math.Between(4000, 6500), onComplete: () => p.destroy() });
    },
  });
  if (dim) scene.add.rectangle(-M, -M, STAGE_W + 2 * M, STAGE_H + 2 * M, 0x000010, dim).setOrigin(0).setDepth(6);
}

export function logo(scene: Phaser.Scene, y: number) {
  const title = pmdText(scene, STAGE_W / 2, y, 'Pokerift', { scale: 2, tint: 0xffd84a });
  title.container.setDepth(10);
  const sub = pmdText(scene, STAGE_W / 2, y + 30, 'Exploradores del Mundo Misterioso', { tint: 0xe8f0ff });
  sub.container.setDepth(10);
  return { title, sub };
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  /**
   * Pantalla de título como la del original: fondo dorado de Assets/Intro/logo.png
   * con un brillo que late, el logo apareciendo tras el destello de la intro y
   * "Pulsa Intro" parpadeando. "Pokerift" va debajo como subtítulo del fan game.
   */
  create() {
    (this as Phaser.Scene & { __leaving?: boolean }).__leaving = false;
    fitStage(this);
    this.cameras.main.fadeIn(600, 255, 255, 255);
    // Fondo dorado, mayor que el escenario para cubrir los márgenes del zoom entero.
    const back = this.add.image(STAGE_W / 2, STAGE_H / 2, 'intro-title-back').setScale(2);
    const glow = this.add.image(STAGE_W / 2, STAGE_H / 2, 'intro-title-back').setScale(2).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.tweens.add({ targets: glow, alpha: 0.35, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    void back;
    const logoImg = this.add.image(STAGE_W / 2, 74, 'intro-logo').setDepth(10).setScale(1.25).setAlpha(0);
    this.tweens.add({ targets: logoImg, scale: 1, alpha: 1, duration: 700, ease: 'Back.easeOut' });
    const sub = pmdText(this, STAGE_W / 2, 140, 'Pokerift', { tint: 0xf8e050 });
    sub.container.setDepth(10).setAlpha(0);
    this.tweens.add({ targets: sub.container, alpha: 1, duration: 500, delay: 500 });
    const press = msgText(this, STAGE_W / 2, 170, 'Pulsa Intro', { origin: 0.5 }).setDepth(10).setAlpha(0);
    this.tweens.add({ targets: press, alpha: { from: 1, to: 0.15 }, duration: 650, delay: 900, yoyo: true, repeat: -1 });
    msgText(this, STAGE_W / 2, STAGE_H - 15, 'Fan game sin ánimo de lucro · Pokémon es de Nintendo', { origin: 0.5 }).setAlpha(0.75).setDepth(10);

    const go = () => app(this).toMenu();
    const onKey = (e: KeyboardEvent) => {
      if (['Enter', 'Space', 'KeyZ'].includes(e.code)) go();
    };
    window.addEventListener('keydown', onKey);
    this.events.once('shutdown', () => window.removeEventListener('keydown', onKey));
    this.input.once('pointerdown', go);
  }
}
