/**
 * Iluminación de la mazmorra, como en los juegos de DS: fuera de la luz el
 * terreno se oscurece y la luz se recorta con bordes redondeados y difuminados
 * (la sala entera con su contorno, o un círculo alrededor de cada Pokémon del
 * equipo en los pasillos). Nunca se ven las casillas.
 *
 * Se pinta en un lienzo a la resolución del mundo (en modo pixelArt Phaser no
 * filtra las texturas: el degradado va en escalones de un píxel del juego) y
 * solo se redibuja cuando cambia algo: posiciones de las luces o sala.
 * Como en la DS, la oscuridad es uniforme: la niebla de guerra (explorado o
 * no) solo se ve en el minimapa. Es solo presentación: qué se ve lo decide
 * shared/dungeon/visibility.
 */
import type Phaser from 'phaser';
import type { DungeonMap } from '../../shared/dungeon/map';
import { TILE } from './placeholders';

/** Oscuridad fuera de la luz [INCIERTO: a ojo, según capturas de la DS]. */
export const DARKNESS = 0.5;
/** Círculo de luz (en casillas): lleno hasta R_IN y se apaga hasta R_OUT. */
const R_IN = 2.2;
const R_OUT = 3.1;
/** Difuminado del borde de la luz de las salas (en casillas). */
const ROOM_BLUR = 0.35;

export interface Light {
  /** Posición en el mundo (px), la del sprite: la luz le sigue durante el paso. */
  x: number;
  y: number;
  /** Sala en la que está (o -1 en un pasillo). */
  room: number;
}

export class DungeonLight {
  readonly image: Phaser.GameObjects.Image;
  private readonly tex: Phaser.Textures.CanvasTexture;
  private lastKey = '';
  /** Duración del último redibujo (ms), para medir el coste. */
  lastDrawMs = 0;

  constructor(scene: Phaser.Scene, private readonly map: DungeonMap) {
    const key = 'dungeon-light';
    if (scene.textures.exists(key)) scene.textures.remove(key);
    this.tex = scene.textures.createCanvas(key, map.width * TILE, map.height * TILE)!;
    this.image = scene.add.image(0, 0, key).setOrigin(0).setDepth(50);
  }

  destroy() {
    this.image.destroy();
    this.tex.destroy();
  }

  draw(lights: Light[]) {
    const key = lights.map((l) => `${Math.round(l.x)},${Math.round(l.y)},${l.room}`).join(';');
    if (key === this.lastKey) return;
    this.lastKey = key;
    const t0 = performance.now();
    const ctx = this.tex.getContext(), T = TILE, W = this.tex.width, H = this.tex.height;
    // 1. Oscuridad uniforme.
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = `rgba(0,0,0,${DARKNESS})`;
    ctx.fillRect(0, 0, W, H);
    // 2. Luces: se recortan de la oscuridad (la unión de todas, sin sumar efectos raros).
    ctx.globalCompositeOperation = 'destination-out';
    const rooms = new Set(lights.filter((l) => l.room >= 0).map((l) => l.room));
    ctx.filter = `blur(${Math.round(ROOM_BLUR * T)}px)`;
    ctx.fillStyle = '#000';
    for (const r of this.map.rooms.filter((room) => rooms.has(room.id))) {
      // La sala y su contorno (lo que se ve), con las esquinas redondeadas.
      ctx.beginPath();
      ctx.roundRect((r.x - 1) * T, (r.y - 1) * T, (r.w + 2) * T, (r.h + 2) * T, T * 1.2);
      ctx.fill();
    }
    ctx.filter = 'none';
    for (const l of lights) {
      const g = ctx.createRadialGradient(l.x, l.y, R_IN * T, l.x, l.y, R_OUT * T);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(l.x - R_OUT * T, l.y - R_OUT * T, R_OUT * T * 2, R_OUT * T * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
    this.tex.refresh();
    this.lastDrawMs = performance.now() - t0;
  }
}
