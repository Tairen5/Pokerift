import Phaser from 'phaser';
import { ROM_NUMBERS } from '../assets/damage-numbers.generated';

/** Textura con los números del juego (tools/import-rom-numbers.mjs). */
export const DMG_NUMBERS_KEY = 'dmg-numbers';

export type NumberKind = 'damage' | 'heal' | 'miss';

/**
 * Número sobre un Pokémon («-45», «+10», «MISS») con los glifos originales de
 * la ROM. Devuelve null si no se ha importado la ROM o falta algún glifo (el
 * llamante usa entonces la fuente de mensajes).
 * Cada glifo comparte una columna de contorno con el siguiente [INCIERTO]: el
 * espaciado sale de las capturas, no de una tabla del juego.
 */
export function romNumber(scene: Phaser.Scene, x: number, y: number, text: string, kind: NumberKind): Phaser.GameObjects.Container | null {
  if (!ROM_NUMBERS || !scene.textures.exists(DMG_NUMBERS_KEY)) return null;
  const n = ROM_NUMBERS;
  const parts: [string, { x: number; w: number } | undefined][] = kind === 'miss' ? [['miss', n.miss]] : [...text].map((c) => [c, n.glyphs[c]]);
  if (parts.some(([, g]) => !g)) return null;
  const tex = scene.textures.get(DMG_NUMBERS_KEY);
  const top = (kind === 'heal' ? n.rows.heal : n.rows.damage) * n.height;
  const c = scene.add.container(x, y);
  let cx = 0;
  for (const [name, g] of parts as [string, { x: number; w: number }][]) {
    const frame = `${name}@${top}`;
    if (!tex.has(frame)) tex.add(frame, 0, g.x, top, g.w, n.height);
    c.add(scene.add.image(cx, 0, DMG_NUMBERS_KEY, frame).setOrigin(0, 0.5));
    cx += g.w - 1;
  }
  // Centrado en x con coordenadas enteras (sin medio píxel).
  const shift = -Math.floor((cx + 1) / 2);
  for (const child of c.list as Phaser.GameObjects.Image[]) child.x += shift;
  return c;
}
