/**
 * Generador pseudoaleatorio determinista (mulberry32).
 * El estado es un único entero de 32 bits para poder serializarlo dentro del
 * estado de la partida: misma semilla + mismas acciones = misma partida.
 */
export interface RngState {
  s: number;
}

export function createRng(seed: number): RngState {
  return { s: seed >>> 0 };
}

export function hashSeed(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Devuelve un float en [0, 1). */
export function next(rng: RngState): number {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0;
  let t = rng.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Entero en [min, max] (ambos incluidos). */
export function int(rng: RngState, min: number, max: number): number {
  return min + Math.floor(next(rng) * (max - min + 1));
}

/** true con probabilidad percent/100. */
export function chance(rng: RngState, percent: number): boolean {
  return next(rng) * 100 < percent;
}

export function pick<T>(rng: RngState, list: readonly T[]): T {
  if (list.length === 0) throw new Error('pick() sobre lista vacía');
  return list[Math.floor(next(rng) * list.length)];
}

export function shuffle<T>(rng: RngState, list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(next(rng) * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function weighted<T>(rng: RngState, entries: readonly { value: T; weight: number }[]): T {
  const total = entries.reduce((a, e) => a + e.weight, 0);
  let r = next(rng) * total;
  for (const e of entries) {
    r -= e.weight;
    if (r < 0) return e.value;
  }
  return entries[entries.length - 1].value;
}
