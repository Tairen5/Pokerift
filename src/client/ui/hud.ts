/**
 * HUD de mazmorra (DOM) con la distribución horizontal del remake y el
 * aspecto de los juegos de DS: cajas y marcos de retrato originales (ui/kit.ts),
 * la fuente de mazmorra para la ubicación y la tipografía del HUD (Hud.png).
 *
 *   ┌ minimapa                                   equipo (retrato, Nv, HP) ┐
 *   │                    [turno cooperativo]                               │
 *   │                                                                      │
 *   └ [mazmorra  P1]   [mensajes, se desvanecen]       [movimientos (PP)]  ┘
 *
 * Solo LEE el estado; las acciones salen por los callbacks de la escena.
 */
import { getMove } from '../../shared/data/moves';
import { getItem } from '../../shared/data/items';
import { STATUSES } from '../../shared/data/statuses';
import { floorName, getDungeon } from '../../shared/data/dungeons';
import { Tile } from '../../shared/dungeon/map';
import type { Entity, GameState } from '../../shared/engine/state';
import type { TurnInfo } from '../../shared/net/protocol';
import { isUsable } from '../../shared/engine/items';
import { hitChance } from '../../shared/engine/combat';
import HUD_GLYPHS from '../assets/hud-glyphs.generated.json';
import { ROM_UI } from '../assets/ui-rom.generated';
import { CATALOG } from '../assets/catalog';
import { choiceBox, dialog, esc, menuList, portraitFrame, titleText, touchUi, win } from './kit';

export { portraitHtml } from './kit';

/**
 * Glifos del HUD original (Assets/HUD/Hud.png, extraídos por tools/build-ui.mjs):
 * cada carácter es un recorte de la hoja escalado con píxeles nítidos, así se
 * conservan sus colores y contornos. Claves: w0-w9 (números blancos), g0-g9
 * (verdes), oF/oLv/oHP/o//oB (etiquetas naranjas), yF… (amarillas), A-Z, signos.
 */
/** Hoja de glifos: la de la ROM (dígitos y etiquetas en español, tools/import-rom-ui.mjs) si se ha importado. */
const HUD_SHEET = ROM_UI?.hud ?? { sheet: HUD_GLYPHS.sheet, glyphs: HUD_GLYPHS.glyphs as Record<string, { x: number; y: number; w: number; h: number }> };
function glyph(key: string) {
  const r = HUD_SHEET.glyphs[key];
  return r ? `<i class="hg" style="--x:${r.x};--y:${r.y};--w:${r.w};--h:${r.h};--sw:${HUD_SHEET.sheet.w};--sh:${HUD_SHEET.sheet.h}"></i>` : '';
}
export function hudNumber(n: number, color: 'w' | 'g' = 'w') {
  return `<span class="hgn">${[...String(Math.max(0, Math.floor(n)))].map((d) => glyph(color + d)).join('')}</span>`;
}
/** "Lv 5" con la tipografía original. */
const hudLevel = (lv: number) => `<span class="hgl">${glyph('oLv')}${hudNumber(lv)}</span>`;
/** "HP 25/25" con la tipografía original. */
const hudHp = (hp: number, max: number) => `<span class="hgl">${glyph('oHP')}${hudNumber(hp)}${glyph('o/')}${hudNumber(max)}</span>`;

const TYPE_NAMES: Record<string, string> = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', grass: 'Planta', electric: 'Eléctrico', ice: 'Hielo',
  fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador', psychic: 'Psíquico', bug: 'Bicho',
  rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón', dark: 'Siniestro', steel: 'Acero',
};
export const typeName = (t: string | null) => (t ? TYPE_NAMES[t] ?? t : 'Sin tipo');

/** Segundos sin mensajes nuevos tras los que se oculta el cuadro (como en el original). */
const LOG_FADE_MS = 4500;
const LOG_LINES = 3;

export interface HudCallbacks {
  onUseMove(slot: number): void;
  onUseItem(bagUid: string): void;
  onStairs(): void;
  onExit(): void;
  onTouchDir(dir: number): void;
  onTouchAttack(): void;
  onTouchWait(): void;
  /** «Suelo»: la escalera o el objeto que hay bajo el jugador. */
  onTouchGround(): void;
  onToggleBag(): void;
}

/** Barra de HP original: verde = vida restante sobre naranja = vida perdida. */
function hpBar(hp: number, max: number) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;
  return `<i class="hpbar"><b style="width:${pct}%"></b></i>`;
}

export class Hud {
  readonly root: HTMLElement;
  private logEl: HTMLElement;
  private floorEl: HTMLElement;
  private teamEl: HTMLElement;
  private movesEl: HTMLElement;
  private turnEl: HTMLElement;
  private bagEl: HTMLElement;
  private promptEl: HTMLElement;
  private endEl: HTMLElement;
  private helpEl: HTMLElement;
  private minimap: HTMLCanvasElement;
  private toastEl: HTMLElement;
  private bannerEl: HTMLElement;
  private bannerTimer = 0;
  private toastTimer = 0;
  private logTimer = 0;
  private history: string[] = [];
  bagOpen = false;
  bagIndex = 0;
  promptOpen = false;
  /** Opción marcada en la caja Sí/No de las escaleras (0 = avanzar). */
  promptIndex = 0;
  /** Movimiento marcado con el cursor en la caja de movimientos. */
  private moveSel = 0;
  private hpOverride = new Map<string, number>();
  /** Iconos originales del minimapa (ROM importada). */
  private minimapIcons: HTMLImageElement | null = null;
  /** Estilo del minimapa: 0 semitransparente, 1 contorno, 2 opaco, 3 oculto (M). */
  private minimapStyle = 0;
  private minimapArgs: [GameState, Set<number>, Set<number>, string | undefined] | null = null;
  private blinkTimer = 0;
  private blinkOn = true;
  private floorCardEl!: HTMLElement;
  /** Descripción de la escalera a la vista (opción «Info»). */
  private promptInfo = false;

  constructor(private cb: HudCallbacks) {
    this.root = document.getElementById('hud')!;
    this.root.innerHTML = `
      <canvas id="hud-minimap" width="224" height="128"></canvas>
      <div id="hud-team"></div>
      ${win('', { id: 'hud-turn', cls: 'hidden' })}
      <div id="hud-bottom">
        <div id="hud-floor"></div>
        ${win('', { id: 'hud-log', cls: 'idle', attrs: 'title="Clic: historial de mensajes"' })}
        ${win('', { id: 'hud-moves' })}
      </div>
      <div id="hud-bag" class="hidden"></div>
      <div id="hud-prompt" class="hidden"></div>
      ${win('', { id: 'hud-toast', cls: 'hidden' })}
      ${win('', { id: 'hud-banner', cls: 'hidden' })}
      ${win(
        `<div class="win-title">Controles</div>
        <p>Flechas / WASD: moverse · Q E Z C o dos flechas: diagonal</p>
        <p>Mayús: solo diagonales · R + dirección: girarse</p>
        <p>Espacio: atacar · 1-4: movimientos · X: esperar</p>
        <p>I: mochila · G: recoger · Intro: escaleras · M: minimapa · H: cerrar</p>`,
        { id: 'hud-help', style: 'plain', cls: 'hidden' },
      )}
      <div id="hud-end" class="hidden"></div>
      <div id="hud-floorcard" class="hidden"></div>
      <div id="touch-controls">
        <div class="dpad">${[7, 8, 9, 4, 5, 6, 1, 2, 3].map((n) => `<button data-num="${n}">${'↖↑↗← →↙↓↘'[[7, 8, 9, 4, 5, 6, 1, 2, 3].indexOf(n)]}</button>`).join('')}</div>
        <div class="tbtns"><button data-t="attack">Atacar</button><button data-t="ground">Suelo</button><button data-t="bag">Mochila</button></div>
      </div>`;
    this.teamEl = this.q('#hud-team');
    this.floorEl = this.q('#hud-floor');
    this.movesEl = this.q('#hud-moves');
    this.logEl = this.q('#hud-log');
    this.turnEl = this.q('#hud-turn');
    this.bagEl = this.q('#hud-bag');
    this.promptEl = this.q('#hud-prompt');
    this.endEl = this.q('#hud-end');
    this.helpEl = this.q('#hud-help');
    this.toastEl = this.q('#hud-toast');
    this.bannerEl = this.q('#hud-banner');
    this.minimap = this.q('#hud-minimap') as HTMLCanvasElement;
    this.floorCardEl = this.q('#hud-floorcard');
    if (ROM_UI?.minimap) {
      const img = new Image();
      img.onload = () => {
        this.minimapIcons = img;
        if (this.minimapArgs) this.drawMinimap(...this.minimapArgs);
      };
      img.src = ROM_UI.minimap.url;
    }
    // El icono del líder parpadea, como en el juego. [INCIERTO] Ritmo exacto del parpadeo.
    this.blinkTimer = window.setInterval(() => {
      this.blinkOn = !this.blinkOn;
      if (this.minimapIcons && this.minimapArgs) this.drawMinimap(...this.minimapArgs);
    }, 400);

    this.movesEl.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('[data-slot]') as HTMLElement | null;
      if (b && !b.classList.contains('empty')) {
        this.selectMove(Number(b.dataset.slot));
        this.cb.onUseMove(Number(b.dataset.slot));
      }
    });
    this.bagEl.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('[data-uid]') as HTMLElement | null;
      if (b) this.cb.onUseItem(b.dataset.uid!);
      if ((e.target as HTMLElement).closest('[data-close]')) this.cb.onToggleBag();
    });
    this.logEl.addEventListener('click', () => this.toggleHistory());
    // Mapeo teclado numérico → Dir (S=0,SE=1,E=2,NE=3,N=4,NW=5,W=6,SW=7)
    const NUM_DIR: Record<number, number> = { 2: 0, 3: 1, 6: 2, 9: 3, 8: 4, 7: 5, 4: 6, 1: 7 };
    this.q('#touch-controls').addEventListener('click', (e) => {
      const b = e.target as HTMLElement;
      if (b.dataset.num) {
        const n = Number(b.dataset.num);
        if (n === 5) this.cb.onTouchWait();
        else this.cb.onTouchDir(NUM_DIR[n]);
      }
      if (b.dataset.t === 'attack') this.cb.onTouchAttack();
      if (b.dataset.t === 'bag') this.cb.onToggleBag();
      if (b.dataset.t === 'ground') this.cb.onTouchGround();
    });
    this.root.classList.remove('hidden');
    this.log(touchUi() ? 'Toca los mensajes para ver el historial.' : 'H: controles · L: historial de mensajes');
  }

  private q(sel: string) {
    return this.root.querySelector(sel) as HTMLElement;
  }

  destroy() {
    clearInterval(this.blinkTimer);
    clearTimeout(this.logTimer);
    clearTimeout(this.toastTimer);
    clearTimeout(this.bannerTimer);
    this.root.innerHTML = '';
    this.root.classList.add('hidden');
  }

  // ── Mensajes ─────────────────────────────────────────────────────────

  /** Añade un mensaje al cuadro; se muestran las últimas líneas y se desvanece al rato. */
  log(text: string) {
    this.history.push(text);
    if (this.history.length > 60) this.history.shift();
    if (!this.logEl.classList.contains('expanded')) this.renderLog();
    this.logEl.classList.remove('idle');
    clearTimeout(this.logTimer);
    this.logTimer = window.setTimeout(() => {
      if (!this.logEl.classList.contains('expanded')) this.logEl.classList.add('idle');
    }, LOG_FADE_MS);
  }

  private renderLog() {
    const expanded = this.logEl.classList.contains('expanded');
    const lines = expanded ? this.history.slice(-14) : this.history.slice(-LOG_LINES);
    this.logEl.innerHTML = lines.map((l) => `<div>${esc(l)}</div>`).join('');
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  /** Historial de mensajes (clic en el cuadro o tecla L). */
  toggleHistory() {
    this.logEl.classList.toggle('expanded');
    this.logEl.classList.remove('idle');
    this.renderLog();
  }

  /** Marca un movimiento en la caja de movimientos (se redibuja en el siguiente update). */
  selectMove(slot: number) {
    this.moveSel = slot;
    this.movesEl.querySelectorAll('.mitem').forEach((b, i) => b.classList.toggle('sel', i === slot));
  }

  toggleHelp() {
    this.helpEl.classList.toggle('hidden');
  }

  /** Aviso grande y breve (cambio entre exploración y combate). */
  banner(text: string) {
    this.bannerEl.textContent = text;
    this.bannerEl.classList.remove('hidden');
    this.bannerEl.classList.toggle('combat', text.startsWith('¡Combate'));
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => this.bannerEl.classList.add('hidden'), 1400);
  }

  toast(text: string) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.add('hidden'), 1600);
  }

  /** HP mostrado durante una animación (antes de sincronizar con el estado final). */
  setHp(id: string, hp: number) {
    this.hpOverride.set(id, hp);
  }
  clearHpOverrides() {
    this.hpOverride.clear();
  }
  private hpOf(e: Entity) {
    return this.hpOverride.get(e.id) ?? e.hp;
  }

  // ── Actualización ────────────────────────────────────────────────────

  update(state: GameState, me: Entity | undefined, info: TurnInfo, mode: 'solo' | 'online', code?: string, localPlayerId?: string) {
    const dungeon = getDungeon(state.dungeonId);
    // Ubicación (abajo a la izquierda, sin caja): nombre y planta con la fuente de
    // mazmorra y una línea blanca fina entre ambos. Cada palabra es un bloque, así
    // los nombres largos pasan a otra línea en vez de salirse.
    const loc = `<div class="dname">${floorName(dungeon, state.floor).split(' ').map((w) => titleText(w)).join('')}</div><div class="dfloor">${titleText(`P${state.floor}`)}</div>`;
    if (this.floorEl.dataset.loc !== loc) {
      this.floorEl.dataset.loc = loc;
      this.floorEl.innerHTML = loc;
    }

    // Equipo (arriba a la derecha): una fila compacta por Pokémon, el jugador local
    // primero y más grande. Sin caja: franja translúcida rematada con una línea blanca.
    const slots = [...state.players].sort((a, b) => Number(b.playerId === localPlayerId) - Number(a.playerId === localPlayerId));
    this.teamEl.innerHTML = slots
      .map((slot, i) => {
        const e = state.entities.find((x) => x.id === slot.entityId)!;
        const isMe = slot.playerId === localPlayerId;
        const big = i === 0;
        const hp = e.fainted ? 0 : this.hpOf(e);
        const shown = slot.name && slot.name !== 'Explorador' ? slot.name : e.name;
        const statuses = e.statuses.map((s) => `<em style="--c:${STATUSES[s.id].color}">${STATUSES[s.id].label}</em>`).join('');
        const tags = [
          !slot.connected ? 'IA' : '',
          e.fainted ? 'Debilitado' : '',
          info.waitingFor.includes(slot.playerId) && mode === 'online' && info.mode === 'tactical' && !isMe ? 'Eligiendo…' : '',
        ].filter(Boolean);
        // Retrato a tamaño original (40) en la fila principal y a la mitad exacta en el resto.
        const mood = !e.fainted && hp * 4 <= e.maxHp ? 'pain' : 'normal';
        return `<div class="member ${big ? 'big' : ''} ${e.fainted ? 'ko' : ''}">
          ${portraitFrame(e.species, { mood, size: big ? 40 : 20 })}
          <div class="info">
            <div class="l1">${hudLevel(e.level)}<span class="name">${esc(shown)}</span>${statuses}${tags.length ? `<span class="tag">${tags.join(' · ')}</span>` : ''}</div>
            <div class="l2">${hudHp(hp, e.maxHp)}${hpBar(hp, e.maxHp)}</div>
            ${big && isMe ? `<div class="l3" title="Barriga ${Math.ceil(e.belly)}/${e.maxBelly}">Barriga ${Math.ceil(e.belly)} · ${state.money} P</div>` : ''}
          </div>
        </div>`;
      })
      .join('');

    if (me) {
      const rows = [0, 1, 2, 3].map((i) => {
        const m = me.moves[i];
        if (!m) return { label: `<kbd>${i + 1}</kbd>—`, cls: 'empty', data: { slot: i } };
        const mv = getMove(m.id);
        return {
          label: `<kbd>${i + 1}</kbd><span class="tdot t-${mv.type ?? 'none'}"></span>${esc(mv.name)}`,
          right: `${m.pp}/${m.maxPp}`,
          cls: m.pp <= 0 ? 'nopp' : '',
          data: { slot: i },
          title: `${typeName(mv.type)} · Pot. ${mv.power} · Prec. ${hitChance(mv) >= 1 ? '—' : Math.round(hitChance(mv) * 100)}`,
        };
      });
      // El cursor marca el último movimiento elegido (con 1-4 o con el ratón).
      this.movesEl.innerHTML = menuList(rows, me.moves[this.moveSel] ? this.moveSel : -1, 'moves');
    }

    if (mode === 'online' && !state.result) {
      const others = info.waitingFor.filter((id) => id !== localPlayerId);
      const names = others.map((id) => state.players.find((p) => p.playerId === id)?.name ?? id);
      const mine = localPlayerId && info.waitingFor.includes(localPlayerId);
      this.turnEl.classList.remove('hidden');
      this.turnEl.classList.toggle('combat', info.mode === 'tactical');
      this.turnEl.innerHTML =
        info.mode === 'explore'
          ? `Exploración libre · Sala ${esc(code ?? '')}`
          : `¡Combate! Turno ${info.turn} · ${mine ? '<b>Tu turno</b>' : 'Acción elegida'}${names.length ? ` · Esperando a ${names.map(esc).join(', ')}` : ''}${info.deadline !== null ? ` · ${info.deadline} s` : ''}`;
    } else {
      this.turnEl.classList.add('hidden');
    }
    if (this.bagOpen) this.renderBag(state);
  }

  // ── Mochila ──────────────────────────────────────────────────────────
  toggleBag(state: GameState, open = !this.bagOpen) {
    this.bagOpen = open;
    this.bagEl.classList.toggle('hidden', !open);
    if (open) {
      this.bagIndex = Math.min(this.bagIndex, Math.max(0, state.bag.length - 1));
      this.renderBag(state);
    }
  }

  moveBagCursor(state: GameState, delta: number) {
    if (!state.bag.length) return;
    this.bagIndex = (this.bagIndex + delta + state.bag.length) % state.bag.length;
    this.renderBag(state);
  }

  selectedBagUid(state: GameState): string | undefined {
    return state.bag[this.bagIndex]?.uid;
  }

  private renderBag(state: GameState) {
    const sel = state.bag[this.bagIndex];
    const items = state.bag.map((b) => {
      const it = getItem(b.item);
      const icon = CATALOG.items[b.item] ? `<img class="item-icon" src="${CATALOG.items[b.item]}" alt="">` : `<span class="dot" style="background:${it.color}"></span>`;
      return { label: `${icon}${esc(it.name)}`, disabled: !isUsable(b.item), data: { uid: b.uid } };
    });
    // Lista de objetos en una caja con título y la descripción en otra caja debajo.
    this.bagEl.innerHTML = `${win(
      `<div class="win-title">Mochila <small>${state.bag.length}/${state.rules.bagCapacity}</small><button data-close class="close">×</button></div>
      ${items.length ? menuList(items, this.bagIndex, 'items') : '<p class="empty">La mochila está vacía.</p>'}`,
      { cls: 'bag-list' },
    )}${win(`${sel ? esc(getItem(sel.item).description) : '&nbsp;'}<p class="hint">↑↓ elegir · Intro usar · Esc cerrar</p>`, { cls: 'desc' })}`;
  }

  // ── Escaleras ────────────────────────────────────────────────────────
  /** Aviso de escaleras: caja de elección encima, a la derecha, de la caja de diálogo (como en EoS). */
  showStairsPrompt(show: boolean) {
    this.promptOpen = show;
    this.promptEl.classList.toggle('hidden', !show);
    // La caja de diálogo de la escalera ocupa el sitio de la de mensajes.
    this.root.classList.toggle('prompting', show);
    if (show) {
      this.promptIndex = 0;
      this.promptInfo = false;
      this.renderPrompt();
    }
  }

  /**
   * Menú de la escalera con las opciones del original (text_e.str: «Proceed», «Info», «Cancel»).
   * «Info» muestra la descripción del juego (cadena 2246, traducida).
   */
  private renderPrompt() {
    const text = this.promptInfo
      ? 'Escaleras que llevan al siguiente piso. Si estás en el último piso, saldrás de la mazmorra.'
      : 'Hay unas escaleras. ¿Qué quieres hacer?';
    this.promptEl.innerHTML = `${choiceBox(
      [{ label: 'Avanzar', data: { choice: 'yes' } }, { label: 'Info', data: { choice: 'info' } }, { label: 'Cancelar', data: { choice: 'no' } }],
      this.promptIndex,
    )}
      ${dialog({ text })}`;
    this.promptEl.querySelectorAll('[data-choice]').forEach((b, i) =>
      b.addEventListener('click', () => {
        this.promptIndex = i;
        this.choosePrompt();
      }),
    );
  }

  /** Elige la opción marcada (Avanzar baja de piso; Info alterna la descripción; Cancelar cierra). */
  choosePrompt() {
    if (this.promptIndex === 0) {
      this.showStairsPrompt(false);
      this.cb.onStairs();
    } else if (this.promptIndex === 1) {
      this.promptInfo = !this.promptInfo;
      this.renderPrompt();
    } else this.showStairsPrompt(false);
  }

  movePromptCursor(delta: number) {
    this.promptIndex = (this.promptIndex + delta + 3) % 3;
    this.renderPrompt();
  }

  // ── Cambio de piso ───────────────────────────────────────────────────
  /** Pantalla negra con el nombre de la mazmorra y la planta, entre piso y piso. */
  showFloorCard(dungeonName: string, floor: number) {
    this.floorCardEl.innerHTML = `<div class="fc-name">${dungeonName.split(' ').map((w) => titleText(w)).join('')}</div><div class="fc-floor">${titleText(`P${floor}`)}</div>`;
    this.floorCardEl.classList.remove('hidden', 'out');
  }

  hideFloorCard() {
    this.floorCardEl.classList.add('out');
    window.setTimeout(() => this.floorCardEl.classList.add('hidden'), 300);
  }

  // ── Final ────────────────────────────────────────────────────────────
  showEnd(state: GameState, me: Entity | undefined) {
    const won = state.result === 'cleared';
    this.endEl.classList.remove('hidden');
    this.endEl.innerHTML = `<div class="win end-box">
      <h2>${won ? '¡Expedición completada!' : 'Expedición fallida'}</h2>
      <p>${esc(state.defeatReason ?? (won ? `Has superado los ${getDungeon(state.dungeonId).floors} pisos de la expedición.` : ''))}</p>
      <table>
        <tr><td>Piso alcanzado</td><td>${state.floor}</td></tr>
        <tr><td>Nivel final</td><td>${me?.level ?? '-'}</td></tr>
        <tr><td>Enemigos derrotados</td><td>${state.stats.enemiesDefeated}</td></tr>
        <tr><td>Objetos recogidos</td><td>${state.stats.itemsCollected}</td></tr>
        <tr><td>Turnos</td><td>${state.stats.turns}</td></tr>
        <tr><td>Poké</td><td>${state.money}</td></tr>
      </table>
      <p class="hint">El nivel, los objetos y el dinero de esta expedición no se conservan.</p>
      <button id="end-exit" class="choice sel">Volver a la Encrucijada</button></div>`;
    this.endEl.querySelector('#end-exit')!.addEventListener('click', () => this.cb.onExit());
  }

  // ── Minimapa ─────────────────────────────────────────────────────────
  /** M: semitransparente → contorno → opaco → oculto (los estilos del original). */
  cycleMinimapStyle() {
    this.minimapStyle = (this.minimapStyle + 1) % 4;
    this.minimap.classList.toggle('hidden', this.minimapStyle === 3);
    if (this.minimapArgs) this.drawMinimap(...this.minimapArgs);
  }

  drawMinimap(state: GameState, explored: Set<number>, visible: Set<number>, meId?: string) {
    this.minimapArgs = [state, explored, visible, meId];
    if (this.minimapIcons && ROM_UI?.minimap) this.drawMinimapRom(state, explored, visible, meId);
    else this.drawMinimapPlain(state, explored, visible, meId);
  }

  /**
   * Minimapa con los iconos originales (dungeon.bin 1035) y la lógica de DrawMinimapTile (overlay29):
   * por casilla, primero el Pokémon (líder 8, parpadeando; compañero 10; enemigo 2), si no la trampa
   * o el objeto (trampa 4, objeto 3), si no la escalera (6) y, si no, el suelo explorado (16 + lados
   * con pared: 1 abajo, 2 derecha, 4 arriba, 8 izquierda).
   */
  private drawMinimapRom(state: GameState, explored: Set<number>, visible: Set<number>, meId?: string) {
    const ctx = this.minimap.getContext('2d')!;
    const { map } = state;
    const C = ROM_UI!.minimap!.cell, row = Math.min(this.minimapStyle, 2) * C;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.minimap.width, this.minimap.height);
    const icon = (i: number, t: number) => ctx.drawImage(this.minimapIcons!, i * C, row, C, C, (t % map.width) * C, Math.floor(t / map.width) * C, C, C);
    const isFloor = (x: number, y: number) => x >= 0 && y >= 0 && x < map.width && y < map.height && map.tiles[y * map.width + x] === Tile.Floor;
    const floorIcon = (t: number) => {
      const x = t % map.width, y = Math.floor(t / map.width);
      return 16 + ((isFloor(x, y + 1) ? 0 : 1) | (isFloor(x + 1, y) ? 0 : 2) | (isFloor(x, y - 1) ? 0 : 4) | (isFloor(x - 1, y) ? 0 : 8));
    };
    const k = (p: { x: number; y: number }) => p.y * map.width + p.x;
    const icons = new Map<number, number>();
    if (explored.has(k(map.stairs))) icons.set(k(map.stairs), 6);
    for (const t of state.traps) if (t.revealed && explored.has(k(t.pos))) icons.set(k(t.pos), 4);
    for (const it of state.items) if (explored.has(k(it.pos))) icons.set(k(it.pos), 3);
    for (const e of state.entities) {
      if (e.fainted) continue;
      if (e.team === 'enemy') {
        if (visible.has(k(e.pos))) icons.set(k(e.pos), 2);
      } else if (e.id === meId) {
        // Mientras parpadea «apagado» se ve lo que hay debajo.
        if (this.blinkOn) icons.set(k(e.pos), 8);
      } else icons.set(k(e.pos), 10);
    }
    for (const t of explored) if (map.tiles[t] === Tile.Floor && !icons.has(t)) icon(floorIcon(t), t);
    for (const [t, i] of icons) icon(i, t);
  }

  /** Minimapa sin la ROM: suelo explorado en azul translúcido con contorno claro. */
  private drawMinimapPlain(state: GameState, explored: Set<number>, visible: Set<number>, meId?: string) {
    const ctx = this.minimap.getContext('2d')!;
    const { map } = state;
    const s = Math.floor(Math.min(this.minimap.width / map.width, this.minimap.height / map.height));
    ctx.clearRect(0, 0, this.minimap.width, this.minimap.height);
    const floorAt = (x: number, y: number) => explored.has(y * map.width + x) && map.tiles[y * map.width + x] === Tile.Floor;
    for (const k of explored) {
      if (map.tiles[k] !== Tile.Floor) continue;
      const x = k % map.width, y = Math.floor(k / map.width);
      ctx.fillStyle = visible.has(k) ? 'rgba(96,136,232,0.75)' : 'rgba(64,96,200,0.55)';
      ctx.fillRect(x * s, y * s, s, s);
      ctx.fillStyle = 'rgba(224,236,255,0.9)';
      if (!floorAt(x, y - 1)) ctx.fillRect(x * s, y * s, s, 1);
      if (!floorAt(x, y + 1)) ctx.fillRect(x * s, y * s + s - 1, s, 1);
      if (!floorAt(x - 1, y)) ctx.fillRect(x * s, y * s, 1, s);
      if (!floorAt(x + 1, y)) ctx.fillRect(x * s + s - 1, y * s, 1, s);
    }
    const dot = (x: number, y: number, color: string) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(x * s - 1, y * s - 1, s + 2, s + 2);
      ctx.fillStyle = color;
      ctx.fillRect(x * s, y * s, s, s);
    };
    const sk = map.stairs.y * map.width + map.stairs.x;
    if (explored.has(sk)) dot(map.stairs.x, map.stairs.y, '#ffffff');
    for (const it of state.items) if (visible.has(it.pos.y * map.width + it.pos.x)) dot(it.pos.x, it.pos.y, '#40e0ff');
    for (const e of state.entities) {
      if (e.fainted) continue;
      if (e.team === 'enemy') {
        if (visible.has(e.pos.y * map.width + e.pos.x)) dot(e.pos.x, e.pos.y, '#ff4040');
      } else dot(e.pos.x, e.pos.y, e.id === meId ? '#ffe040' : '#60f060');
    }
  }
}

