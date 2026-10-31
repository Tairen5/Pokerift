/**
 * Recreación del opening de Exploradores del Cielo con las capas de
 * Assets/Intro (tools/build-intro-assets.mjs). Orden de las escenas según la
 * descripción del opening original:
 *   0. Aviso de fan game (en lugar de los logos de las compañías).
 *   1. Treasure Town desde el cielo: la cámara baja mientras Shaymin cruza
 *      de derecha a izquierda dejando unos pocos pétalos.
 *   2. Lapras nadando por el mar con un grupo de Pelipper volando encima.
 *   3. Imagen que se desplaza: cofre de monedas y objetos sobre las ruinas.
 *   4. Pikachu y Vulpix por un camino de tierra.
 *   5. Destello → logo (pantalla de título, TitleScene).
 * No hay recursos para el Engranaje del Tiempo, así que esa parte se omite.
 * Cualquier tecla o clic salta la intro.
 */
import Phaser from 'phaser';
import { CATALOG } from '../assets/catalog';
import { animKey } from './BootScene';
import { STAGE_H, STAGE_W, app, fitStage, msgText } from './stage';

/** Duración de cada escena (ms) sin contar los fundidos. */
const SCENE_MS = 5600;

/** Rectángulo del mundo visible (el zoom entero puede mostrar algo más que 384×216). */
interface View {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  w: number;
  h: number;
}

export class IntroScene extends Phaser.Scene {
  private skipped = false;
  private layer!: Phaser.GameObjects.Container;
  private spawners: Phaser.Time.TimerEvent[] = [];
  private view!: View;

  constructor() {
    super('intro');
  }

  create() {
    this.skipped = false;
    fitStage(this);
    const cam = this.cameras.main;
    cam.setBackgroundColor('#000000');
    const w = this.scale.width / cam.zoom, h = this.scale.height / cam.zoom;
    this.view = { x0: (STAGE_W - w) / 2, y0: (STAGE_H - h) / 2, x1: (STAGE_W + w) / 2, y1: (STAGE_H + h) / 2, w, h };
    this.makeSparkle();
    const skip = () => this.finish();
    this.input.keyboard!.once('keydown', skip);
    this.input.once('pointerdown', skip);
    void this.run();
  }

  /** Destello de cuatro puntas (brillo de las monedas). */
  private makeSparkle() {
    if (this.textures.exists('intro-sparkle')) return;
    const t = this.textures.createCanvas('intro-sparkle', 11, 11)!;
    const ctx = t.getContext();
    const px = (x: number, y: number, c: string) => ((ctx.fillStyle = c), ctx.fillRect(x, y, 1, 1));
    for (let i = 0; i < 11; i++) {
      const d = Math.abs(i - 5);
      const c = d === 0 ? '#ffffff' : d < 3 ? '#fff8c0' : '#f8d850';
      if (d < 5) {
        px(5, i, c);
        px(i, 5, c);
      }
    }
    px(4, 4, '#fff8c0'); px(6, 4, '#fff8c0'); px(4, 6, '#fff8c0'); px(6, 6, '#fff8c0');
    t.refresh();
  }

  /** Termina (o salta) la intro con un destello blanco hacia el logo. */
  private finish() {
    if (this.skipped) return;
    this.skipped = true;
    this.tweens.killAll();
    this.time.removeAllEvents();
    const cam = this.cameras.main;
    cam.flash(400, 255, 255, 255);
    cam.once('cameraflashcomplete', () => app(this).toTitle());
  }

  private wait(ms: number) {
    return new Promise<void>((res) => this.time.delayedCall(ms, () => res()));
  }

  private fade(out: boolean, ms = 360) {
    return new Promise<void>((res) => {
      const cam = this.cameras.main;
      if (out) cam.fadeOut(ms, 0, 0, 0);
      else cam.fadeIn(ms, 0, 0, 0);
      cam.once(out ? 'camerafadeoutcomplete' : 'camerafadeincomplete', () => res());
    });
  }

  private newLayer() {
    this.spawners.forEach((t) => t.remove());
    this.spawners = [];
    this.layer?.destroy();
    this.layer = this.add.container(0, 0);
    return this.layer;
  }

  private async run() {
    this.notice();
    await this.fade(false, 500);
    await this.wait(1600);
    await this.fade(true, 500);
    const scenes = [() => this.treasureTown(), () => this.sea(), () => this.treasures(), () => this.dirtPath()];
    for (const [i, scene] of scenes.entries()) {
      if (this.skipped) return;
      scene();
      await this.fade(false);
      await this.wait(SCENE_MS);
      if (this.skipped) return;
      // La última escena termina con el destello hacia el logo, sin fundido a negro.
      if (i < scenes.length - 1) await this.fade(true);
    }
    this.finish();
  }

  /** 0. Aviso (sustituye a los logos de las compañías). */
  private notice() {
    const L = this.newLayer();
    L.add(msgText(this, STAGE_W / 2, STAGE_H / 2 - 12, 'Pokerift', { origin: 0.5, tint: 0xf8e050 }));
    L.add(msgText(this, STAGE_W / 2, STAGE_H / 2 + 4, 'Fan game sin ánimo de lucro', { origin: 0.5 }));
    L.add(msgText(this, STAGE_W / 2, STAGE_H / 2 + 18, 'Pokémon es de Nintendo · Creatures · GAME FREAK', { origin: 0.5, tint: 0xb8c8f0 }));
  }

  /** 1. Treasure Town: la cámara baja del cielo al pueblo; Shaymin cruza de derecha a izquierda. */
  private treasureTown() {
    const L = this.newLayer();
    const v = this.view;
    const k = v.w / 256; // la panorámica ocupa todo el ancho visible
    const pano = this.add.image(v.x0, v.y0, 'intro-town-pano').setOrigin(0).setScale(k);
    L.add(pano);
    this.tweens.add({ targets: pano, y: v.y1 - 576 * k, duration: SCENE_MS + 300, ease: 'Sine.easeInOut' });
    const names = this.textures.get('intro-town').getFrameNames();
    const bubbles = names.filter((n) => n.startsWith('bubble'));
    const petals = names.filter((n) => n.startsWith('petal'));
    const shaymin = names.filter((n) => n.startsWith('shaymin')).sort((a, b) => Number(a.split('-')[1]) - Number(b.split('-')[1]));
    const flap = shaymin.slice(-3);
    const rnd = Phaser.Math.Between;

    // Unas pocas pompas de luz en el cielo al principio.
    this.spawners.push(
      this.time.addEvent({
        delay: 450, repeat: 5, callback: () => {
          const b = this.add.image(rnd(v.x0 + 20, v.x1 - 20), v.y1 + 16, 'intro-town', Phaser.Utils.Array.GetRandom(bubbles)).setScale(0.3 + Math.random() * 0.25).setAlpha(0.6);
          L.add(b);
          this.tweens.add({ targets: b, y: v.y0 - 30, x: b.x + rnd(-20, 20), alpha: 0.15, duration: rnd(3000, 4200), onComplete: () => b.destroy() });
        },
      }),
    );

    // Shaymin entra por la derecha aleteando y sale por la izquierda.
    const s = this.add.image(v.x1 + 70, 78, 'intro-town', flap[0]);
    L.add(s);
    let f = 0;
    this.spawners.push(this.time.addEvent({ delay: 110, loop: true, callback: () => s.setFrame(flap[++f % flap.length]) }));
    const start = { x: v.x1 + 70, y: 78 }, end = { x: v.x0 - 80, y: 104 };
    this.tweens.addCounter({
      from: 0, to: 1, delay: 700, duration: 3600, ease: 'Linear',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        s.setPosition(Phaser.Math.Linear(start.x, end.x, t), Phaser.Math.Linear(start.y, end.y, t) + Math.sin(t * Math.PI * 3) * 10);
      },
    });
    // Estela ligera de pétalos detrás de Shaymin.
    this.spawners.push(
      this.time.addEvent({
        delay: 230, loop: true, callback: () => {
          if (s.x > v.x1 + 20 || s.x < v.x0 - 20) return;
          const p = this.add.image(s.x + 18 + rnd(-6, 6), s.y + rnd(-6, 10), 'intro-town', Phaser.Utils.Array.GetRandom(petals)).setScale(0.55 + Math.random() * 0.3);
          L.addAt(p, L.getIndex(s));
          this.tweens.add({ targets: p, y: p.y + rnd(70, 130), x: p.x + rnd(10, 50), angle: rnd(-240, 240), alpha: 0, duration: rnd(2000, 2800), onComplete: () => p.destroy() });
        },
      }),
    );
  }

  /** 2. Mar: Lapras nada pegado a la superficie y un grupo de Pelipper vuela por encima. */
  private sea() {
    const L = this.newLayer();
    const v = this.view;
    const k = v.w / 288;
    const HORIZON = 176; // línea del horizonte en la imagen (px)
    const sky = this.add.image(v.x0, v.y0, 'intro-sea-sky').setOrigin(0).setScale(k);
    const water = this.add.tileSprite(v.x0, 0, v.w, 120 * k, 'intro-sea-water').setOrigin(0).setTileScale(k).setAlpha(0.45);
    L.add([sky, water]);

    // Lapras (y su estela) van anclados a la imagen del mar: se mueven con ella.
    const lapras = this.add.sprite(v.x1 + 70, 0, 'intro-lapras', 'lapras-0').setOrigin(0.5, 1);
    L.add(lapras);
    let bob = 0;
    const place = () => {
      water.setY(sky.y + (HORIZON + 14) * k);
      lapras.setY(sky.y + (HORIZON + 40) * k + Math.sin(bob) * 1.5);
    };
    place();
    // Leve paneo hacia abajo (de más cielo a más mar).
    this.tweens.add({ targets: sky, y: v.y1 - 264 * k, duration: SCENE_MS + 300, ease: 'Sine.easeInOut', onUpdate: place });
    this.spawners.push(
      this.time.addEvent({ delay: 16, loop: true, callback: () => ((water.tilePositionX += 0.5), (bob += 0.08), place()) }),
    );
    let f = 0;
    this.spawners.push(this.time.addEvent({ delay: 170, loop: true, callback: () => lapras.setFrame(`lapras-${++f % 3}`) }));
    this.tweens.add({ targets: lapras, x: v.x0 - 80, duration: SCENE_MS + 600, ease: 'Linear' });

    // Pelipper en formación, volando en la misma dirección algo más deprisa.
    if (this.anims.exists('intro-pelipper-walk')) {
      const formation = [[0, 0], [34, -14], [34, 16], [68, -26]];
      formation.forEach(([dx, dy], i) => {
        const p = this.add.sprite(v.x1 + 60 + dx, v.y0 + 46 + dy, 'intro-pelipper').play({ key: 'intro-pelipper-walk', startFrame: i % 3 });
        L.add(p);
        this.tweens.add({ targets: p, x: v.x0 - 120 + dx, duration: SCENE_MS - 400, delay: 500, ease: 'Linear' });
        this.tweens.add({ targets: p, y: p.y + 5, duration: 600 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      });
    }
  }

  /** 3. Imagen que se desplaza: cofre, monedas y objetos sobre las ruinas. */
  private treasures() {
    const L = this.newLayer();
    const v = this.view;
    const k = v.w / 360;
    const scene = this.add.container(v.x0, v.y0);
    const bg = this.add.image(0, 0, 'intro-ruins-back').setOrigin(0).setScale(k);
    const glow = this.add.image(0, 0, 'intro-ruins-back').setOrigin(0).setScale(k).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    scene.add([bg, glow]);
    L.add(scene);
    this.tweens.add({ targets: glow, alpha: 0.28, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: scene, y: v.y1 - 384 * k, duration: SCENE_MS + 300, ease: 'Linear' });

    const atlas = this.textures.get('intro-treasure');
    const coins: Phaser.GameObjects.Image[] = [];
    let chest: Phaser.GameObjects.Image | undefined;
    atlas.getFrameNames().forEach((name, i) => {
      const fr = atlas.get(name);
      // Las coordenadas del atlas coinciden con la composición original.
      const x = (fr.cutX + fr.width / 2) * k, y = (fr.cutY + fr.height / 2) * k;
      const item = this.add.image(x, y, 'intro-treasure', name).setScale(k);
      scene.add(item);
      if (name.startsWith('coin')) {
        coins.push(item);
        // Brillo de la moneda: copia aditiva que parpadea.
        const shine = this.add.image(x, y, 'intro-treasure', name).setScale(k).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
        scene.add(shine);
        this.tweens.add({ targets: shine, alpha: 0.9, duration: 260, yoyo: true, repeat: -1, repeatDelay: 500 + i * 170, delay: i * 230 });
        this.tweens.add({ targets: [item, shine], y: y - 3, duration: 700 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else {
        if (name === 'chest') chest = item;
        // Los objetos flotan y se balancean.
        this.tweens.add({ targets: item, y: y - 6, duration: 1100 + i * 140, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 120 });
        this.tweens.add({ targets: item, angle: { from: -3, to: 3 }, duration: 1500 + i * 110, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    });
    // Destellos de estrella sobre las monedas y el cofre.
    const targets = [...coins, ...(chest ? [chest] : [])];
    this.spawners.push(
      this.time.addEvent({
        delay: 140, loop: true, callback: () => {
          const c = Phaser.Utils.Array.GetRandom(targets);
          if (!c) return;
          const spread = c === chest ? 40 : 8;
          const sp = this.add.image(c.x + Phaser.Math.Between(-spread, spread), c.y + Phaser.Math.Between(-spread, spread / 2), 'intro-sparkle').setScale(0.6);
          scene.add(sp);
          this.tweens.add({ targets: sp, scale: 2.4, angle: 45, duration: 240, yoyo: true, onComplete: () => sp.destroy() });
        },
      }),
    );
  }

  /** 4. Camino de tierra: Pikachu y Vulpix lo recorren de izquierda a derecha. */
  private dirtPath() {
    const L = this.newLayer();
    const v = this.view;
    // Misma escala y posición para fondo y primer plano: quedan alineados como en la composición original.
    const k = Math.max(v.w / 384, v.h / 216) * 1.08;
    const ox = (STAGE_W - 384 * k) / 2, oy = (STAGE_H - 216 * k) / 2;
    const back = this.add.image(ox, oy, 'intro-plains-back').setOrigin(0).setScale(k);
    const front = this.add.image(ox, oy, 'intro-plains-front').setOrigin(0).setScale(k);
    L.add([back, front]);
    // Leve parallax dentro del margen sobrante (nunca se ven los bordes).
    const margin = (384 * k - v.w) / 2;
    this.tweens.add({ targets: back, x: ox - margin * 0.4, duration: SCENE_MS + 300, ease: 'Linear' });
    this.tweens.add({ targets: front, x: ox - margin * 0.9, duration: SCENE_MS + 300, ease: 'Linear' });

    const pathY = oy + 186 * k; // centro del camino de tierra en la imagen
    const walkers: Phaser.GameObjects.Sprite[] = [];
    if (CATALOG.pokemon.pikachu && this.anims.exists(animKey('pikachu', 'walk', 2))) {
      walkers.push(this.add.sprite(0, 0, 'mon-pikachu-walk').play(animKey('pikachu', 'walk', 2)));
    }
    if (this.anims.exists('intro-vulpix-walk')) walkers.push(this.add.sprite(0, 0, 'intro-vulpix').play('intro-vulpix-walk'));
    walkers.forEach((w, i) => {
      w.setOrigin(0.5, 0.7).setPosition(v.x0 - 20 - i * 30, pathY + i * 2);
      L.add(w);
      // Acompañan al primer plano en su desplazamiento y avanzan por el camino.
      this.tweens.add({ targets: w, x: v.x1 + 30 - i * 30, duration: SCENE_MS + 200, ease: 'Linear' });
    });
  }
}
