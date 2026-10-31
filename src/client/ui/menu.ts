/**
 * Paneles DOM que se abren desde el menú principal de Phaser: configuración
 * de partida (solitario / crear sala / unirse), lobby cooperativo, historial
 * y créditos. Se muestran sobre el fondo animado del menú.
 */
import { PLAYABLE_SPECIES, getSpecies } from '../../shared/data/species';
import { getDungeon } from '../../shared/data/dungeons';
import { getMove } from '../../shared/data/moves';
import type { LobbyInfo } from '../../shared/net/protocol';
import { ABILITY_NAMES } from '../../shared/engine/abilities';
import { loadProfile, saveProfile } from '../meta/profile';
import { typeName } from './hud';
import { portraitFrame } from './kit';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export type SetupKind = 'solo' | 'create' | 'join';

export interface SetupResult {
  name: string;
  species: string;
  seed: string;
  code: string;
}

function speciesGrid(selected: string | null, taken: Set<string> = new Set()) {
  return PLAYABLE_SPECIES.map((id) => {
    const sp = getSpecies(id);
    const dis = taken.has(id) && id !== selected;
    return `<button class="sp ${id === selected ? 'sel' : ''}" data-sp="${id}" ${dis ? 'disabled' : ''}
      title="${esc(sp.learnset.filter((l) => l.level === 1).map((l) => getMove(l.move).name).join(', '))}">
      ${portraitFrame(id)}
      <b>${sp.name}</b><small>${sp.types.map(typeName).join(' / ')}</small></button>`;
  }).join('');
}

function open(root: HTMLElement, html: string) {
  root.classList.remove('hidden');
  root.innerHTML = `<div class="menu panel">${html}</div>`;
}

export function hideMenu(root: HTMLElement) {
  root.classList.add('hidden');
  root.innerHTML = '';
}

const TITLES: Record<SetupKind, [string, string]> = {
  solo: ['Aventura en solitario', 'Empezar en casa'],
  create: ['Crear sala cooperativa', 'Crear sala'],
  join: ['Unirse a una sala', 'Unirse'],
};

/** Nombre + Pokémon (+ semilla o código). */
export function showSetup(root: HTMLElement, kind: SetupKind, onDone: (r: SetupResult) => void, onBack: () => void, error?: string) {
  const profile = loadProfile();
  let species = profile.lastSpecies;
  const [title, cta] = TITLES[kind];
  open(
    root,
    `<h1>${title}</h1>
    ${error ? `<p class="error">${esc(error)}</p>` : ''}
    <label>Nombre <input id="m-name" maxlength="14" value="${esc(profile.name)}" placeholder="Explorador"></label>
    ${kind === 'join' ? '<label>Código de la sala <input id="m-code" maxlength="5" placeholder="ABCDE" style="text-transform:uppercase"></label>' : ''}
    <h3>Elige tu Pokémon</h3>
    <div class="species" id="m-species">${speciesGrid(species)}</div>
    <div id="m-info" class="info"></div>
    ${kind === 'solo' ? '<label>Semilla de la mazmorra (opcional) <input id="m-seed" placeholder="aleatoria"></label>' : ''}
    <div class="row"><button id="m-ok" class="primary">${cta}</button><button id="m-back">Volver</button></div>`,
  );
  const $ = (s: string) => root.querySelector(s) as HTMLInputElement | null;
  const showInfo = () => {
    const sp = getSpecies(species);
    $('#m-info')!.innerHTML = `<b>${sp.name}</b> · ${sp.types.map(typeName).join('/')} · Habilidad: ${sp.abilities.map((a) => ABILITY_NAMES[a] ?? a).join(', ')} ·
      Movimientos: ${sp.learnset.filter((l) => l.level === 1).map((l) => getMove(l.move).name).join(', ')}`;
  };
  showInfo();
  $('#m-species')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('[data-sp]') as HTMLElement | null;
    if (!b) return;
    species = b.dataset.sp!;
    root.querySelectorAll('.sp').forEach((x) => x.classList.toggle('sel', (x as HTMLElement).dataset.sp === species));
    showInfo();
  });
  const submit = () => {
    const name = $('#m-name')!.value.trim() || 'Explorador';
    const code = ($('#m-code')?.value ?? '').trim().toUpperCase();
    if (kind === 'join' && code.length < 4) {
      $('#m-code')!.focus();
      return;
    }
    const p = loadProfile();
    p.name = name === 'Explorador' ? p.name : name;
    p.lastSpecies = species;
    saveProfile(p);
    onDone({ name, species, seed: ($('#m-seed')?.value ?? '').trim(), code });
  };
  $('#m-ok')!.addEventListener('click', submit);
  $('#m-back')!.addEventListener('click', onBack);
  root.querySelector('.menu')!.addEventListener('keydown', (e) => {
    const ev = e as KeyboardEvent;
    if (ev.key === 'Enter') submit();
    if (ev.key === 'Escape') onBack();
  });
  ($('#m-code') ?? $('#m-name'))!.focus();
}

export function showMessage(root: HTMLElement, text: string, onBack?: () => void) {
  open(root, `<p>${esc(text)}</p>${onBack ? '<div class="row"><button id="m-back">Volver</button></div>' : ''}`);
  if (onBack) root.querySelector('#m-back')!.addEventListener('click', onBack);
}

export function showHistory(root: HTMLElement, onBack: () => void) {
  const profile = loadProfile();
  const hist = profile.history
    .map(
      (h) => `<li class="${h.result}">${h.result === 'cleared' ? '✔' : '✖'} ${esc(getSpecies(h.species)?.name ?? h.species)} Nv${h.level} ·
        ${esc(getDungeon(h.dungeonId).name)} P${h.floorReached} · ${h.enemiesDefeated} derrotados · ${h.mode === 'online' ? 'coop' : 'solo'}</li>`,
    )
    .join('');
  open(
    root,
    `<h1>Expediciones anteriores</h1>
    <p class="sub">${profile.totals.expeditions} jugadas · ${profile.totals.cleared} completadas · ${profile.totals.enemiesDefeated} enemigos derrotados.
    El nivel, los objetos y el dinero de cada expedición no se conservan.</p>
    <ul class="history">${hist || '<li>Aún no hay expediciones.</li>'}</ul>
    <div class="row"><button id="m-back" class="primary">Volver</button></div>`,
  );
  root.querySelector('#m-back')!.addEventListener('click', onBack);
}

export function showCredits(root: HTMLElement, onBack: () => void) {
  open(
    root,
    `<h1>Créditos</h1>
    <p class="sub">Fan game sin ánimo de lucro. Pokémon y Mundo Misterioso © Nintendo, Creatures, GAME FREAK y Spike Chunsoft.</p>
    <ul class="history">
      <li>Sprites, animaciones y retratos: <b>PMDCollab / SpriteCollab</b> (CC BY-NC 4.0). Autores por especie en assets/pokemon/CREDITS.md.</li>
      <li>Intro (Exploradores del Cielo): capas ripeadas por el autor indicado en las propias hojas (Assets/Intro, "no credit needed").</li>
      <li>Mapas de Risco Sharpedo, Aldea Tesoro, Encrucijada, playa y gremio (Exploradores del Cielo): ripeados por <b>redblueyellow</b>.</li>
      <li>Tileset de Bosque Diminuto: ripeado por <b>SilverDeoxys563</b>.</li>
      <li>Tipografía y barra de HP del HUD: ripeadas por <b>KillerAslox</b>.</li>
      <li>Cajas de texto y marcos de retrato: ripeados por <b>redblueyellow</b>.</li>
      <li>Iconos de objetos, escaleras y trampas: ripeados por <b>redblueyellow</b> (DS) y <b>Mystery.Dungeon</b> (GBA). Efectos de movimientos e iconos de estado: hojas de Exploradores del Cielo.</li>
      <li>Fuente de diálogo: ripeada por <b>John2k4</b>.</li>
      <li>Fuente de títulos de Exploradores del Cielo (Assets/Font).</li>
    </ul>
    <div class="row"><button id="m-back" class="primary">Volver</button></div>`,
  );
  root.querySelector('#m-back')!.addEventListener('click', onBack);
}

export interface LobbyActions {
  pick(species: string): void;
  start(): void;
  leave(): void;
}

export function showLobby(root: HTMLElement, lobby: LobbyInfo, me: string, actions: LobbyActions, status = '') {
  const mine = lobby.players.find((p) => p.playerId === me);
  const taken = new Set(lobby.players.map((p) => p.species).filter((s): s is string => !!s));
  const canStart = mine?.isHost && lobby.players.every((p) => p.species);
  open(
    root,
    `<h1>Sala ${esc(lobby.code)}</h1>
      <p class="sub">Comparte este código con tus compañeros (hasta 4 jugadores). Cuando estéis todos, el anfitrión os lleva a casa (Risco Sharpedo); a las mazmorras se sale por la Encrucijada.</p>
      ${status ? `<p class="error">${esc(status)}</p>` : ''}
      <ul class="lobby">${lobby.players
        .map(
          (p) => `<li>${p.species ? portraitFrame(p.species, { size: 20 }) : ''}${p.isHost ? '★ ' : ''}<b>${esc(p.name)}</b>${p.playerId === me ? ' (tú)' : ''} —
            ${p.species ? esc(getSpecies(p.species).name) : '<i>eligiendo…</i>'} ${p.connected ? '' : '· desconectado'}</li>`,
        )
        .join('')}</ul>
      <h3>Tu Pokémon</h3>
      <div class="species" id="l-species">${speciesGrid(mine?.species ?? null, taken)}</div>
      <div class="row">
        <button id="l-start" class="primary" ${canStart ? '' : 'disabled'}>${mine?.isHost ? '¡En marcha!' : 'Esperando al anfitrión…'}</button>
        <button id="l-leave">Salir</button>
      </div>`,
  );
  root.querySelector('#l-species')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('[data-sp]') as HTMLElement | null;
    if (b) actions.pick(b.dataset.sp!);
  });
  root.querySelector('#l-start')!.addEventListener('click', () => actions.start());
  root.querySelector('#l-leave')!.addEventListener('click', () => actions.leave());
}
