/**
 * Interfaz (DOM) de las zonas explorables: nombre de la zona, grupo, avisos,
 * diálogo de salida y menú de pausa. Independiente del HUD de mazmorra.
 */
import { esc, portraitFrame, touchUi } from './kit';

export interface PartyEntry {
  name: string;
  species: string;
  connected: boolean;
  isMe: boolean;
  /** Zona en la que está (nombre). */
  where: string;
}

export class TownHud {
  private root: HTMLElement;
  private toastTimer = 0;
  promptOpen = false;
  menuOpen = false;

  /** @param onMenu abre el menú de pausa (botón táctil; con teclado, Esc). */
  constructor(onMenu: () => void) {
    this.root = document.getElementById('town-hud')!;
    this.root.innerHTML = `
      <div id="th-zone" class="panel"></div>
      <div id="th-party" class="panel"></div>
      <div id="th-dialog" class="panel hidden"></div>
      <div id="th-toast" class="win hidden"></div>
      <div id="th-help">${touchUi() ? 'Mantén el dedo en la pantalla para caminar hacia él' : 'Flechas/WASD: moverse · Mayús: correr · clic: caminar hacia el puntero · Esc: menú'}</div>
      <button id="th-menu-btn" class="win">Menú</button>`;
    this.q('#th-menu-btn').addEventListener('click', () => !this.promptOpen && onMenu());
    this.root.classList.remove('hidden');
  }

  private q(sel: string) {
    return this.root.querySelector(sel) as HTMLElement;
  }

  destroy() {
    clearTimeout(this.toastTimer);
    this.root.innerHTML = '';
    this.root.classList.add('hidden');
  }

  setZone(name: string, code?: string) {
    this.q('#th-zone').innerHTML = `<b>${esc(name)}</b>${code ? ` <span class="code">Sala ${esc(code)}</span>` : ''}`;
  }

  setParty(list: PartyEntry[]) {
    this.q('#th-party').innerHTML = list
      .map((p) => `<div class="member ${p.connected ? '' : 'ko'}">${portraitFrame(p.species, { size: 20 })}<b>${esc(p.name)}</b>${p.isMe ? ' (tú)' : ''}<small>${p.connected ? esc(p.where) : 'desconectado'}</small></div>`)
      .join('');
  }

  toast(text: string) {
    const t = this.q('#th-toast');
    t.textContent = text;
    t.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.classList.add('hidden'), 1800);
  }

  /** Diálogo con botones; el primero es la opción por defecto (Intro) y el último la de cancelar (Esc). */
  dialog(html: string, buttons: { label: string; action: () => void }[]) {
    const d = this.q('#th-dialog');
    d.innerHTML = `<div>${html}</div><div class="row">${buttons.map((b, i) => `<button data-i="${i}" class="${i === 0 ? 'primary' : ''}">${esc(b.label)}</button>`).join('')}</div>`;
    d.classList.remove('hidden');
    this.promptOpen = true;
    const close = () => {
      d.classList.add('hidden');
      this.promptOpen = false;
      window.removeEventListener('keydown', onKey, true);
    };
    const run = (i: number) => {
      close();
      buttons[i].action();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') run(0);
      else if (e.code === 'Escape') run(buttons.length - 1);
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    d.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => run(Number((b as HTMLElement).dataset.i))));
    window.addEventListener('keydown', onKey, true);
    return close;
  }
}
