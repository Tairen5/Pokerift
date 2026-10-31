// ARCHIVO GENERADO por tools/import-rom-numbers.mjs — no editar a mano.
// Fuente: DUNGEON/dungeon.bin 1007 (glifos, «MISS») y 1024 (paleta) de una ROM propia.

export interface RomNumbers {
  url: string;
  /** Alto de cada franja; fila 0 = daño, fila 1 = curación. */
  height: number;
  rows: { damage: number; heal: number };
  /** Recorte horizontal de cada glifo dentro de su franja. */
  glyphs: Record<string, { x: number; w: number }>;
  /** Palabra de fallo («MISS»). */
  miss: { x: number; w: number };
}

export const ROM_NUMBERS: RomNumbers | null = {
 "url": "assets/ui/dmg-numbers.png",
 "height": 8,
 "rows": {
  "damage": 0,
  "heal": 1
 },
 "glyphs": {
  "0": {
   "x": 0,
   "w": 6
  },
  "1": {
   "x": 8,
   "w": 5
  },
  "2": {
   "x": 16,
   "w": 6
  },
  "3": {
   "x": 24,
   "w": 6
  },
  "4": {
   "x": 32,
   "w": 6
  },
  "5": {
   "x": 40,
   "w": 6
  },
  "6": {
   "x": 48,
   "w": 6
  },
  "7": {
   "x": 56,
   "w": 6
  },
  "8": {
   "x": 64,
   "w": 6
  },
  "9": {
   "x": 72,
   "w": 6
  },
  "+": {
   "x": 80,
   "w": 7
  },
  "-": {
   "x": 88,
   "w": 6
  }
 },
 "miss": {
  "x": 101,
  "w": 21
 }
};
