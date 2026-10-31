// ARCHIVO GENERADO por tools/import-rom-ui.mjs — no editar a mano.
// Fuente: FONT/frame_b0.chr/.pal (cajas) y FONT/kanji.dat (fuente) de una ROM propia.

export interface RomUi {
  /** Carpeta de las cajas y marcos (frame/plain/portrait-<color>.png, 24×24, cortes de 8). */
  ui: string;
  /** Fuente bitmap para Phaser. */
  bitmapFont: { png: string; xml: string };
  /** Alto de la celda de la fuente en píxeles del juego. */
  cell: number;
  /** Glifos del HUD de la mazmorra (dígitos y etiquetas en español de dungeon.bin 1020) sobre la hoja ripeada. */
  hud: { url: string; sheet: { w: number; h: number }; glyphs: Record<string, { x: number; y: number; w: number; h: number }> } | null;
  /** Ilustraciones del menú principal (256×192); el juego elige una al azar. */
  menuBackgrounds: string[];
  /**
   * Iconos del minimapa: una fila de 64 iconos de cell×cell por estilo (0 semitransparente, 1 contorno,
   * 2 opaco). Índices según DrawMinimapTile (overlay29): 2 enemigo, 3 objeto, 4 trampa, 6 escalera,
   * 7 Casilla Maravilla, 8 líder (parpadea), 10 compañero, 12 forajido, 13 escalera oculta,
   * 16 + bordes suelo visitado, 32 + bordes suelo conocido sin visitar (bordes: 1 abajo, 2 derecha,
   * 4 arriba, 8 izquierda = lado con pared).
   */
  minimap: { url: string; cell: number } | null;
}

export const ROM_UI: RomUi | null = {
 "ui": "assets/ui/rom",
 "bitmapFont": {
  "png": "assets/fonts/rom/pmd-sky.png",
  "xml": "assets/fonts/rom/pmd-sky.xml"
 },
 "cell": 12,
 "hud": {
  "url": "assets/ui/rom/hud-glyphs.png",
  "sheet": {
   "w": 192,
   "h": 64
  },
  "glyphs": {
   "w0": {
    "x": 0,
    "y": 47,
    "w": 8,
    "h": 8
   },
   "g0": {
    "x": 0,
    "y": 56,
    "w": 8,
    "h": 8
   },
   "w1": {
    "x": 9,
    "y": 47,
    "w": 6,
    "h": 8
   },
   "g1": {
    "x": 9,
    "y": 56,
    "w": 6,
    "h": 8
   },
   "w2": {
    "x": 16,
    "y": 47,
    "w": 8,
    "h": 8
   },
   "g2": {
    "x": 16,
    "y": 56,
    "w": 8,
    "h": 8
   },
   "w3": {
    "x": 25,
    "y": 47,
    "w": 8,
    "h": 8
   },
   "g3": {
    "x": 25,
    "y": 56,
    "w": 8,
    "h": 8
   },
   "w4": {
    "x": 34,
    "y": 47,
    "w": 8,
    "h": 8
   },
   "g4": {
    "x": 34,
    "y": 56,
    "w": 8,
    "h": 8
   },
   "w5": {
    "x": 43,
    "y": 47,
    "w": 8,
    "h": 8
   },
   "g5": {
    "x": 43,
    "y": 56,
    "w": 8,
    "h": 8
   },
   "w6": {
    "x": 52,
    "y": 47,
    "w": 8,
    "h": 8
   },
   "g6": {
    "x": 52,
    "y": 56,
    "w": 8,
    "h": 8
   },
   "w7": {
    "x": 61,
    "y": 47,
    "w": 7,
    "h": 8
   },
   "g7": {
    "x": 61,
    "y": 56,
    "w": 7,
    "h": 8
   },
   "w8": {
    "x": 69,
    "y": 47,
    "w": 8,
    "h": 8
   },
   "g8": {
    "x": 69,
    "y": 56,
    "w": 8,
    "h": 8
   },
   "w9": {
    "x": 78,
    "y": 47,
    "w": 8,
    "h": 8
   },
   "g9": {
    "x": 78,
    "y": 56,
    "w": 8,
    "h": 8
   },
   "w100": {
    "x": 81,
    "y": 0,
    "w": 17,
    "h": 8
   },
   "oF": {
    "x": 87,
    "y": 47,
    "w": 7,
    "h": 8
   },
   "oLv": {
    "x": 95,
    "y": 47,
    "w": 13,
    "h": 8
   },
   "oHP": {
    "x": 109,
    "y": 47,
    "w": 13,
    "h": 8
   },
   "o/": {
    "x": 123,
    "y": 47,
    "w": 6,
    "h": 8
   },
   "oB": {
    "x": 130,
    "y": 47,
    "w": 6,
    "h": 8
   },
   "yF": {
    "x": 87,
    "y": 56,
    "w": 7,
    "h": 8
   },
   "yLv": {
    "x": 95,
    "y": 56,
    "w": 13,
    "h": 8
   },
   "yHP": {
    "x": 109,
    "y": 56,
    "w": 13,
    "h": 8
   },
   "y/": {
    "x": 123,
    "y": 56,
    "w": 6,
    "h": 8
   },
   "yB": {
    "x": 130,
    "y": 56,
    "w": 6,
    "h": 8
   },
   "A": {
    "x": 0,
    "y": 18,
    "w": 8,
    "h": 8
   },
   "B": {
    "x": 9,
    "y": 18,
    "w": 8,
    "h": 8
   },
   "C": {
    "x": 18,
    "y": 18,
    "w": 8,
    "h": 8
   },
   "D": {
    "x": 27,
    "y": 18,
    "w": 8,
    "h": 8
   },
   "E": {
    "x": 36,
    "y": 18,
    "w": 8,
    "h": 8
   },
   "F": {
    "x": 45,
    "y": 18,
    "w": 8,
    "h": 8
   },
   "G": {
    "x": 54,
    "y": 18,
    "w": 8,
    "h": 8
   },
   "H": {
    "x": 63,
    "y": 18,
    "w": 8,
    "h": 8
   },
   "I": {
    "x": 73,
    "y": 18,
    "w": 5,
    "h": 8
   },
   "J": {
    "x": 80,
    "y": 18,
    "w": 7,
    "h": 8
   },
   "K": {
    "x": 89,
    "y": 18,
    "w": 7,
    "h": 8
   },
   "L": {
    "x": 97,
    "y": 18,
    "w": 8,
    "h": 8
   },
   "M": {
    "x": 106,
    "y": 18,
    "w": 8,
    "h": 8
   },
   "N": {
    "x": 0,
    "y": 27,
    "w": 8,
    "h": 8
   },
   "O": {
    "x": 9,
    "y": 27,
    "w": 8,
    "h": 8
   },
   "P": {
    "x": 18,
    "y": 27,
    "w": 8,
    "h": 8
   },
   "Q": {
    "x": 27,
    "y": 27,
    "w": 8,
    "h": 8
   },
   "R": {
    "x": 36,
    "y": 27,
    "w": 8,
    "h": 8
   },
   "S": {
    "x": 45,
    "y": 27,
    "w": 8,
    "h": 8
   },
   "T": {
    "x": 54,
    "y": 27,
    "w": 7,
    "h": 8
   },
   "U": {
    "x": 63,
    "y": 27,
    "w": 8,
    "h": 8
   },
   "V": {
    "x": 72,
    "y": 27,
    "w": 7,
    "h": 8
   },
   "W": {
    "x": 80,
    "y": 27,
    "w": 8,
    "h": 8
   },
   "X": {
    "x": 89,
    "y": 27,
    "w": 7,
    "h": 8
   },
   "Y": {
    "x": 97,
    "y": 27,
    "w": 7,
    "h": 8
   },
   "Z": {
    "x": 106,
    "y": 27,
    "w": 8,
    "h": 8
   },
   "(": {
    "x": 0,
    "y": 36,
    "w": 5,
    "h": 9
   },
   ")": {
    "x": 8,
    "y": 36,
    "w": 5,
    "h": 9
   },
   "*": {
    "x": 15,
    "y": 36,
    "w": 7,
    "h": 9
   },
   "+": {
    "x": 23,
    "y": 36,
    "w": 7,
    "h": 9
   },
   ",": {
    "x": 32,
    "y": 36,
    "w": 4,
    "h": 9
   },
   "-": {
    "x": 39,
    "y": 36,
    "w": 7,
    "h": 9
   },
   ".": {
    "x": 48,
    "y": 36,
    "w": 4,
    "h": 9
   },
   "/": {
    "x": 55,
    "y": 36,
    "w": 7,
    "h": 9
   },
   "!": {
    "x": 65,
    "y": 36,
    "w": 3,
    "h": 9
   },
   "≈": {
    "x": 70,
    "y": 36,
    "w": 8,
    "h": 9
   },
   "~": {
    "x": 79,
    "y": 36,
    "w": 8,
    "h": 9
   },
   "#": {
    "x": 88,
    "y": 36,
    "w": 7,
    "h": 9
   },
   "$": {
    "x": 96,
    "y": 36,
    "w": 7,
    "h": 9
   },
   "%": {
    "x": 104,
    "y": 36,
    "w": 7,
    "h": 9
   },
   "&": {
    "x": 112,
    "y": 36,
    "w": 8,
    "h": 9
   },
   "'": {
    "x": 121,
    "y": 36,
    "w": 5,
    "h": 9
   },
   "@": {
    "x": 127,
    "y": 36,
    "w": 8,
    "h": 9
   },
   "_": {
    "x": 136,
    "y": 36,
    "w": 8,
    "h": 9
   }
  }
 },
 "menuBackgrounds": [
  "assets/ui/rom/menu-bg-0.png",
  "assets/ui/rom/menu-bg-1.png",
  "assets/ui/rom/menu-bg-2.png",
  "assets/ui/rom/menu-bg-3.png",
  "assets/ui/rom/menu-bg-4.png",
  "assets/ui/rom/menu-bg-5.png",
  "assets/ui/rom/menu-bg-6.png"
 ],
 "minimap": {
  "url": "assets/ui/rom/minimap.png",
  "cell": 4
 }
};
