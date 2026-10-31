/**
 * Utilidades comunes de las escenas de presentación (intro, título, menú).
 * Se diseñan a una resolución fija de 384×216 (proporción 16:9, como las capas
 * de la intro) y se escalan con factor entero para conservar el pixel art.
 */
import Phaser from 'phaser';
import { paintNineSlice } from '../render/nineSlice';
import type { FrameColor, FrameStyle } from '../ui/kit';

export const STAGE_W = 384;
export const STAGE_H = 216;
export const FONT = 'pmd-title';
/** Fuente de diálogo original (bitmap, con su contorno negro). */
export const MSG_FONT = 'pmd-message';

/** Texto con la fuente de diálogo original. */
export function msgText(scene: Phaser.Scene, x: number, y: number, text: string, opts: { tint?: number; maxWidth?: number; origin?: number } = {}) {
  const t = scene.add.bitmapText(x, y, MSG_FONT, text).setOrigin(opts.origin ?? 0, 0);
  if (opts.tint !== undefined) t.setTint(opts.tint);
  if (opts.maxWidth) t.setMaxWidth(opts.maxWidth);
  return t;
}

/** API del controlador de la aplicación (main.ts), accesible desde las escenas. */
export interface AppApi {
  /** Intro terminada o saltada. */
  toTitle(): void;
  toMenu(): void;
  /** Opción elegida en el menú principal. */
  menuSelect(id: MenuOptionId): void;
  /** Ir a una mazmorra desde una salida de las zonas exteriores (solo en solitario; en cooperativo decide el servidor). */
  enterDungeonSolo(dungeonId: string): void;
  /** Salir de las zonas exteriores al menú principal. */
  leaveTown(): void;
  animationSpeed(): number;
  cycleAnimationSpeed(): number;
}

export type MenuOptionId = 'solo' | 'create' | 'join' | 'history' | 'speed' | 'credits';

export function app(scene: Phaser.Scene): AppApi {
  return scene.registry.get('app') as AppApi;
}

/** Ajusta la cámara para mostrar el escenario de 384×216 centrado y escalado. */
export function fitStage(scene: Phaser.Scene): void {
  const apply = () => {
    const cam = scene.cameras.main;
    const z = Math.min(scene.scale.width / STAGE_W, scene.scale.height / STAGE_H);
    cam.setZoom(z >= 1 ? Math.floor(z) : z);
    cam.centerOn(STAGE_W / 2, STAGE_H / 2);
  };
  apply();
  scene.scale.on('resize', apply);
  scene.events.once('shutdown', () => scene.scale.off('resize', apply));
}

/** Transición con fundido a negro hacia otra escena. */
export function fadeTo(scene: Phaser.Scene, key: string, data?: object, ms = 350): void {
  const cam = scene.cameras.main;
  if ((scene as Phaser.Scene & { __leaving?: boolean }).__leaving) return;
  (scene as Phaser.Scene & { __leaving?: boolean }).__leaving = true;
  cam.fadeOut(ms, 0, 0, 0);
  cam.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
}

/** Texto con la fuente bitmap de PMD y sombra (como los títulos de mazmorra). */
export function pmdText(scene: Phaser.Scene, x: number, y: number, text: string, opts: { tint?: number; scale?: number; origin?: number; shadow?: boolean } = {}) {
  const container = scene.add.container(x, y);
  const scale = opts.scale ?? 1;
  const origin = opts.origin ?? 0.5;
  if (opts.shadow !== false) {
    const sh = scene.add.bitmapText(scale, scale, FONT, text).setScale(scale).setOrigin(origin, 0.5).setTint(0x000000).setAlpha(0.6);
    container.add(sh);
  }
  const t = scene.add.bitmapText(0, 0, FONT, text).setScale(scale).setOrigin(origin, 0.5).setTint(opts.tint ?? 0xffffff);
  container.add(t);
  return { container, text: t, setText: (s: string) => container.list.forEach((c) => (c as Phaser.GameObjects.BitmapText).setText(s)) };
}

/**
 * Ventana estilo Mundo Misterioso: la misma caja original que la interfaz DOM
 * (assets/ui/frame-*.png). Se compone una vez por tamaño en una textura con los
 * bordes repetidos (el nineslice de Phaser los estiraría y deformaría la trama).
 */
export function pmdWindow(scene: Phaser.Scene, x: number, y: number, w: number, h: number, opts: { color?: FrameColor; style?: FrameStyle } = {}) {
  w = Math.max(16, Math.round(w));
  h = Math.max(16, Math.round(h));
  const src = `ui-${opts.style === 'plain' ? 'plain' : 'frame'}-${opts.color ?? 'blue'}`;
  const key = `${src}-${w}x${h}`;
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, w, h)!;
    paintNineSlice(tex.getContext(), scene.textures.get(src).getSourceImage() as HTMLImageElement, w, h, 8);
    tex.refresh();
  }
  return scene.add.image(x, y, key).setOrigin(0);
}
