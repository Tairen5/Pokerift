/**
 * Música de fondo: las pistas de la ROM sintetizadas por tools/import-rom-music.mjs
 * (MP3 + punto de bucle en music.generated.ts). Se reproducen con WebAudio para que el
 * bucle no tenga cortes; al cambiar de pista, la anterior se funde.
 *
 * Los navegadores no dejan sonar audio hasta que el jugador toca o pulsa algo: la pista
 * pedida antes se guarda y empieza con el primer gesto.
 *
 * Qué suena en cada sitio (fuentes en docs/MECANICAS.md):
 *  - menú principal: 2 «Top Menu Theme» (B_SYS_MENU); intro y título: 1 (B_SYS_P3_OPENING);
 *  - zonas: lo que pone bgm_PlayFadeIn en SCRIPT/<mapa>/enter00.ssb;
 *  - mazmorra: la música de cada piso (floor_properties → MUSIC_ID_TABLE).
 */
import { MUSIC, MUSIC_RATE, type MusicTrack } from '../assets/music.generated';

/**
 * Música de cada zona: el bgm_PlayFadeIn de SCRIPT/<mapa>/enter00.ssb en la partida normal
 * (desensamblado con la tabla de pmd2scriptdata.xml de SkyTemple):
 *  - Aldea Tesoro (T01P01A y T01P02A) y Encrucijada (P01P01A): 9 «Treasure Town».
 *  - Risco Sharpedo (H01P99A) y playa (D01P11A): 100 «Ocean1» (sonido del mar), y la casa
 *    (H02P99A) también hasta un punto de la historia; luego 10 «Do Your Best As Always».
 *    El sonido del mar usa eventos de la secuencia sin documentar: aún no se importa (silencio).
 *  - Gremio (exterior, t00p04a): [INCIERTO] su música la pone una rutina común; se usa la de la aldea.
 */
export const ZONE_MUSIC: Record<string, number | null> = {
  town: 9,
  crossroads: 9,
  guild: 9,
  home: null,
  bluff: null,
  beach: null,
};

/** Retardo inicial (muestras a MUSIC_RATE) que deja el codificador LAME si el navegador no lo recorta (medido en Chrome). */
const MP3_DELAY = 1105;
const FADE_S = 0.6;
const VOLUMES = [1, 0.6, 0.3, 0];

class MusicPlayer {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buffers = new Map<number, Promise<AudioBuffer | null>>();
  private current: { id: number; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  /** Pista pedida (puede no estar sonando aún: falta el gesto o se está cargando). */
  private wanted: number | null = null;
  private volume = 1;

  constructor() {
    const unlock = () => {
      if (!this.ctx) this.init();
      void this.ctx?.resume();
      if (this.ctx?.state !== 'suspended') {
        window.removeEventListener('pointerdown', unlock, true);
        window.removeEventListener('keydown', unlock, true);
      }
      if (this.wanted !== null && this.current?.id !== this.wanted) void this.start(this.wanted);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  private init() {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
  }

  /** Para las pruebas: pista pedida, la que suena y el estado del audio. */
  debug() {
    return { wanted: this.wanted, playing: this.current?.id ?? null, state: this.ctx?.state ?? 'sin iniciar' };
  }

  /** Para las pruebas: decodifica una pista y devuelve sus puntos de bucle. */
  async probe(id: number) {
    if (!this.ctx) this.init();
    const buf = await this.load(id);
    return buf && { length: buf.length, rate: buf.sampleRate, ...loopPoints(MUSIC[id], buf) };
  }

  /** Volumen (0–1). */
  setVolume(v: number) {
    this.volume = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /** Cambia la música (null = silencio). Si ya suena esa pista, sigue sin reiniciarse. */
  play(id: number | null) {
    if (id !== null && !MUSIC[id]) id = null;
    if (this.wanted === id) return;
    this.wanted = id;
    this.fadeOut();
    if (id !== null && this.ctx && this.ctx.state !== 'suspended') void this.start(id);
  }

  private fadeOut() {
    const cur = this.current;
    if (!cur || !this.ctx) return;
    this.current = null;
    const t = this.ctx.currentTime;
    cur.gain.gain.cancelScheduledValues(t);
    cur.gain.gain.setValueAtTime(cur.gain.gain.value, t);
    cur.gain.gain.linearRampToValueAtTime(0, t + FADE_S);
    cur.src.stop(t + FADE_S + 0.05);
  }

  private load(id: number): Promise<AudioBuffer | null> {
    let p = this.buffers.get(id);
    if (!p) {
      p = fetch(MUSIC[id].url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
        .then((data) => this.ctx!.decodeAudioData(data))
        .catch((e) => {
          console.warn('[música]', MUSIC[id].url, e);
          return null;
        });
      this.buffers.set(id, p);
    }
    return p;
  }

  private async start(id: number) {
    if (!this.ctx || !this.master) return;
    const buf = await this.load(id);
    // Mientras cargaba se ha pedido otra pista (o ya suena esta).
    if (!buf || this.wanted !== id || this.current?.id === id) return;
    const { offset, loopStart, end } = loopPoints(MUSIC[id], buf);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    src.connect(gain).connect(this.master);
    if (loopStart !== null) {
      src.loop = true;
      src.loopStart = loopStart;
      src.loopEnd = end;
    }
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(1, t + 0.15);
    src.start(t, offset);
    this.current = { id, src, gain };
  }
}

/**
 * Puntos de bucle en segundos dentro del audio decodificado. Si el navegador no ha recortado el
 * retardo del codificador (el audio dura más que el original), todo se desplaza ese retardo.
 */
function loopPoints(track: MusicTrack, buf: AudioBuffer) {
  const expected = (track.samples * buf.sampleRate) / MUSIC_RATE;
  const delay = buf.length - expected >= (MP3_DELAY * buf.sampleRate) / MUSIC_RATE - 1 ? MP3_DELAY / MUSIC_RATE : 0;
  return {
    offset: delay,
    loopStart: track.loopStart === null ? null : delay + track.loopStart / MUSIC_RATE,
    end: delay + track.samples / MUSIC_RATE,
  };
}

export const music = new MusicPlayer();
export const MUSIC_VOLUMES = VOLUMES;
