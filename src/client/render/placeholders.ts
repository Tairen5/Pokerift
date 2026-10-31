/**
 * Gráficos provisionales generados en tiempo de ejecución. Se usan para todo
 * lo que no tenga recurso en el catálogo. Son deliberadamente simples para
 * que se identifiquen como placeholders.
 */
import Phaser from 'phaser';
import { SPECIES } from '../../shared/data/species';
import { ITEMS } from '../../shared/data/items';
import { TRAPS } from '../../shared/data/traps';

export const TILE = 24;

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h)!;
  draw(tex.getContext());
  tex.refresh();
}

export function pokemonPlaceholderKey(species: string) {
  return `ph-mon-${species}`;
}

export function generatePlaceholders(scene: Phaser.Scene) {
  for (const sp of Object.values(SPECIES)) {
    canvasTexture(scene, pokemonPlaceholderKey(sp.id), TILE, TILE, (ctx) => {
      // La sombra la dibuja PokemonSprite (render/pokemonSprite.ts).
      ctx.fillStyle = sp.color;
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(12, 11, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sp.name[0], 12, 12);
    });
  }
  // Indicador de dirección (se rota según la orientación).
  canvasTexture(scene, 'ph-facing', 8, 8, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(8, 7);
    ctx.lineTo(0, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });
  for (const it of Object.values(ITEMS)) {
    canvasTexture(scene, `ph-item-${it.id}`, TILE, TILE, (ctx) => {
      ctx.fillStyle = it.color;
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1;
      if (it.category === 'money') {
        ctx.beginPath();
        ctx.arc(12, 13, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#7a5a00';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('P', 12, 15.5);
      } else if (it.category === 'seed') {
        ctx.beginPath();
        ctx.ellipse(12, 13, 3.5, 5, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(12, 13, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(9, 10, 2, 2);
      }
    });
  }
  for (const t of Object.values(TRAPS)) {
    canvasTexture(scene, `ph-trap-${t.id}`, TILE, TILE, (ctx) => {
      ctx.fillStyle = t.color;
      ctx.strokeStyle = '#111';
      ctx.beginPath();
      ctx.moveTo(12, 4);
      ctx.lineTo(20, 12);
      ctx.lineTo(12, 20);
      ctx.lineTo(4, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }
  canvasTexture(scene, 'ph-stairs', TILE, TILE, (ctx) => {
    ctx.fillStyle = '#d8d0b0';
    ctx.fillRect(3, 3, 18, 18);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#8a7a50' : '#a89868';
      ctx.fillRect(4, 4 + i * 4, 16 - i * 3, 4);
    }
    ctx.strokeStyle = '#3a3020';
    ctx.strokeRect(3.5, 3.5, 17, 17);
  });
  canvasTexture(scene, 'ph-spark', 6, 6, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(2, 0, 2, 6);
    ctx.fillRect(0, 2, 6, 2);
  });
}

/** Colores de los efectos provisionales por clave fx de los movimientos. */
export const FX_COLORS: Record<string, number> = {
  hit: 0xffffff, slash: 0xffffff, bite: 0xffeeee, fire: 0xff6020, water: 0x40a0ff, grass: 0x60e060,
  electric: 0xffe040, poison: 0xb060e0, wind: 0xd0f0ff, sound: 0xffc0ff, sand: 0xd0b070, string: 0xf0f0f0,
  buff: 0x80c0ff, psychic: 0xff80c0, smoke: 0x808080,
};
