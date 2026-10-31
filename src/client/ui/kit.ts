/**
 * Kit de interfaz al estilo de Mundo Misterioso (DOM). Piezas reutilizables para
 * el HUD, los diálogos y los menús; todas devuelven HTML (como el resto de la UI)
 * y se pintan con los gráficos originales que extrae tools/build-ui.mjs:
 *
 *   win()            caja de ventana nine-slice (Assets/HUD/Text box.png): esquinas
 *                    intactas y bordes que se repiten, nunca se estiran
 *   titled()         caja con título centrado (como "Controls" de la hoja)
 *   portraitFrame()  marco de retrato original con el retrato de SpriteCollab
 *   dialog()         diálogo: retrato encima a la izquierda + caja de texto
 *   menuList()       lista con cursor (movimientos, mochila, menús)
 *   choiceBox()      caja pequeña de elección (Sí/No…), junto a un diálogo
 *   titleText()      texto con la fuente de mazmorra (Assets/Font/dungeon title font.png)
 *
 * Tamaños en píxeles del juego: la hoja de estilos los multiplica por --s
 * (escala entera), así los píxeles se ven nítidos a cualquier resolución.
 */
import { getSpecies } from '../../shared/data/species';
import { CATALOG } from '../assets/catalog';
import TITLE from '../assets/title-glyphs.generated.json';

export type FrameColor = 'blue' | 'green' | 'pink';
/** dialog: borde con la trama de 4 px (diálogos, la mayoría de cajas) · plain: variante lisa. */
export type FrameStyle = 'dialog' | 'plain';

export interface WinOpts {
  color?: FrameColor;
  style?: FrameStyle;
  id?: string;
  cls?: string;
  /** Atributos extra tal cual (p. ej. `title="…"`). */
  attrs?: string;
}

/** Pantalla táctil (móvil/tableta): se muestran los controles táctiles en vez de la ayuda de teclado. */
export const touchUi = () => matchMedia('(pointer: coarse)').matches;

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Clases de una caja (para elementos que ya existen y solo cambian de aspecto). */
export function winClass(o: WinOpts = {}) {
  return ['win', o.color && o.color !== 'blue' ? `win-${o.color}` : '', o.style === 'plain' ? 'win-plain' : '', o.cls ?? ''].filter(Boolean).join(' ');
}

/** Caja de ventana. Se adapta a cualquier tamaño a partir de 16×16 px del juego. */
export function win(inner: string, o: WinOpts = {}) {
  return `<div${o.id ? ` id="${o.id}"` : ''} class="${winClass(o)}"${o.attrs ? ` ${o.attrs}` : ''}>${inner}</div>`;
}

/** Caja con título centrado y el contenido debajo. */
export function titled(title: string, body: string, o: WinOpts = {}) {
  return win(`<div class="win-title">${title}</div>${body}`, o);
}

/** Retrato de SpriteCollab (40×40) o, si no hay, un círculo del color de la especie. */
export function portraitHtml(species: string, mood: 'normal' | 'pain' = 'normal', cls = 'portrait') {
  const p = CATALOG.pokemon[species];
  const url = p?.portraits?.[mood] ?? p?.portrait;
  if (url) return `<img class="${cls}" src="${url}" alt="">`;
  const sp = getSpecies(species);
  return `<span class="${cls} ph" style="background:${sp.color}">${sp.name[0]}</span>`;
}

export interface PortraitOpts {
  mood?: 'normal' | 'pain';
  /** Lado del hueco en píxeles del juego: 40 es el tamaño original (20 = mitad exacta). */
  size?: number;
  color?: FrameColor;
  cls?: string;
}

/** Marco de retrato original (4 px de borde, 5 abajo) con el retrato dentro. */
export function portraitFrame(species: string, o: PortraitOpts = {}) {
  const cls = ['pf', o.color && o.color !== 'blue' ? `pf-${o.color}` : '', o.cls ?? ''].filter(Boolean).join(' ');
  return `<span class="${cls}" style="--ps:${o.size ?? 40}">${portraitHtml(species, o.mood ?? 'normal', 'pf-img')}</span>`;
}

export interface DialogOpts {
  /** Texto del mensaje (HTML ya escapado). */
  text: string;
  /** Nombre de quien habla; se muestra en color antes del texto, como en los juegos. */
  speaker?: string;
  portrait?: { species: string; mood?: 'normal' | 'pain' };
  color?: FrameColor;
  id?: string;
  cls?: string;
}

/** Diálogo: el retrato flota encima de la caja, a la izquierda (como en EoS). */
export function dialog(o: DialogOpts) {
  const who = o.speaker ? `<span class="dlg-name">${esc(o.speaker)}</span>: ` : '';
  return `<div${o.id ? ` id="${o.id}"` : ''} class="dlg ${o.cls ?? ''}">
    ${o.portrait ? portraitFrame(o.portrait.species, { mood: o.portrait.mood, color: o.color, cls: 'dlg-pf' }) : ''}
    ${win(`${who}${o.text}`, { color: o.color, cls: 'dlg-box' })}</div>`;
}

export interface MenuItem {
  /** Texto de la opción (HTML ya escapado). */
  label: string;
  /** Texto alineado a la derecha (PP, cantidad…). */
  right?: string;
  disabled?: boolean;
  /** Clases extra del botón (p. ej. para atenuar una opción sin desactivarla). */
  cls?: string;
  /** Atributos data-* (clave sin el prefijo). */
  data?: Record<string, string | number>;
  title?: string;
}

/**
 * Lista con cursor. Cada opción es un <button> con data-index (y los data-* que
 * se pidan); la seleccionada lleva la clase .sel (cursor y texto en amarillo).
 */
export function menuList(items: MenuItem[], selected = -1, cls = '') {
  return `<div class="mlist ${cls}">${items
    .map((it, i) => {
      const data = Object.entries(it.data ?? {}).map(([k, v]) => ` data-${k}="${esc(String(v))}"`).join('');
      return `<button class="mitem${i === selected ? ' sel' : ''}${it.cls ? ` ${it.cls}` : ''}" data-index="${i}"${data}${it.disabled ? ' disabled' : ''}${it.title ? ` title="${esc(it.title)}"` : ''}>
        <span class="ml">${it.label}</span>${it.right !== undefined ? `<span class="mr">${it.right}</span>` : ''}</button>`;
    })
    .join('')}</div>`;
}

/** Caja pequeña de elección (Sí/No…), pensada para ir junto a un diálogo. */
export function choiceBox(items: MenuItem[], selected = 0, o: WinOpts = {}) {
  return win(menuList(items, selected), { ...o, cls: `win-choices ${o.cls ?? ''}` });
}

interface TitleGlyph { x: number; y: number; w: number; a: number; t: number; b: number }
const TITLE_GLYPHS = TITLE.glyphs as Record<string, TitleGlyph>;
/** Equivalencias para caracteres que la fuente de mazmorra no tiene ('' = se omite: no hay ¡ ¿). */
const TITLE_ALIAS: Record<string, string> = { '¡': '', '¿': '', '·': '.', '—': '-', '–': '-', '’': "'" };
/** Fila más baja con tinta de toda la fuente: todos los textos acaban ahí, así comparten línea base. */
const TITLE_BOTTOM = Math.max(...Object.values(TITLE_GLYPHS).map((g) => g.b));

/**
 * Texto con la fuente de mazmorra original. Cada glifo es un recorte de
 * pmd-title.png usado como máscara: conserva el sombreado gris del original y
 * admite color (`color`, por defecto blanco). Arriba se recorta a la tinta de sus
 * glifos; abajo llega siempre hasta los descendentes, de modo que varios textos
 * alineados por abajo (flex-end) comparten la línea base.
 */
export function titleText(text: string, o: { color?: string; cls?: string } = {}) {
  const glyphs = [...text]
    .map((c) => (c in TITLE_GLYPHS ? c : TITLE_ALIAS[c] ?? '?'))
    .filter((c) => c !== '')
    .map((c) => TITLE_GLYPHS[c] ?? TITLE_GLYPHS[' ']);
  const ink = glyphs.filter((g) => g.w > 0);
  const top = ink.length ? Math.min(...ink.map((g) => g.t)) : 0;
  const bottom = TITLE_BOTTOM;
  const cells = glyphs
    .map((g) => (g.w > 0 ? `<i style="--x:${g.x};--y:${g.y + top};--w:${g.w};--a:${g.a}"></i>` : `<i class="sp" style="--a:${g.a}"></i>`))
    .join('');
  const style = `--th:${bottom - top + 1}${o.color ? `;--tc:${o.color}` : ''}`;
  return `<span class="tt ${o.cls ?? ''}" style="${style}" role="img" aria-label="${esc(text)}">${cells}</span>`;
}
