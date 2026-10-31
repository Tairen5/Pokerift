/**
 * Galería de la interfaz (ui-gallery.html): muestra el kit (ui/kit.ts) con cajas
 * de muchos tamaños y proporciones, en todos los colores y estilos, y la versión
 * en canvas que usan las escenas de Phaser. ?s=1|2|3 fuerza la escala de píxeles.
 * La revisa tools/ui-check.ts (npm run ui-check) píxel a píxel.
 */
import '../style.css';
import { uiAsset } from './romUi';
import { paintNineSlice } from '../render/nineSlice';
import { choiceBox, dialog, menuList, portraitFrame, titleText, titled, win, type FrameColor, type FrameStyle } from './kit';

const forced = Number(new URLSearchParams(location.search).get('s'));
if (forced >= 1) document.documentElement.style.setProperty('--s', String(forced));

/** Tamaños en píxeles del juego: mínimos, cuadrados, el diálogo original, alargadas, altas e impares. */
const SIZES: [number, number][] = [[16, 16], [24, 24], [40, 40], [240, 52], [300, 20], [30, 120], [61, 37], [100, 18]];
const COLORS: FrameColor[] = ['blue', 'green', 'pink'];
const STYLES: FrameStyle[] = ['dialog', 'plain'];
// Cajas vacías sin margen interior, para que midan exactamente w×h.
const size = (w: number, h: number) => `style="width:calc(${w}px * var(--s));height:calc(${h}px * var(--s));padding:0"`;

const boxes = STYLES.flatMap((style) =>
  COLORS.map(
    (color) =>
      `<div class="g-row">${SIZES.map(([w, h]) => win('', { color, style, attrs: `${size(w, h)} data-check="${style}-${color}"` })).join('')}</div>`,
  ),
).join('');

const moves = menuList(
  [
    { label: '<kbd>1</kbd><span class="tdot t-fire"></span>Ascuas', right: '25/25' },
    { label: '<kbd>2</kbd><span class="tdot t-normal"></span>Arañazo', right: '35/35' },
    { label: '<kbd>3</kbd><span class="tdot t-normal"></span>Gruñido', right: '0/40', cls: 'nopp' },
    { label: '<kbd>4</kbd>—', disabled: true },
  ],
  0,
);
const items = menuList(
  [
    { label: '<span class="dot" style="background:#e04040"></span>Manzana' },
    { label: '<span class="dot" style="background:#4080e0"></span>Baya Aranja' },
    { label: '<span class="dot" style="background:#c0a040"></span>Semilla Explosiva', disabled: true },
  ],
  1,
);

document.getElementById('gallery')!.innerHTML = `
  <h1>Galería de interfaz</h1>
  <p class="muted">Escala de píxeles --s = <span id="g-scale"></span>. Cajas originales (nine-slice con bordes repetidos): las de la ROM si se ha importado (npm run import:ui), si no las de Assets/HUD/Text box.png.</p>
  <h3>Cajas: estilo con trama y liso · azul, verde, rosa</h3>
  ${boxes}
  <h3>Diálogos y elecciones</h3>
  <div class="g-row g-top">
    <div style="width:calc(240px * var(--s))">${dialog({ speaker: 'Pikachu', text: '¡Hola! Esto es un diálogo con retrato, como en Exploradores del Cielo.', portrait: { species: 'pikachu' } })}</div>
    <div style="width:calc(240px * var(--s))" class="g-prompt">${choiceBox([{ label: 'Sí' }, { label: 'No' }], 0)}${dialog({ text: 'Hay unas escaleras. ¿Quieres avanzar al siguiente piso?' })}</div>
    <div style="width:calc(200px * var(--s))">${dialog({ text: 'Mensaje de combate sin retrato. Charmander recibe 3 de daño.', color: 'green' })}</div>
  </div>
  <h3>Menús</h3>
  <div class="g-row g-top">
    <div style="width:calc(120px * var(--s))">${win(moves)}</div>
    <div style="width:calc(150px * var(--s))">${titled('Mochila <small>3/48</small>', items)}</div>
    <div style="width:calc(200px * var(--s))">${titled('Controles', '<p>Moverse: flechas</p><p>Atacar: Espacio</p>', { style: 'plain' })}</div>
    <div>${titled('Rosa', '<p>Opción</p>', { color: 'pink' })}</div>
  </div>
  <h3>Marcos de retrato</h3>
  <div class="g-row">
    ${portraitFrame('pikachu')}${portraitFrame('charmander', { mood: 'pain' })}${portraitFrame('squirtle', { color: 'green' })}${portraitFrame('bulbasaur', { color: 'pink' })}
    ${portraitFrame('pikachu', { size: 20 })}${portraitFrame('meowth', { size: 20, color: 'green' })}
  </div>
  <h3>Fuente de mazmorra</h3>
  <div class="g-row">${win(`<div class="g-loc">${titleText('Bosque Diminuto')}${titleText('P1')}</div>`)}${win(titleText('P12', { color: '#f8e050' }))}${win(titleText('Ñandú Árbol? 0123456789'))}</div>
  <h3>Lienzo (ventanas de Phaser)</h3>
  <div class="g-row" id="g-canvas"></div>`;

const scale = () => Number(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 1;
document.getElementById('g-scale')!.textContent = String(scale());

// Mismo pintor que pmdWindow (scenes/stage.ts), escalado con factor entero.
const img = new Image();
img.src = `/${uiAsset('frame-blue')}`;
img.onload = () => {
  const s = scale();
  document.getElementById('g-canvas')!.innerHTML = SIZES.map(([w, h]) => `<canvas width="${w}" height="${h}" data-check="canvas" style="width:${w * s}px;height:${h * s}px"></canvas>`).join('');
  document.querySelectorAll<HTMLCanvasElement>('#g-canvas canvas').forEach((c) => paintNineSlice(c.getContext('2d')!, img, c.width, c.height, 8));
  document.body.dataset.ready = '1';
};

const style = document.createElement('style');
style.textContent = `
  html, body { overflow: auto; height: auto; }
  #gallery { padding: calc(4px * var(--s)); }
  .g-row { display: flex; flex-wrap: wrap; gap: calc(4px * var(--s)); align-items: flex-end; margin-bottom: calc(4px * var(--s)); }
  .g-row.g-top { align-items: flex-start; }
  .g-prompt { display: flex; flex-direction: column; align-items: flex-end; }
  .g-prompt .dlg { align-self: stretch; }
  .g-loc { display: flex; gap: calc(8px * var(--s)); align-items: flex-end; }
  canvas { image-rendering: pixelated; }`;
document.head.appendChild(style);
