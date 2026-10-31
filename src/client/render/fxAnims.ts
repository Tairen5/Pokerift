/**
 * Animaciones de efectos (fx-<clave>-<dirección>) y su carga bajo demanda. Al
 * arrancar solo se cargan los efectos que usa la partida (bootEffects); el
 * resto de las animaciones importadas del juego (todas las de la ROM) se cargan
 * cuando se piden, p. ej. en el visor de efectos.
 */
import Phaser from 'phaser';
import { CATALOG } from '../assets/catalog';

/** Crea las animaciones de un efecto ya cargado (una por dirección). */
export function createFxAnims(scene: Phaser.Scene, key: string) {
  const fx = CATALOG.effects[key];
  if (!fx || !scene.textures.exists(`fx-${key}`)) return;
  for (let d = 0; d < (fx.dirs ?? 1); d++) {
    const name = `fx-${key}-${d}`;
    if (scene.anims.exists(name)) continue;
    const frames = scene.anims.generateFrameNumbers(`fx-${key}`, { start: d * fx.frames, end: d * fx.frames + fx.frames - 1 });
    // Con datos de la ROM, cada fotograma dura lo suyo; si no, ritmo fijo.
    if (fx.durations) frames.forEach((f, i) => (f.duration = fx.durations![i] ?? 1000 / fx.frameRate));
    scene.anims.create({ key: name, frames, frameRate: fx.frameRate });
  }
}

/** Carga (si hace falta) los efectos indicados y crea sus animaciones. */
export function loadFx(scene: Phaser.Scene, keys: Iterable<string | undefined>): Promise<void> {
  const list = [...new Set(keys)].filter((k): k is string => !!k && !!CATALOG.effects[k]);
  const missing = list.filter((k) => !scene.textures.exists(`fx-${k}`));
  const finish = () => list.forEach((k) => createFxAnims(scene, k));
  if (!missing.length) return Promise.resolve(finish());
  return new Promise((resolve) => {
    for (const k of missing) scene.load.spritesheet(`fx-${k}`, CATALOG.effects[k].url, { frameWidth: CATALOG.effects[k].frameWidth, frameHeight: CATALOG.effects[k].frameHeight });
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve(finish()));
    scene.load.start();
  });
}
