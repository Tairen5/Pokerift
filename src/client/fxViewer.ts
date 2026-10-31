/**
 * Visor de efectos de movimiento (fx-viewer.html): reproduce cada movimiento del
 * registro (assets/moveFx.ts) con el mismo reproductor que la mazmorra (FxPlayer)
 * entre un atacante y un objetivo, en la dirección elegida, para comprobar que
 * cada ataque lleva su animación. También reproduce cualquier efecto del
 * catálogo suelto, y CUALQUIER movimiento del juego (los 536 con animación
 * importados de la ROM a public/assets/effects/eos, con su información en
 * moves.json), cargando sus efectos bajo demanda.
 * En desarrollo: http://localhost:5173/fx-viewer.html (?move=thunderShock&dir=2
 * o ?eos=188 para abrir uno concreto). npm run fx-check lo usa.
 */
import Phaser from 'phaser';
import { DIR_DELTA, type Dir } from '../shared/core/geometry';
import { MOVES } from '../shared/data/moves';
import { CATALOG } from './assets/catalog';
import { HAS_ROM_FX, MOVE_FX_IDS, type FxRole, eosMoveFx, hitReactionFx, moveFx, userAnimFor, userAnimForEos } from './assets/moveFx';
import type { AnimAction } from './assets/catalog';
import { loadFx } from './render/fxAnims';
import { BootScene } from './scenes/BootScene';
import { FxPlayer } from './render/fxPlayer';
import { PokemonSprite } from './render/pokemonSprite';
import { TILE } from './render/placeholders';

const GROUND_Y = 4;
const DIR_NAMES = ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'];
const SOURCE_LABEL = { rom: 'ROM', pixel: 'píxel', visual: 'a ojo' } as const;

class ViewerScene extends Phaser.Scene {
  fx!: FxPlayer;
  user!: PokemonSprite;
  target!: PokemonSprite;
  dir: Dir = 2 as Dir;
  /** Animación del atacante en la última reproducción (para las pruebas). */
  lastUserAnim: AnimAction | null = null;
  /** Efectos creados durante la última reproducción (para las pruebas). */
  spawned: string[] = [];

  constructor() {
    super('viewer');
  }

  create() {
    this.cameras.main.setBackgroundColor('#5a6a4a').setZoom(3).centerOn(0, 0);
    // Suelo de referencia: cuadrícula de casillas.
    const g = this.add.graphics().lineStyle(1, 0x6f8060, 1);
    for (let i = -6; i <= 6; i++) g.lineBetween(i * TILE - TILE / 2, -6 * TILE, i * TILE - TILE / 2, 6 * TILE).lineBetween(-6 * TILE, i * TILE - TILE / 2, 6 * TILE, i * TILE - TILE / 2);
    this.fx = new FxPlayer(this, () => 1, GROUND_Y);
    this.user = new PokemonSprite(this, 'pikachu', 0, 0, this.dir, { marker: 'player', groundY: GROUND_Y });
    this.target = new PokemonSprite(this, 'wurmple', 0, 0, this.dir, { marker: 'shadow', groundY: GROUND_Y });
    this.place();
    // Registrar qué efectos aparecen (fx-<clave>).
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, (o: Phaser.GameObjects.GameObject) => {
      const key = (o as Phaser.GameObjects.Sprite).texture?.key;
      if (key?.startsWith('fx-')) this.spawned.push(key.slice(3));
    });
    buildUi(this);
  }

  /** Atacante en el centro y objetivo en la casilla de al lado (o a 3 en los de línea). */
  place(tiles = 1) {
    const d = DIR_DELTA[this.dir];
    this.user.container.setPosition(-d.x * TILE * 0.5 * tiles, -d.y * TILE * 0.5 * tiles).setDepth(10);
    this.target.container.setPosition(d.x * TILE * 0.5 * tiles, d.y * TILE * 0.5 * tiles).setDepth(10 + d.y);
    this.user.play('idle', this.dir, true);
    this.target.play('idle', ((this.dir + 4) % 8) as Dir, true);
  }

  /** Reproduce un movimiento de Pokerift como en la mazmorra. */
  async playMove(moveId: string) {
    const entry = moveFx(moveId);
    const move = MOVES[moveId];
    if (!entry || !move) return;
    await this.playLayers(entry.effects, { line: move.range.kind === 'line', self: move.range.kind === 'self', status: move.category === 'status', melee: move.range.kind === 'front' }, entry.returnShot, userAnimFor(moveId, this.user.species));
  }

  /** Reproduce cualquier movimiento del juego por su move_id (capas importadas de la ROM). */
  async playEos(eosId: number, info?: EosMove) {
    const effects = eosMoveFx(eosId);
    if (!effects) return;
    const r = info?.data?.range ?? '';
    await this.playLayers(effects, { line: /Front_(2|10)/.test(r), self: /^User/.test(r), status: info?.data?.category === 'Status', melee: /^Front \(1 tile\)/.test(r) }, undefined, userAnimForEos(eosId, this.user.species) ?? viewerAnim(info, 25));
  }

  /** Carga → animación del atacante → proyectil → efectos en el objetivo (y de pantalla). */
  async playLayers(effects: Partial<Record<FxRole, string>>, kind: { line: boolean; self: boolean; status: boolean; melee: boolean }, returnShot?: string, userAnim?: AnimAction) {
    await loadFx(this, [...Object.values(effects), returnShot, hitReactionFx('neutral')]);
    const entry = { effects, returnShot };
    const move = { category: kind.status ? 'status' : 'physical', range: { kind: kind.self ? 'self' : kind.melee ? 'front' : kind.line ? 'line' : 'frontCutsCorners' } };
    const tiles = kind.line ? 3 : 1;
    this.place(tiles);
    this.spawned = [];
    const u = this.user.container, t = this.target.container;
    if (entry.effects.charge) await this.fx.play(entry.effects.charge, u.x, u.y, this.dir);
    // Animación del atacante de la tabla del juego (excepción de su especie incluida); si no, a ojo.
    const anim: AnimAction = userAnim ?? (move.category === 'status' || move.range.kind !== 'front' ? 'shoot' : 'attack');
    this.user.play(anim, this.dir, true);
    this.lastUserAnim = anim;
    await new Promise((r) => this.time.delayedCall(Math.max(90, this.user.hitDelay(anim)), r));
    if (entry.effects.projectile) await this.fx.fly(entry.effects.projectile, { x: u.x, y: u.y }, { x: t.x, y: t.y }, this.dir, 70 * tiles + 60);
    if (entry.effects.screen) void this.fx.screen(entry.effects.screen);
    if (entry.returnShot) await this.fx.fly(entry.returnShot, { x: t.x, y: t.y }, { x: u.x, y: u.y }, this.dir, 380);
    else {
      // Secundaria y principal sobre el objetivo (o el usuario si es sobre sí mismo) y, si hace daño, la reacción al golpe.
      const at = move.range.kind === 'self' ? u : t;
      const keys = [entry.effects.secondary, entry.effects.primary].filter((k): k is string => !!k);
      const reaction = move.category !== 'status' ? hitReactionFx('neutral') : undefined;
      if (move.category !== 'status' && move.range.kind !== 'self') this.target.play('hurt', ((this.dir + 4) % 8) as Dir, true);
      await Promise.all(keys.map((k) => this.fx.play(k, at.x, at.y, this.dir)));
      if (reaction) await this.fx.play(reaction, t.x, t.y, this.dir);
    }
    this.target.play('idle', ((this.dir + 4) % 8) as Dir, true);
    this.user.play('idle', this.dir, true);
  }

  async playEffect(key: string) {
    this.place();
    this.spawned = [];
    await this.fx.play(key, this.target.container.x, this.target.container.y, this.dir);
  }
}

/** Entrada de public/assets/effects/eos/moves.json (tools/import-pmd-scraper.mjs). */
interface EosMove {
  id: number;
  name: string | null;
  pokerift: string | null;
  data: { move_type: string; category: string; base_power: number; pp: number; accuracy1: number; accuracy2: number; range: string; target: string } | null;
  animation: { pokemon_anim_id: number; projectile_speed: number; sound_effect_id: number; special_animations?: { dex_id: number; user_animation_index: number }[] } | null;
  layers: { layer: string; effect: number; type: string | null; key: string | null }[];
  fx: Record<string, string> | null;
}

/** Animación del atacante de cualquier movimiento (moves.json) para la especie dada. */
function viewerAnim(info: EosMove | undefined, dex: number): AnimAction | undefined {
  const a = info?.animation;
  if (!a) return undefined;
  const idx = a.special_animations?.find((x) => x.dex_id === dex)?.user_animation_index ?? a.pokemon_anim_id;
  const key = `a${idx}` as AnimAction;
  return CATALOG.pokemon.pikachu?.anims[key] ? key : undefined;
}

/** Lista de todos los movimientos del juego con animación, con buscador. */
async function buildAllMoves(scene: ViewerScene, root: HTMLElement) {
  const res = await fetch('assets/effects/eos/moves.json').catch(() => null);
  if (!res?.ok) {
    root.innerHTML = '<p class="hint">Sin ROM importada: no hay animaciones del juego (npm run import:fx).</p>';
    return;
  }
  const all = ((await res.json()) as { moves: EosMove[] }).moves.filter((m) => m.fx);
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  root.innerHTML = `<h2>Todos los movimientos del juego (${all.length})</h2>
    <input id="q" placeholder="Buscar (nombre o move_id)…" style="width:100%">
    <table id="all"></table>`;
  const table = root.querySelector('#all') as HTMLTableElement;
  const draw = (q: string) => {
    const rows = all.filter((m) => !q || String(m.id) === q || (m.name ?? '').toLowerCase().includes(q.toLowerCase())).slice(0, 80);
    table.innerHTML = rows
      .map((m) => `<tr data-eos="${m.id}"><td><button>▶</button></td><td><b>${esc(m.name ?? '?')}</b>${m.pokerift ? ' ★' : ''}<br><small>move_id ${m.id}${m.data ? ` · ${m.data.move_type} · ${m.data.category} · P${m.data.base_power}` : ''}</small></td><td><small>${esc(Object.entries(m.fx ?? {}).map(([r, k]) => `${r}: ${k}`).join(', '))}${m.animation ? `<br>animación del atacante ${m.animation.pokemon_anim_id}` : ''}</small></td></tr>`)
      .join('');
    table.querySelectorAll<HTMLTableRowElement>('tr').forEach((tr) => {
      const m = all.find((x) => x.id === Number(tr.dataset.eos))!;
      tr.querySelector('button')!.onclick = () => void scene.playEos(m.id, m);
    });
  };
  const input = root.querySelector('#q') as HTMLInputElement;
  input.oninput = () => draw(input.value.trim());
  draw('');
  const eos = new URLSearchParams(location.search).get('eos');
  if (eos) void scene.playEos(Number(eos), all.find((m) => m.id === Number(eos)));
}

function buildUi(scene: ViewerScene) {
  const panel = document.getElementById('panel')!;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  panel.innerHTML = `
    <h1>Efectos de movimientos</h1>
    <p class="hint">${HAS_ROM_FX ? 'Tablas del juego importadas de la ROM.' : 'Sin ROM importada: asignaciones de respaldo.'} Mismo reproductor que la mazmorra. Origen: <b>ROM</b> = tablas del juego (pmd-scraper) · <b>píxel</b> = gráfico comprobado contra una hoja con nombre · <b>a ojo</b> = sin verificar.</p>
    <label>Dirección <select id="dir">${DIR_NAMES.map((n, i) => `<option value="${i}" ${i === 2 ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <table id="moves">${MOVE_FX_IDS.map((id) => {
      const e = moveFx(id)!;
      const fx = Object.entries(e.effects).map(([r, k]) => `${r}: ${k}${CATALOG.effects[k] ? '' : ' ✖'}`).join(', ') + (e.returnShot ? `, vuelta: ${e.returnShot}` : '');
      return `<tr data-move="${id}"><td><button>▶</button></td><td><b>${esc(MOVES[id]?.name ?? id)}</b><br><small>move_id ${e.eosMoveId}</small></td><td class="src ${e.source}">${SOURCE_LABEL[e.source]}</td><td><small>${esc(fx)}</small><br><small class="note">${esc(e.note ?? '')}</small></td></tr>`;
    }).join('')}</table>
    <div id="allmoves"></div>
    <h2>Efecto suelto</h2>
    <select id="fx">${Object.keys(CATALOG.effects).map((k) => `<option>${k}</option>`).join('')}</select> <button id="playfx">▶</button>`;
  const dirSel = panel.querySelector('#dir') as HTMLSelectElement;
  dirSel.onchange = () => ((scene.dir = Number(dirSel.value) as Dir), scene.place());
  panel.querySelectorAll<HTMLTableRowElement>('#moves tr').forEach((tr) => (tr.querySelector('button')!.onclick = () => void scene.playMove(tr.dataset.move!)));
  (panel.querySelector('#playfx') as HTMLButtonElement).onclick = async () => {
    const key = (panel.querySelector('#fx') as HTMLSelectElement).value;
    await loadFx(scene, [key]);
    await scene.playEffect(key);
  };
  void buildAllMoves(scene, panel.querySelector('#allmoves') as HTMLElement);
  const q = new URLSearchParams(location.search);
  if (q.get('dir')) (dirSel.value = q.get('dir')!), dirSel.onchange!(new Event('change'));
  if (q.get('move')) void scene.playMove(q.get('move')!);
  (window as unknown as { __fxViewer: unknown }).__fxViewer = { scene, ready: true };
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'stage',
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: 640, height: 480 },
  scene: [BootScene, ViewerScene],
  callbacks: {
    // El visor carga todas las animaciones de los Pokémon (cualquier movimiento del juego pide la suya).
    preBoot: (g) => (g.registry.set('allMonAnims', true), g.registry.set('onBooted', () => g.scene.start('viewer'))),
  },
});
