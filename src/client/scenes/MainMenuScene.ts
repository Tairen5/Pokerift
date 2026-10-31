/**
 * Menú principal al estilo del de Exploradores del Cielo («Top Menu»):
 *  - Fondo: una de las 7 ilustraciones originales al azar (BACK/s09p04a–s09p10a.bgp, las que nombra
 *    la overlay 0 del menú; ver tools/import-rom-ui.mjs), a pantalla completa. Sin la ROM importada,
 *    el prado del título.
 *  - Ventana de opciones y caja inferior con la descripción de la opción, en dos líneas, como el
 *    original. Los ajustes van en «Otros», como allí. Mantener L oculta la interfaz para ver la
 *    ilustración (Mystery Dungeon Wiki).
 *  [INCIERTO] Posición exacta de las ventanas en la pantalla de la DS.
 * Teclado (↑↓, Intro, Esc, L) y ratón.
 */
import Phaser from 'phaser';
import { ROM_UI } from '../assets/ui-rom.generated';
import { type MenuOptionId, STAGE_H, STAGE_W, app, fitStage, msgText, pmdWindow } from './stage';
import { logo, titleBackdrop } from './TitleScene';
import { music } from '../audio/music';

interface Option {
  id: MenuOptionId | 'other' | 'back';
  label: () => string;
  desc: string;
}

/** Ilustración del menú elegida en esta sesión (el juego la sortea al cargar el menú). */
let backgroundIndex = -1;

export class MainMenuScene extends Phaser.Scene {
  private index = 0;
  private items: Phaser.GameObjects.BitmapText[] = [];
  private hits: Phaser.GameObjects.Zone[] = [];
  private cursor!: Phaser.GameObjects.Image;
  private desc!: Phaser.GameObjects.BitmapText;
  private options: Option[] = [];
  private ui: Phaser.GameObjects.GameObject[] = [];
  private submenu = false;
  private locked = false;

  constructor() {
    super('menu');
  }

  private mainOptions(): Option[] {
    return [
      { id: 'solo', label: () => 'Solitario', desc: 'Empieza tu aventura en solitario desde tu\ncasa, en el Risco Sharpedo.' },
      { id: 'create', label: () => 'Crear sala', desc: 'Crea una sala cooperativa y comparte\nsu código con hasta 3 amigos.' },
      { id: 'join', label: () => 'Unirse a sala', desc: 'Únete a la sala cooperativa de un amigo\ncon su código de 5 letras.' },
      { id: 'history', label: () => 'Diario', desc: 'Consulta tus expediciones anteriores.' },
      { id: 'other', label: () => 'Otros', desc: 'Cambia los ajustes y consulta\nlos créditos.' },
    ];
  }

  private otherOptions(): Option[] {
    return [
      { id: 'speed', label: () => `Velocidad: x${app(this).animationSpeed()}`, desc: 'Velocidad de las animaciones\nen las mazmorras.' },
      { id: 'music', label: () => `Música: ${app(this).musicVolume() ? `${Math.round(app(this).musicVolume() * 100)}%` : 'No'}`, desc: 'Volumen de la música.' },
      { id: 'credits', label: () => 'Créditos', desc: 'Procedencia de los recursos gráficos\ny sus autores.' },
      { id: 'back', label: () => 'Salir', desc: 'Vuelve al menú principal.' },
    ];
  }

  create() {
    music.play(2); // «Top Menu Theme» (B_SYS_MENU)
    this.locked = false;
    this.submenu = false;
    this.input.enabled = true;
    fitStage(this);
    this.cameras.main.fadeIn(350, 0, 0, 0);

    const backgrounds = ROM_UI?.menuBackgrounds ?? [];
    if (backgrounds.length) {
      if (backgroundIndex < 0) backgroundIndex = Math.floor(Math.random() * backgrounds.length);
      this.cameras.main.setBackgroundColor('#000000');
      const bg = this.add.image(STAGE_W / 2, STAGE_H / 2, `menu-bg-${backgroundIndex}`);
      // Cubre toda la ventana visible (no solo el escenario de 384×216) recortando lo que sobra,
      // con una escala tal que cada píxel de la ilustración ocupe un número entero de píxeles de
      // pantalla (la cámara usa zoom entero): nítida, sin píxeles de tamaños distintos.
      const cover = () => {
        const z = this.cameras.main.zoom;
        const need = Math.max(this.scale.width / z / bg.width, this.scale.height / z / bg.height);
        bg.setScale(Math.ceil(need * z - 1e-6) / z);
      };
      cover();
      this.scale.on('resize', cover);
      this.events.once('shutdown', () => this.scale.off('resize', cover));
    } else {
      titleBackdrop(this, 0.25);
      logo(this, 26);
    }

    this.build(this.mainOptions(), 0);

    // Teclado del navegador (no la cola de Phaser): cada pulsación se procesa
    // una sola vez y al instante, aunque lleguen varias en el mismo frame.
    const onKey = (e: KeyboardEvent) => {
      if (this.locked || !this.scene.isActive()) return;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') this.select((this.index - 1 + this.options.length) % this.options.length);
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') this.select((this.index + 1) % this.options.length);
      else if (['Enter', 'Space', 'KeyZ'].includes(e.code)) this.choose();
      else if (e.code === 'Escape' || e.code === 'KeyX') this.back();
      else if (e.code === 'KeyL') this.setUiVisible(false);
      else return;
      e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyL') this.setUiVisible(true);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKeyUp);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKeyUp);
    });
  }

  /** Dibuja la ventana de opciones y la de descripción. */
  private build(options: Option[], index: number) {
    for (const o of this.ui) o.destroy();
    this.ui = [];
    this.options = options;
    const ROW = 15, X = 12, Y = 10;
    const W = Math.max(...options.map((o) => {
      const probe = this.add.bitmapText(0, 0, 'pmd-message', o.label());
      const w = probe.width;
      probe.destroy();
      return w;
    })) + 34;
    this.ui.push(pmdWindow(this, X, Y, W, options.length * ROW + 14).setDepth(10));
    this.hits = [];
    this.items = options.map((o, i) => {
      const t = msgText(this, X + 20, Y + 8 + i * ROW, o.label()).setDepth(11);
      const hit = this.add.zone(X + 4, Y + 6 + i * ROW, W - 8, ROW).setOrigin(0).setInteractive({ useHandCursor: true }).setDepth(12);
      hit.on('pointerover', () => this.select(i));
      hit.on('pointerdown', () => this.choose());
      this.ui.push(t, hit);
      this.hits.push(hit);
      return t;
    });
    this.cursor = this.add.image(0, 0, 'ui-cursor').setOrigin(0, 0.5).setDepth(12);
    const DH = 42;
    const box = pmdWindow(this, 12, STAGE_H - DH - 8, STAGE_W - 24, DH).setDepth(10);
    this.desc = msgText(this, 22, STAGE_H - DH + 1, '', { maxWidth: STAGE_W - 44 }).setDepth(11);
    this.ui.push(this.cursor, box, this.desc);
    this.select(Math.min(index, options.length - 1));
  }

  private select(i: number) {
    this.index = i;
    this.items.forEach((t, j) => t.setTint(j === i ? 0xf8e050 : 0xffffff));
    const t = this.items[i];
    this.tweens.killTweensOf(this.cursor);
    this.cursor.setPosition(t.x - 12, t.y + 5);
    this.tweens.add({ targets: this.cursor, x: t.x - 10, duration: 300, yoyo: true, repeat: -1 });
    this.desc.setText(this.options[i].desc);
  }

  private choose() {
    const opt = this.options[this.index];
    if (opt.id === 'other') {
      this.submenu = true;
      this.build(this.otherOptions(), 0);
    } else if (opt.id === 'back') this.back();
    else if (opt.id === 'music') {
      app(this).cycleMusicVolume();
      this.items[this.index].setText(opt.label());
    } else if (opt.id === 'speed') {
      app(this).cycleAnimationSpeed();
      this.items[this.index].setText(opt.label());
    } else app(this).menuSelect(opt.id);
  }

  /** Esc: del submenú vuelve al menú principal; del menú principal, al título. */
  private back() {
    if (!this.submenu) return app(this).toTitle();
    this.submenu = false;
    this.build(this.mainOptions(), this.mainOptions().findIndex((o) => o.id === 'other'));
  }

  /** Mantener L oculta las ventanas para ver la ilustración, como en el juego. */
  private setUiVisible(v: boolean) {
    for (const o of this.ui) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible?.(v);
    for (const h of this.hits) h.input!.enabled = v;
  }

  /** Bloquea teclado y ratón del menú mientras hay un panel DOM encima. */
  setLocked(v: boolean) {
    this.locked = v;
    // Phaser también recibe los eventos de ratón de la ventana: sin esto, un clic
    // sobre el panel activaría la opción del menú que hay debajo.
    this.input.enabled = !v;
  }
}
