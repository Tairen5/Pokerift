// ARCHIVO GENERADO por tools/import-rom-music.mjs — no editar a mano.
// Música sintetizada de SOUND/BGM (smdl/swdl, driver DSE) de una ROM propia (USA).

export interface MusicTrack {
  url: string;
  /** Nombre interno del .smd. */
  name: string;
  /** Muestras (a 32000 Hz) del audio original, sin el retardo del codificador. */
  samples: number;
  /** Muestra donde empieza el bucle (hasta el final); null = no se repite. */
  loopStart: number | null;
}

export const MUSIC_RATE = 32000;

/** Pistas por número de BGM (enum music_id). */
export const MUSIC: Record<number, MusicTrack> = {
 "1": {
  "url": "assets/music/bgm0001.mp3",
  "name": "B_SYS_P3_OPENIN",
  "samples": 2606770,
  "loopStart": null
 },
 "2": {
  "url": "assets/music/bgm0002.mp3",
  "name": "B_SYS_MENU.SMD",
  "samples": 886154,
  "loopStart": 0
 },
 "9": {
  "url": "assets/music/bgm0009.mp3",
  "name": "B_MAP_TOWN_01.S",
  "samples": 2500466,
  "loopStart": 1250233
 },
 "21": {
  "url": "assets/music/bgm0021.mp3",
  "name": "B_DUN_KAIGANNOD",
  "samples": 1688276,
  "loopStart": 0
 },
 "22": {
  "url": "assets/music/bgm0022.mp3",
  "name": "B_DUN_SHIMETTAI",
  "samples": 2601291,
  "loopStart": 0
 },
 "23": {
  "url": "assets/music/bgm0023.mp3",
  "name": "B_DUN_TOGETOGEY",
  "samples": 1878261,
  "loopStart": 0
 },
 "24": {
  "url": "assets/music/bgm0024.mp3",
  "name": "B_DUN_TAKITSUBO",
  "samples": 2789010,
  "loopStart": 0
 },
 "25": {
  "url": "assets/music/bgm0025.mp3",
  "name": "B_DUN_RINGONOMO",
  "samples": 2752000,
  "loopStart": 0
 }
};
