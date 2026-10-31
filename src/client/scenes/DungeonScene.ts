/**
 * Escena principal: dibuja el estado autoritativo y reproduce los eventos de
 * cada turno como animaciones. Las animaciones nunca modifican el estado:
 * al terminar, todo se re-sincroniza con el estado recibido.
 */
import Phaser from 'phaser';
import { ALL_DIRS, DIR_DELTA, type Dir, chebyshev, deltaToDir, isDiagonal, step } from '../../shared/core/geometry';
import { getMove } from '../../shared/data/moves';
import { floorName, floorTileset, getDungeon } from '../../shared/data/dungeons';

/** Tiempo que se ve la pantalla negra con el nombre del piso. */
const FLOOR_CARD_MS = 1300;
import { STATUSES } from '../../shared/data/statuses';
import type { GameEvent } from '../../shared/engine/events';
import { validateAction, type Action } from '../../shared/engine/actions';
import { type Entity, type GameState, entityAt, playerEntity } from '../../shared/engine/state';
import { visibleTiles } from '../../shared/dungeon/visibility';
import { roomIdAt } from '../../shared/dungeon/map';
import { DungeonLight } from '../render/dungeonLight';
import { renderMapTexture, type TilesetAtlas } from '../render/tilemap';
import { FX_COLORS, TILE } from '../render/placeholders';
import { CATALOG } from '../assets/catalog';
import { type MoveFxEntry, hitReactionFx, moveFx, userAnimFor } from '../assets/moveFx';
import { FxPlayer } from '../render/fxPlayer';
import { PokemonSprite } from '../render/pokemonSprite';
import { MSG_FONT } from './stage';
import { romNumber, type NumberKind } from '../render/damageNumbers';
import { Hud } from '../ui/hud';
import type { GameSession, SessionUpdate } from '../net/session';
import { recordExpedition, loadProfile } from '../meta/profile';

/**
 * Ritmo de la presentación (a velocidad x1). Solo afecta a la animación: el
 * turno ya está resuelto cuando se reproduce.
 *   STEP_MS: duración de un paso ortogonal de una casilla. Los diagonales
 *   recorren √2 veces más distancia y duran √2 veces más, para que la
 *   velocidad sobre el suelo sea la misma en todas direcciones (antes la
 *   diagonal iba un 60 % más rápida). Un paso sigue siendo un turno.
 */
const STEP_MS = 240;
const stepDuration = (dir: Dir) => (isDiagonal(dir) ? STEP_MS * Math.SQRT2 : STEP_MS);
/** Punto de apoyo en la casilla: un poco por debajo del centro (24 px → y=16). */
const GROUND_Y = 4;
/** Casillas que abarca la cámara (ancho × alto) y mínimo por el lado corto de la ventana. */
const VIEW_TILES = { w: 15, h: 10 };
const MIN_TILES = 8;

export interface DungeonSceneData {
  session: GameSession;
  onExit: () => void;
}

/**
 * Números sobre el Pokémon, como DisplayAnimatedNumbers del juego (pmdsky-debug): la cantidad con su
 * signo, en la fuente de mensajes (con su contorno) y teñida: amarillo/dorado el daño (-N), verde la
 * curación (+N). [INCIERTO] El tono exacto de la paleta (NUMBER_COLOR_YELLOW) y qué color elige el
 * juego en automático: dorado sacado de una captura, verde de los dígitos de Hud.png.
 */
/** Sin ROM importada, los números se escriben con la fuente de mensajes en estos colores. */
const NUMBER_COLORS: Record<NumberKind, string> = { damage: '#f0d058', heal: '#58f858', miss: '#c0c0ff' };

export class DungeonScene extends Phaser.Scene {
  private session!: GameSession;
  private onExit!: () => void;
  private hud!: Hud;
  private state: GameState | null = null;
  private mapImage?: Phaser.GameObjects.Image;
  private stairsSprite?: Phaser.GameObjects.Image;
  private light?: DungeonLight;
  /** Capa de oscuridad (la imagen de la luz); las pruebas la ocultan para capturar. */
  private dark?: Phaser.GameObjects.Image;
  private sprites = new Map<string, PokemonSprite>();
  private itemSprites = new Map<string, Phaser.GameObjects.Image>();
  private trapSprites = new Map<string, Phaser.GameObjects.Image>();
  private explored = new Set<number>();
  private visible = new Set<number>();
  private queue: SessionUpdate[] = [];
  private busy = false;
  private shownFloor = -1;
  private endShown = false;
/** Movimiento en curso: su efecto se reproduce una vez sobre cada objetivo (daño, estado o cambio de características). */
  private moveFx: { entry: MoveFxEntry; dir: Dir; done: Set<string>; user: string } | null = null;
  private fx!: FxPlayer;
  /** Icono de estado animado sobre la cabeza de cada Pokémon (id → estado y sprite). */
  private statusIcons = new Map<string, { list: string[]; shown: string; sprite: Phaser.GameObjects.Sprite }>();
  /** Turno de la rotación de iconos (cada STATUS_CYCLE_MS se muestra el siguiente). */
  private statusCycle = 0;
  private dirHeldSince = 0;
  private lastStairsPos = '';
  private speed = 1;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('dungeon');
  }

  init(data: DungeonSceneData) {
    this.session = data.session;
    this.onExit = data.onExit;
    this.sprites.clear();
    this.itemSprites.clear();
    this.trapSprites.clear();
    this.explored.clear();
    this.queue = [];
    this.busy = false;
    this.lastMode = null;
    this.shownFloor = -1;
    this.endShown = false;
    this.speed = loadProfile().settings.animationSpeed || 1;
  }

  create() {
    this.cameras.main.setBackgroundColor('#000000').setRoundPixels(true);
    this.fx = new FxPlayer(this, () => this.speed, GROUND_Y);
    // Rotación de los iconos de estado de quien tenga varios (como en el original).
    this.time.addEvent({ delay: 1200, loop: true, callback: () => this.cycleStatusIcons() });
    this.applyZoom();
    const onResize = () => this.applyZoom();
    this.scale.on('resize', onResize);

    this.hud = new Hud({
      onUseMove: (slot) => this.tryAct({ type: 'useMove', slot }),
      onUseItem: (uid) => {
        if (this.tryAct({ type: 'useItem', bagUid: uid })) this.hud.toggleBag(this.state!, false);
      },
      onStairs: () => {
        this.hud.showStairsPrompt(false);
        this.tryAct({ type: 'stairs' });
      },
      onExit: () => this.exit(),
      onTouchDir: (d) => this.tryMove(d as Dir, false),
      onTouchAttack: () => this.tryAct({ type: 'attack' }),
      onTouchWait: () => this.tryAct({ type: 'wait' }),
      onToggleBag: () => this.state && this.hud.toggleBag(this.state),
    });

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys(
      'UP,DOWN,LEFT,RIGHT,W,A,S,D,Q,E,Z,C,R,SHIFT,NUMPAD_ONE,NUMPAD_TWO,NUMPAD_THREE,NUMPAD_FOUR,NUMPAD_SIX,NUMPAD_SEVEN,NUMPAD_EIGHT,NUMPAD_NINE',
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    const onKey = (ev: KeyboardEvent) => this.onKey(ev);
    const onPointer = (p: Phaser.Input.Pointer) => this.onPointer(p);
    kb.on('keydown', onKey);
    this.input.on('pointerdown', onPointer);

    this.session.onUpdate = (u) => {
      this.queue.push(u);
      this.pump();
    };
    this.session.onRejected = (reason) => this.hud.toast(reason);
    this.session.onStatus = (text) => text && this.hud.toast(text);

    const s = this.session as GameSession & { start?: () => void };
    if (this.session.mode === 'solo') s.start?.();
    else if (this.session.state) this.queue.push({ state: this.session.state, events: [], turnInfo: this.session.turnInfo });
    this.pump();

    // El juego es persistente (intro → zonas exteriores → mazmorra → zonas exteriores): limpiar al salir.
    this.events.once('shutdown', () => {
      this.hud.destroy();
      this.scale.off('resize', onResize);
      kb.off('keydown', onKey);
      this.input.off('pointerdown', onPointer);
      kb.removeAllKeys(true);
    });
  }

  /**
   * Zoom entero cercano al de la DS (su pantalla muestra ~11×8 casillas de 24 px):
   * unas VIEW_TILES casillas por el eje que más se acerque y nunca menos de
   * MIN_TILES por el lado corto (pantallas verticales o estrechas).
   */
  private applyZoom() {
    const w = this.scale.width, h = this.scale.height;
    const z = Math.min(Math.max(w / (VIEW_TILES.w * TILE), h / (VIEW_TILES.h * TILE)), Math.min(w, h) / (MIN_TILES * TILE));
    this.cameras.main.setZoom(z >= 1 ? Math.floor(z) : Math.max(0.5, z));
  }

  /** Fin de la expedición: el controlador decide (volver a la Encrucijada; en cooperativo lo coordina el servidor). */
  private exit() {
    this.onExit();
  }

  // ── Bucle de reproducción ───────────────────────────────────────────

  private async pump() {
    if (this.busy) return;
    const u = this.queue.shift();
    if (!u) return;
    this.busy = true;
    try {
      await this.play(u);
    } catch (err) {
      console.error(err);
    }
    this.busy = false;
    this.pump();
  }

  private async play(u: SessionUpdate) {
    const firstFloor = this.shownFloor === -1;
    const floorIdx = u.events.findIndex((e) => e.t === 'floor');
    const before = floorIdx >= 0 && !firstFloor ? u.events.slice(0, floorIdx) : firstFloor ? [] : u.events;
    const after = floorIdx >= 0 ? u.events.slice(floorIdx) : firstFloor ? u.events : [];

    // Si se acumulan actualizaciones (p. ej. el compañero se mueve rápido en
    // exploración), no se anima: solo se registran los mensajes y se sincroniza.
    if (this.queue.length > 0) {
      for (const e of before) if (e.t === 'message') this.hud.log(e.text);
    } else {
      await this.playEvents(before);
    }
    this.announceMode(u);
    if (floorIdx >= 0 || firstFloor || u.state.floor !== this.shownFloor) {
      // Como en el juego: fundido a negro, nombre de la mazmorra y planta, y el piso nuevo.
      // [INCIERTO] Duración exacta de la pantalla del piso.
      const card = floorIdx >= 0 || firstFloor;
      if (!firstFloor && floorIdx >= 0) await this.fade(true);
      if (card) this.hud.showFloorCard(floorName(getDungeon(u.state.dungeonId), u.state.floor), u.state.floor);
      this.buildFloor(u.state);
      if (card) {
        await new Promise<void>((res) => this.time.delayedCall(FLOOR_CARD_MS, () => res()));
        this.hud.hideFloorCard();
      }
      if (!firstFloor && floorIdx >= 0) await this.fade(false);
    }
    for (const e of after) if (e.t === 'message') this.hud.log(e.text);

    this.sync(u.state, u);
    if (u.state.result && !this.endShown) {
      this.endShown = true;
      recordExpedition(u.state, this.session.localPlayerId, this.session.mode);
      await this.wait(400);
      this.hud.showEnd(u.state, this.me());
    }
  }

  private lastMode: 'explore' | 'tactical' | null = null;

  /** Aviso al entrar o salir del combate por turnos (solo cooperativo). */
  private announceMode(u: SessionUpdate) {
    const mode = u.turnInfo.mode;
    if (this.session.mode === 'online' && this.lastMode && mode !== this.lastMode && !u.state.result) {
      this.hud.banner(mode === 'tactical' ? '¡Combate! Turnos compartidos' : 'Exploración libre');
    }
    this.lastMode = mode;
  }

  private fade(out: boolean) {
    return new Promise<void>((res) => {
      const cam = this.cameras.main;
      if (out) cam.fadeOut(250, 0, 0, 0);
      else cam.fadeIn(250, 0, 0, 0);
      cam.once(out ? 'camerafadeoutcomplete' : 'camerafadeincomplete', () => res());
    });
  }

  private wait(ms: number) {
    return new Promise<void>((res) => this.time.delayedCall(ms / this.speed, () => res()));
  }

  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>((res) => {
      this.tweens.add({ ...cfg, duration: (cfg.duration as number) / this.speed, onComplete: () => res() });
    });
  }

  private isShown(id: string) {
    const s = this.sprites.get(id);
    return !!s && s.container.visible;
  }

  private async playEvents(events: GameEvent[]) {
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev.t === 'move') {
        // Los movimientos consecutivos se animan a la vez (como en PMD).
        const batch: Extract<GameEvent, { t: 'move' }>[] = [];
        while (i < events.length && (events[i].t === 'move' || events[i].t === 'message')) {
          const e = events[i];
          if (e.t === 'move') batch.push(e);
          else if (e.t === 'message') this.hud.log(e.text);
          i++;
        }
        i--;
        await this.animateMoves(batch);
        continue;
      }
      await this.playEvent(ev);
    }
  }

  private async animateMoves(batch: Extract<GameEvent, { t: 'move' }>[]) {
    const tweens: Promise<void>[] = [];
    for (const m of batch) {
      const s = this.sprites.get(m.id);
      if (!s) continue;
      s.play('walk', m.dir);
      const show = this.visible.has(m.to.y * this.state!.map.width + m.to.x) || this.visible.has(m.from.y * this.state!.map.width + m.from.x) || this.isTeam(m.id);
      if (!show) {
        s.container.setPosition(...this.px(m.to));
        continue;
      }
      const [fx, fy] = this.px(m.from), [tx, ty] = this.px(m.to);
      s.container.setVisible(true).setPosition(fx, fy);
      // Se avanza en píxeles enteros del mundo, igual que la cámara (roundPixels):
      // con posiciones fraccionarias el sprite temblaba respecto a la cámara.
      const step = { t: 0 };
      tweens.push(
        this.tween({
          targets: step, t: 1, duration: stepDuration(m.dir),
          onUpdate: () => {
            s.container.setPosition(Math.round(fx + (tx - fx) * step.t), Math.round(fy + (ty - fy) * step.t));
            s.container.setDepth(this.depthFor(s.container.y));
          },
        }),
      );
    }
    await Promise.all(tweens);
  }

  private isTeam(id: string) {
    return !!this.state?.entities.find((e) => e.id === id && e.team === 'team');
  }

  private async playEvent(ev: GameEvent) {
    switch (ev.t) {
      case 'message':
        this.hud.log(ev.text);
        return;
      case 'face': {
        const s = this.sprites.get(ev.id);
        if (s) s.play(s.base, ev.dir);
        return;
      }
      case 'useMove': {
        const s = this.sprites.get(ev.id);
        const move = getMove(ev.move);
        // Registro central (assets/moveFx.ts): efectos de la ROM si se han importado; si no, la asignación de respaldo.
        const entry = moveFx(move.id) ?? { eosMoveId: -1, effects: {}, source: 'visual' as const };
        this.moveFx = { entry, dir: ev.dir, done: new Set(), user: ev.id };
        if (!s || !this.isShown(ev.id)) return;
        // Carga (capa 1 de la tabla del juego): sobre el usuario, antes de atacar.
        if (entry.effects.charge) await this.fx.play(entry.effects.charge, s.container.x, s.container.y, ev.dir);
        const ranged = move.category === 'status' || move.range.kind === 'line' || move.range.kind === 'room' || move.range.kind === 'self';
        // Animación del atacante de la tabla del juego (con la excepción de su especie); si no, a ojo.
        const anim = userAnimFor(move.id, s.species) ?? (ranged ? 'shoot' : 'attack');
        s.play(anim, ev.dir);
        if (s.animated) {
          // La animación de PMDCollab ya incluye la embestida: esperar al HitFrame.
          await this.wait(Math.max(90, s.hitDelay(anim)));
        } else {
          const d = DIR_DELTA[ev.dir];
          const [x0, y0] = [s.container.x, s.container.y];
          await this.tween({ targets: s.container, x: x0 + d.x * 8, y: y0 + d.y * 8, duration: 90, yoyo: true });
        }
        // Proyectil (capa 4): viaja en la dirección del ataque, 1 casilla en los de contacto y 4 en los de línea.
        if (entry.effects.projectile) {
          const d = DIR_DELTA[ev.dir], tiles = move.range.kind === 'line' ? 4 : 1;
          const from = { x: s.container.x, y: s.container.y };
          await this.fx.fly(entry.effects.projectile, from, { x: from.x + d.x * TILE * tiles, y: from.y + d.y * TILE * tiles }, ev.dir, 70 * tiles + 60);
        }
        return;
      }
      case 'damage': {
        this.hud.setHp(ev.id, ev.hp);
        this.refreshHud();
        const s = this.sprites.get(ev.id);
        if (!s || !this.isShown(ev.id)) return;
        // Efecto del movimiento sobre el objetivo; la Semilla Explosiva, su explosión; trampas, un golpe.
        // El daño por estado (veneno, quemadura) o por hambre no lleva efecto.
        if (ev.matchup !== undefined) {
          this.moveFxOn(ev.id);
          // Reacción al golpe según la eficacia (efectos 8–11 del juego, si se ha importado la ROM).
          const reaction = hitReactionFx(ev.matchup);
          if (reaction) void this.fx.play(reaction, s.container.x, s.container.y, 0 as Dir);
        }
        else if (ev.source === 'blastSeed') this.playFx('explosion', s.container.x, s.container.y);
        else if (ev.source && ev.source !== 'hunger') this.playFx('hit', s.container.x, s.container.y);
        this.floatNumber(s, `-${ev.amount}`, 'damage');
        s.play('hurt');
        s.body.setTint(0xff6060);
        await this.tween({ targets: s.body, alpha: 0.3, duration: 60, yoyo: true, repeat: 1 });
        s.body.clearTint();
        return;
      }
      case 'miss': {
        const s = this.sprites.get(ev.id);
        if (s && this.isShown(ev.id)) {
          this.floatNumber(s, 'Fallo', 'miss');
          await this.wait(150);
        }
        return;
      }
      case 'heal': {
        this.hud.setHp(ev.id, ev.hp);
        this.refreshHud();
        const s = this.sprites.get(ev.id);
        if (s && this.isShown(ev.id)) this.floatNumber(s, `+${ev.amount}`, 'heal');
        return;
      }
      case 'faint': {
        this.hud.setHp(ev.id, 0);
        const s = this.sprites.get(ev.id);
        if (!s) return;
        if (this.isShown(ev.id)) await this.tween({ targets: s.container, alpha: 0, y: s.container.y - 6, duration: 300 });
        s.container.setVisible(false).setAlpha(1);
        return;
      }
      case 'revive': {
        this.hud.setHp(ev.id, ev.hp);
        const s = this.sprites.get(ev.id);
        if (s) {
          s.container.setVisible(true).setAlpha(1);
          this.floatText(s, '¡Revive!', '#ffff80');
          await this.wait(250);
        }
        return;
      }
      case 'levelUp': {
        const s = this.sprites.get(ev.id);
        if (s) {
          this.floatText(s, `¡Nv ${ev.level}!`, '#ffe040');
          await this.wait(300);
        }
        return;
      }
      case 'status': {
        const s = this.sprites.get(ev.id);
        if (s && ev.applied && this.isShown(ev.id)) {
          this.moveFxOn(ev.id);
          this.floatText(s, STATUSES[ev.status].label, STATUSES[ev.status].color);
        }
        return;
      }
      case 'stage': {
        const s = this.sprites.get(ev.id);
        if (s && this.isShown(ev.id)) {
          this.moveFxOn(ev.id);
          this.floatText(s, ev.delta > 0 ? '+' : '-', ev.delta > 0 ? '#80c0ff' : '#ff8080');
        }
        return;
      }
      case 'pickup': {
        const s = this.sprites.get(ev.id);
        if (!s || !this.state) return;
        for (const [id, img] of this.itemSprites) {
          if (Math.abs(img.x - s.container.x) < 2 && Math.abs(img.y - s.container.y) < 2) {
            img.destroy();
            this.itemSprites.delete(id);
          }
        }
        return;
      }
      case 'trap': {
        const [x, y] = this.px(ev.pos);
        this.burst(x, y, 0xff40ff);
        await this.wait(200);
        return;
      }
      case 'warp': {
        const s = this.sprites.get(ev.id);
        if (s) {
          await this.tween({ targets: s.container, alpha: 0, duration: 150 });
          s.container.setPosition(...this.px(ev.to)).setAlpha(1);
        }
        return;
      }
      default:
        return;
    }
  }

  /**
   * Iconos de estado sobre la cabeza (status effects.png), según la tabla de iconos
   * del juego: Z (sueño), llama (quemadura), calavera (veneno), pajaritos
   * (confusión) y flechas hacia abajo (alguna característica bajada). La parálisis
   * no tiene icono. Si hay varios, se van alternando, como en el original, en
   * lugar de amontonarse. Van dentro del contenedor del Pokémon (le siguen al andar
   * y se ocultan con él) y desaparecen al curarse.
   */
  private syncStatusIcons(state: GameState) {
    const ORDER = ['sleep', 'confusion', 'whiffer', 'burn', 'poison'];
    for (const e of state.entities) {
      const s = this.sprites.get(e.id);
      const list = e.fainted ? [] : ORDER.filter((id) => e.statuses.some((st) => st.id === id));
      if (!e.fainted && Object.values(e.stages).some((v) => v < 0)) list.push('lowered');
      const want = list.filter((id) => this.textures.exists(`status-${id}`));
      const cur = this.statusIcons.get(e.id);
      if (cur && (!want.length || !s)) {
        cur.sprite.destroy();
        this.statusIcons.delete(e.id);
        continue;
      }
      if (!s || !want.length) continue;
      if (!cur) {
        const icon = this.add.sprite(0, GROUND_Y - 34, `status-${want[0]}`).play(`status-${want[0]}`);
        s.container.add(icon);
        this.statusIcons.set(e.id, { list: want, shown: want[0], sprite: icon });
      } else {
        cur.list = want;
        if (!want.includes(cur.shown)) this.showStatusIcon(cur, want[0]);
      }
    }
    for (const [id, cur] of this.statusIcons)
      if (!this.sprites.has(id)) (cur.sprite.destroy(), this.statusIcons.delete(id));
  }

  private showStatusIcon(cur: { shown: string; sprite: Phaser.GameObjects.Sprite }, id: string) {
    cur.shown = id;
    cur.sprite.setTexture(`status-${id}`).play(`status-${id}`);
  }

  /** Cada cierto tiempo, el siguiente icono de quien tenga varios. */
  private cycleStatusIcons() {
    this.statusCycle++;
    for (const cur of this.statusIcons.values())
      if (cur.list.length > 1) this.showStatusIcon(cur, cur.list[this.statusCycle % cur.list.length]);
  }

  /**
   * Efecto del movimiento en curso sobre un Pokémon alcanzado (una sola vez por
   * objetivo): el principal (o el secundario si no hay principal). Los que
   * absorben mandan además su partícula del objetivo de vuelta al usuario.
   */
  private moveFxOn(id: string) {
    const m = this.moveFx, s = this.sprites.get(id);
    if (!m || !s || m.done.has(id)) return;
    m.done.add(id);
    const user = this.sprites.get(m.user);
    if (m.entry.returnShot && user && user !== s) {
      void this.fx.fly(m.entry.returnShot, { x: s.container.x, y: s.container.y }, { x: user.container.x, y: user.container.y }, m.dir, 380);
      return;
    }
    // Capas secundaria y principal: las dos sobre el objetivo (como el juego).
    for (const key of [m.entry.effects.secondary, m.entry.effects.primary]) if (key) void this.fx.play(key, s.container.x, s.container.y, m.dir);
    // Efecto de pantalla: una vez por uso del movimiento (en el primer objetivo).
    if (m.entry.effects.screen && m.done.size === 1) void this.fx.screen(m.entry.effects.screen);
  }

  /** Efecto suelto (explosión de la Semilla Explosiva, golpe de trampa). */
  private playFx(key: string, x: number, y: number) {
    void this.fx.play(key, x, y, 0 as Dir);
  }

  private burst(x: number, y: number, color: number) {
    const c = this.add.circle(x, y, 4, color, 0.8).setDepth(40);
    this.tweens.add({ targets: c, scale: 3, alpha: 0, duration: 220 / this.speed, onComplete: () => c.destroy() });
  }

  /** Daño, curación o fallo: glifos y colores del juego (DisplayAnimatedNumbers); sin ROM, la fuente de mensajes. */
  private floatNumber(s: PokemonSprite, text: string, kind: NumberKind) {
    const n = romNumber(this, Math.round(s.container.x), Math.round(s.container.y - 18), text, kind);
    if (n) this.floatUp(n.setDepth(60));
    else this.floatText(s, text, NUMBER_COLORS[kind]);
  }

  private floatText(s: PokemonSprite, text: string, color: string) {
    const t = this.add
      .bitmapText(s.container.x, s.container.y - 18, MSG_FONT, text)
      .setOrigin(0.5)
      .setTint(Phaser.Display.Color.HexStringToColor(color).color)
      .setDepth(60);
    this.floatUp(t);
  }

  private floatUp(t: Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject) {
    // Sube y se queda visible; solo se desvanece al final (si se desvanece desde el principio, no se lee).
    this.tweens.chain({
      targets: t,
      tweens: [
        { y: t.y - 12, duration: 450 / this.speed, ease: 'Quad.easeOut' },
        { alpha: 0, delay: 250 / this.speed, duration: 200 / this.speed },
      ],
      onComplete: () => t.destroy(),
    });
  }

  // ── Construcción y sincronización ───────────────────────────────────

  private px(p: { x: number; y: number }): [number, number] {
    return [p.x * TILE + TILE / 2, p.y * TILE + TILE / 2];
  }

  private buildFloor(state: GameState) {
    this.shownFloor = state.floor;
    this.explored.clear();
    for (const s of this.sprites.values()) s.destroy();
    this.sprites.clear();
    this.statusIcons.clear(); // sus sprites iban dentro de los contenedores destruidos
    for (const s of this.itemSprites.values()) s.destroy();
    this.itemSprites.clear();
    for (const s of this.trapSprites.values()) s.destroy();
    this.trapSprites.clear();

    const dungeon = getDungeon(state.dungeonId);
    const wanted = floorTileset(dungeon, state.floor);
    const tsKey = CATALOG.tilesets[wanted] ? wanted : CATALOG.fallbackTileset;
    const atlas = this.cache.json.get(`atlas-${tsKey}`) as TilesetAtlas | undefined;
    const texKey = `floor-tex`;
    if (atlas && this.textures.exists(`tileset-${tsKey}`)) {
      renderMapTexture(this, texKey, state.map, `tileset-${tsKey}`, atlas, state.seed + state.floor);
    } else {
      this.fallbackMapTexture(texKey, state);
    }
    this.mapImage?.destroy();
    this.mapImage = this.add.image(0, 0, texKey).setOrigin(0).setDepth(0);
    this.light?.destroy();
    this.light = new DungeonLight(this, state.map);
    this.dark = this.light.image;
    this.stairsSprite?.destroy();
    const stairsKey = this.textures.exists(`stairs-${dungeon.stairs}`) ? `stairs-${dungeon.stairs}` : 'ph-stairs';
    this.stairsSprite = this.add.image(...this.px(state.map.stairs), stairsKey).setDepth(2);
    // La cámara no sale del mapa: nunca se ve vacío negro más allá del borde.
    this.cameras.main.setBounds(0, 0, state.map.width * TILE, state.map.height * TILE);
    this.lastStairsPos = '';
  }

  /** Mapa de colores planos si no hay tileset (no bloquea el juego). */
  private fallbackMapTexture(key: string, state: GameState) {
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.createCanvas(key, state.map.width * TILE, state.map.height * TILE)!;
    const ctx = tex.getContext();
    for (let y = 0; y < state.map.height; y++)
      for (let x = 0; x < state.map.width; x++) {
        ctx.fillStyle = state.map.tiles[y * state.map.width + x] ? '#c8b070' : '#2f5a2a';
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    tex.refresh();
  }

  /**
   * Sombra negra para enemigos y compañeros IA; sombra amarilla bajo los
   * Pokémon que manejan jugadores (como en Exploradores del Cielo).
   */
  private makeSprite(e: Entity): PokemonSprite {
    const marker = e.playerId === this.session.localPlayerId ? 'player' : e.playerId ? 'partner' : 'shadow';
    const s = new PokemonSprite(this, e.species, ...this.px(e.pos), e.facing, { marker, groundY: GROUND_Y, timeScale: this.speed });
    s.container.setDepth(this.depthFor(s.container.y));
    return s;
  }

  /** Los Pokémon más abajo en pantalla se dibujan delante. */
  private depthFor(y: number) {
    return 10 + y / 10000;
  }

  private me(): Entity | undefined {
    return this.state ? playerEntity(this.state, this.session.localPlayerId) : undefined;
  }

  private sync(state: GameState, u: SessionUpdate) {
    this.state = state;
    this.hud.clearHpOverrides();
    const W = state.map.width;
    const viewers = state.entities.filter((e) => e.team === 'team' && !e.fainted).map((e) => e.pos);
    this.visible = visibleTiles(state.map, viewers);
    for (const k of this.visible) this.explored.add(k);

    const alive = new Set<string>();
    for (const e of state.entities) {
      if (e.fainted) continue;
      alive.add(e.id);
      let s = this.sprites.get(e.id);
      if (!s) {
        s = this.makeSprite(e);
        this.sprites.set(e.id, s);
      }
      s.container.setPosition(...this.px(e.pos)).setAlpha(1).setDepth(this.depthFor(this.px(e.pos)[1]));
      s.container.setVisible(e.team === 'team' || this.visible.has(e.pos.y * W + e.pos.x));
      const asleep = e.statuses.some((x) => x.id === 'sleep');
      s.setBase(asleep ? 'sleep' : 'idle');
      // Vuelve al reposo (tras andar, con un margen por si se encadena otro paso).
      s.play(s.base, e.facing);
      // Sin animación de dormir (placeholder), se indica con transparencia.
      s.body.setAlpha(asleep && !s.animated ? 0.6 : 1);
    }
    for (const [id, s] of this.sprites) {
      if (!alive.has(id)) {
        s.destroy();
        this.sprites.delete(id);
      }
    }
    this.syncStatusIcons(state);

    const items = new Set(state.items.map((i) => i.id));
    for (const it of state.items) {
      let img = this.itemSprites.get(it.id);
      if (!img) {
        // Icono original (Assets/items); placeholder solo si faltara el recurso.
        const key = this.textures.exists(`item-${it.item}`) ? `item-${it.item}` : `ph-item-${it.item}`;
        img = this.add.image(...this.px(it.pos), key).setDepth(3);
        this.itemSprites.set(it.id, img);
      }
      img.setVisible(this.explored.has(it.pos.y * W + it.pos.x));
    }
    for (const [id, img] of this.itemSprites) if (!items.has(id)) (img.destroy(), this.itemSprites.delete(id));

    for (const t of state.traps) {
      if (!t.revealed || this.trapSprites.has(t.id)) continue;
      const key = this.textures.exists(`trap-${t.trap}`) ? `trap-${t.trap}` : `ph-trap-${t.trap}`;
      this.trapSprites.set(t.id, this.add.image(...this.px(t.pos), key).setDepth(2));
    }
    this.stairsSprite?.setVisible(this.explored.has(state.map.stairs.y * W + state.map.stairs.x));

    this.updateLight();
    const me = this.me();
    const meSprite = me && this.sprites.get(me.id);
    const follow = meSprite ?? [...this.sprites.values()].find((s) => s.container.visible);
    // Cámara fija al líder, sin suavizado (como en los juegos): con lerp se quedaba
    // atrás al andar y luego lo alcanzaba, y el Pokémon parecía retroceder en pantalla.
    if (follow) this.cameras.main.startFollow(follow.container, true, 1, 1);

    this.hud.update(state, me, u.turnInfo, this.session.mode, this.session.code, this.session.localPlayerId);
    this.hud.drawMinimap(state, this.explored, this.visible, me?.id);

    // Aviso de escaleras al pisarlas.
    if (me && !me.fainted && !state.result) {
      const onStairs = me.pos.x === state.map.stairs.x && me.pos.y === state.map.stairs.y;
      const k = `${state.floor}:${me.pos.x},${me.pos.y}`;
      if (onStairs && this.lastStairsPos !== k) this.hud.showStairsPrompt(true);
      if (!onStairs && this.hud.promptOpen) this.hud.showStairsPrompt(false);
      this.lastStairsPos = onStairs ? k : '';
    }
  }

  private refreshHud() {
    if (this.state) this.hud.update(this.state, this.me(), this.session.turnInfo, this.session.mode, this.session.code, this.session.localPlayerId);
  }

  /**
   * Iluminación (render/dungeonLight): cada Pokémon del equipo ilumina su sala
   * entera o, en un pasillo, un círculo a su alrededor; la luz sigue al sprite
   * durante el paso. En cooperativo es la unión de todas, como la visibilidad.
   * [INCIERTO] Cuánto se oscurece lo demás: a ojo, según capturas de la DS.
   */
  private updateLight() {
    if (!this.light || !this.state) return;
    const state = this.state;
    const lights = state.entities
      .filter((e) => e.team === 'team' && !e.fainted && e.pos.x >= 0)
      .map((e) => {
        const c = this.sprites.get(e.id)?.container;
        const [x, y] = c ? [c.x, c.y] : this.px(e.pos);
        return { x, y, room: roomIdAt(state.map, e.pos) };
      });
    this.light.draw(lights);
  }

  // ── Entrada ─────────────────────────────────────────────────────────

  private canInput(): boolean {
    return !!this.state && !this.busy && this.queue.length === 0 && !this.state.result && this.session.canAct();
  }

  private tryAct(a: Action): boolean {
    if (!this.state) return false;
    if (a.type !== 'face' && !this.canInput()) return false;
    return this.session.send(a);
  }

  /** Movimiento: si no se puede pasar, el Pokémon solo se gira (sin gastar turno), como en PMD. */
  private tryMove(dir: Dir, faceOnly: boolean) {
    const me = this.me();
    if (!me || !this.state || !this.canInput()) return;
    if (faceOnly || !validateAction(this.state, me, { type: 'move', dir }).ok) {
      if (me.facing !== dir) this.session.send({ type: 'face', dir });
      return;
    }
    this.session.send({ type: 'move', dir });
  }

  private heldDir(): Dir | null {
    const k = this.keys;
    if (k.Q.isDown || k.NUMPAD_SEVEN.isDown) return 5 as Dir;
    if (k.E.isDown || k.NUMPAD_NINE.isDown) return 3 as Dir;
    if (k.Z.isDown || k.NUMPAD_ONE.isDown) return 7 as Dir;
    if (k.C.isDown || k.NUMPAD_THREE.isDown) return 1 as Dir;
    const up = k.UP.isDown || k.W.isDown || k.NUMPAD_EIGHT.isDown;
    const down = k.DOWN.isDown || k.S.isDown || k.NUMPAD_TWO.isDown;
    const left = k.LEFT.isDown || k.A.isDown || k.NUMPAD_FOUR.isDown;
    const right = k.RIGHT.isDown || k.D.isDown || k.NUMPAD_SIX.isDown;
    const dx = (right ? 1 : 0) - (left ? 1 : 0);
    const dy = (down ? 1 : 0) - (up ? 1 : 0);
    if (!dx && !dy) return null;
    const d = deltaToDir(dx, dy);
    // Mayús = bloqueo diagonal (como el botón R de PMD).
    if (k.SHIFT.isDown && d !== null && d % 2 === 0) return null;
    return d;
  }

  override update(time: number) {
    this.updateLight();
    if (!this.state || this.hud.bagOpen || this.hud.promptOpen) return;
    const dir = this.heldDir();
    if (dir === null) {
      this.dirHeldSince = 0;
      return;
    }
    if (!this.dirHeldSince) this.dirHeldSince = time;
    // Pequeño margen para poder pulsar dos flechas a la vez (diagonal).
    if (time - this.dirHeldSince < 60) return;
    this.tryMove(dir, this.keys.R.isDown);
  }

  private onKey(ev: KeyboardEvent) {
    if (!this.state) return;
    const code = ev.code;
    if (this.hud.promptOpen) {
      // ↑↓ sin autorrepetición: se suele llegar a la escalera con la flecha pulsada.
      if (code === 'Enter' || code === 'Space') this.hud.choosePrompt();
      else if ((code === 'ArrowUp' || code === 'KeyW') && !ev.repeat) this.hud.movePromptCursor(-1);
      else if ((code === 'ArrowDown' || code === 'KeyS') && !ev.repeat) this.hud.movePromptCursor(1);
      else if (code === 'Escape' || code === 'Backspace') this.hud.showStairsPrompt(false);
      return;
    }
    if (this.hud.bagOpen) {
      if (code === 'ArrowUp' || code === 'KeyW') this.hud.moveBagCursor(this.state, -1);
      else if (code === 'ArrowDown' || code === 'KeyS') this.hud.moveBagCursor(this.state, 1);
      else if (code === 'Enter' || code === 'Space') {
        const uid = this.hud.selectedBagUid(this.state);
        if (uid && this.tryAct({ type: 'useItem', bagUid: uid })) this.hud.toggleBag(this.state, false);
      } else if (code === 'Escape' || code === 'KeyI' || code === 'Tab') this.hud.toggleBag(this.state, false);
      ev.preventDefault();
      return;
    }
    switch (code) {
      case 'Space':
      case 'KeyF':
        this.tryAct({ type: 'attack' });
        break;
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
        this.hud.selectMove(Number(code.slice(-1)) - 1);
        this.tryAct({ type: 'useMove', slot: Number(code.slice(-1)) - 1 });
        break;
      case 'KeyI':
      case 'Tab':
        this.hud.toggleBag(this.state);
        break;
      case 'KeyG':
        this.tryAct({ type: 'pickup' });
        break;
      case 'KeyH':
        this.hud.toggleHelp();
        break;
      case 'KeyM':
        this.hud.cycleMinimapStyle();
        break;
      case 'KeyL':
        this.hud.toggleHistory();
        break;
      case 'KeyX':
      case 'Numpad5':
        this.tryAct({ type: 'wait' });
        break;
      case 'Enter': {
        const me = this.me();
        if (me && me.pos.x === this.state.map.stairs.x && me.pos.y === this.state.map.stairs.y) this.hud.showStairsPrompt(true);
        break;
      }
      default:
        return;
    }
    ev.preventDefault();
  }

  private onPointer(p: Phaser.Input.Pointer) {
    const me = this.me();
    if (!me || !this.state || this.hud.bagOpen || this.hud.promptOpen) return;
    const tx = Math.floor(p.worldX / TILE), ty = Math.floor(p.worldY / TILE);
    const target = { x: tx, y: ty };
    if (chebyshev(me.pos, target) !== 1) return;
    const dir = ALL_DIRS.find((d) => step(me.pos, d).x === tx && step(me.pos, d).y === ty)!;
    const occ = entityAt(this.state, target);
    if (occ && occ.team !== me.team) {
      if (me.facing !== dir) this.session.send({ type: 'face', dir });
      this.tryAct({ type: 'attack', dir });
    } else this.tryMove(dir, false);
  }
}
