/**
 * Zona exterior (casa, Risco Sharpedo, Aldea Tesoro...). Movimiento libre en 8
 * direcciones con la colisión compartida de src/shared/town. Al pisar una salida
 * se pasa a otra zona (la escena se reinicia con la nueva) o, hacia una
 * mazmorra, se propone la expedición. En cooperativo, la posición local se
 * predice en el cliente y se envía al servidor, que la valida y la difunde;
 * cada jugador puede estar en una zona distinta y solo se dibujan los de la
 * misma, interpolando sus posiciones.
 */
import Phaser from 'phaser';
import { type Dir, deltaToDir } from '../../shared/core/geometry';
import { RUN_SPEED, WALK_SPEED, ZONES, type ZoneDef, type ZoneExit, entryPoint, exitAt, getZone, moveActor } from '../../shared/town/zone';
import type { TownInfo } from '../../shared/net/protocol';
import { getDungeon } from '../../shared/data/dungeons';
import { PokemonSprite } from '../render/pokemonSprite';
import type { OnlineSession } from '../net/online';
import { TownHud } from '../ui/townHud';
import { ZONE_MUSIC, music } from '../audio/music';
import { MSG_FONT, app } from './stage';

export interface TownSceneData {
  zoneId: string;
  /** Punto de llegada (en solitario; en cooperativo manda la posición del servidor). */
  entry?: string;
  me: { playerId: string; name: string; species: string };
  online?: OnlineSession;
}

interface Char {
  sprite: PokemonSprite;
  container: Phaser.GameObjects.Container;
  label?: Phaser.GameObjects.BitmapText;
  dir: Dir;
  moving: boolean;
  target: { x: number; y: number };
}

const SEND_INTERVAL = 80;

export class TownScene extends Phaser.Scene {
  private data0!: TownSceneData;
  private zone!: ZoneDef;
  private hud!: TownHud;
  private me!: Char;
  private pos = { x: 0, y: 0 };
  private others = new Map<string, Char>();
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private insideExit: string | null = null;
  private lastSent = 0;
  private sentState = '';
  private leaving = false;
  /** Tabla de sumas de los píxeles sin mapa (esquinas del ripeo), para que la cámara no los enseñe. */
  private holes = new Int32Array(1);

  constructor() {
    super('town');
  }

  init(data: TownSceneData) {
    this.data0 = data;
    this.zone = getZone(data.zoneId);
    this.others.clear();
    this.insideExit = null;
    this.leaving = false;
    this.lastSent = 0;
    this.sentState = '';
  }

  create() {
    const zone = this.zone;
    const cam = this.cameras.main;
    cam.setBackgroundColor('#000000').fadeIn(300, 0, 0, 0);
    cam.setBounds(0, 0, zone.width, zone.height).setRoundPixels(true);
    // Zoom entero para ver unos 192 px de alto de mapa, como la pantalla de la DS
    // (256×192), sin bajar de ~240 px de ancho; nunca más vista que mapa.
    const zoom = () => {
      const { width: w, height: h } = this.scale;
      cam.setZoom(Math.max(1, Math.min(Math.round(h / 192), Math.floor(w / 240)), Math.ceil(Math.max(w / zone.width, h / zone.height))));
    };
    zoom();
    this.scale.on('resize', zoom);

    this.drawMap();
    music.play(ZONE_MUSIC[zone.id] ?? null);

    this.hud = new TownHud(() => this.openMenu());
    this.hud.setZone(zone.name, this.data0.online?.code);

    const online = this.data0.online;
    const mine = online?.town?.players.find((p) => p.playerId === this.data0.me.playerId && p.zoneId === zone.id);
    const arrival = entryPoint(zone, this.data0.entry ?? Object.keys(zone.entries)[0]);
    this.pos = mine ? { x: mine.x, y: mine.y } : { x: arrival.x, y: arrival.y };
    this.me = this.makeChar(this.data0.me.species, null);
    this.setAnim(this.me, (mine ? mine.dir : arrival.dir) as Dir, false);
    this.me.container.setPosition(this.pos.x, this.pos.y);
    // Si se llega pisando una salida, no se dispara hasta salir de ella.
    this.insideExit = exitAt(zone, this.pos.x, this.pos.y)?.id ?? null;
    this.buildHoles();
    this.updateCamera();

    if (online) {
      online.onTown = (t, correction) => this.applyTown(t, correction);
      if (online.town) this.applyTown(online.town, false);
    } else {
      this.hud.setParty([{ name: this.data0.me.name, species: this.data0.me.species, connected: true, isMe: true, where: zone.name }]);
    }

    this.keys = this.input.keyboard!.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D,SHIFT,NUMPAD_ONE,NUMPAD_TWO,NUMPAD_THREE,NUMPAD_FOUR,NUMPAD_SIX,NUMPAD_SEVEN,NUMPAD_EIGHT,NUMPAD_NINE', false) as Record<string, Phaser.Input.Keyboard.Key>;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && !this.hud.promptOpen) this.openMenu();
    };
    window.addEventListener('keydown', onKey);

    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', onKey);
      this.scale.off('resize', zoom);
      if (online) online.onTown = undefined;
      this.hud.destroy();
    });
  }

  /** Mapa, agua animada (bajo el mapa, asomando por sus huecos, o encima) y color de fondo del agua. */
  private drawMap() {
    const zone = this.zone;
    const under = zone.anims.filter((a) => a.under);
    if (zone.fill && under.length) {
      const x0 = Math.min(...under.map((a) => a.x)), y0 = Math.min(...under.map((a) => a.y));
      const x1 = Math.max(...under.map((a) => a.x + a.w)), y1 = Math.max(...under.map((a) => a.y + a.h));
      this.add.rectangle(x0, y0, x1 - x0, y1 - y0, Phaser.Display.Color.HexStringToColor(zone.fill).color).setOrigin(0).setDepth(-3);
    }
    for (const a of zone.anims) {
      const tex = `zone-${zone.id}-${a.key}`;
      if (!this.anims.exists(tex)) this.anims.create({ key: tex, frames: this.anims.generateFrameNumbers(tex), frameRate: 1000 / a.ms, repeat: -1 });
      this.add.sprite(a.x, a.y, tex).setOrigin(0).setDepth(a.upper ? 0.3 : a.under ? -2 : 0.1).play(tex);
    }
    this.add.image(0, 0, `zone-${zone.id}`).setOrigin(0).setDepth(0);
    // Segunda capa del mapa original: encima de la primera y de sus animaciones, pero detrás de
    // los Pokémon (su profundidad es su y): en el juego también contiene suelo transitable.
    if (zone.upper) this.add.image(0, 0, `zone-${zone.id}-upper`).setOrigin(0).setDepth(0.2);
    // Objetos y NPC de la escena del juego: se ordenan con los Pokémon por su punto de apoyo.
    for (const p of zone.props ?? []) this.add.image(p.x, p.y, `prop-${p.image}`).setOrigin(0).setDepth(p.baseY);
    for (const n of zone.npcs ?? []) {
      const npc = new PokemonSprite(this, n.species, n.x, n.y, n.dir as Dir, { marker: 'shadow' });
      npc.container.setDepth(n.y);
      npc.play('idle', n.dir as Dir, true);
    }
  }

  // ── Cámara ────────────────────────────────────────────────────────────

  /** Huecos = píxeles transparentes del mapa (capa inferior y superior) que no tapa el agua (con su color de fondo). */
  private buildHoles() {
    const z = this.zone, W = z.width, H = z.height;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(this.textures.get(`zone-${z.id}`).getSourceImage() as CanvasImageSource, 0, 0);
    // La capa superior también tapa: un hueco es lo que no pinta ninguna de las dos.
    if (z.upper) ctx.drawImage(this.textures.get(`zone-${z.id}-upper`).getSourceImage() as CanvasImageSource, 0, 0);
    const px = ctx.getImageData(0, 0, W, H).data;
    const water = z.fill ? z.anims.filter((a) => a.under) : [];
    const sat = (this.holes = new Int32Array((W + 1) * (H + 1)));
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const hole = px[(y * W + x) * 4 + 3] === 0 && !water.some((a) => x >= a.x && y >= a.y && x < a.x + a.w && y < a.y + a.h);
        sat[(y + 1) * (W + 1) + x + 1] = (hole ? 1 : 0) + sat[y * (W + 1) + x + 1] + sat[(y + 1) * (W + 1) + x] - sat[y * (W + 1) + x];
      }
  }

  private holeCount(x: number, y: number, w: number, h: number): number {
    const S = this.holes, W1 = this.zone.width + 1;
    return S[(y + h) * W1 + x + w] - S[y * W1 + x + w] - S[(y + h) * W1 + x] + S[y * W1 + x];
  }

  /**
   * Cámara fija al jugador y limitada al mapa; si así se vieran las esquinas sin
   * mapa del ripeo, se desplaza lo mínimo para esquivarlas (como la DS, que no
   * llega a enseñarlas), siempre con el jugador a ≥ 40 px del borde de la vista.
   */
  private updateCamera() {
    const cam = this.cameras.main, z = this.zone;
    const vw = Math.min(z.width, Math.ceil(cam.width / cam.zoom)), vh = Math.min(z.height, Math.ceil(cam.height / cam.zoom));
    const cx = (x: number) => Phaser.Math.Clamp(x, 0, z.width - vw), cy = (y: number) => Phaser.Math.Clamp(y, 0, z.height - vh);
    const ix = cx(Math.round(this.pos.x - vw / 2)), iy = cy(Math.round(this.pos.y - vh / 2));
    let best = { x: ix, y: iy, n: this.holeCount(ix, iy, vw, vh), d: 0 };
    const search = (x0: number, y0: number, rx: number, ry: number, stepPx: number) => {
      for (let oy = -ry; oy <= ry; oy += stepPx)
        for (let ox = -rx; ox <= rx; ox += stepPx) {
          const x = cx(x0 + ox), y = cy(y0 + oy);
          if (Math.abs(this.pos.x - x - vw / 2) > vw / 2 - 40 || Math.abs(this.pos.y - y - vh / 2) > vh / 2 - 40) continue;
          const n = this.holeCount(x, y, vw, vh), d = Math.abs(x - ix) + Math.abs(y - iy);
          if (n < best.n || (n === best.n && d < best.d)) best = { x, y, n, d };
        }
    };
    if (best.n > 0) {
      search(ix, iy, Math.max(0, Math.floor(vw / 2 - 40)), Math.max(0, Math.floor(vh / 2 - 40)), 4);
      search(best.x, best.y, 3, 3, 1);
    }
    cam.centerOn(best.x + vw / 2, best.y + vh / 2);
  }

  // ── Personajes ────────────────────────────────────────────────────────

  /** Mismo componente que en la mazmorra; fuera de ella, todos con sombra negra (la amarilla es solo de la mazmorra). */
  private makeChar(species: string, name: string | null): Char {
    const sprite = new PokemonSprite(this, species, 0, 0, 0 as Dir, { marker: 'shadow' });
    const c = sprite.container;
    const ch: Char = { sprite, container: c, dir: 0 as Dir, moving: false, target: { x: 0, y: 0 } };
    if (name) {
      ch.label = this.add.bitmapText(0, -38, MSG_FONT, name).setOrigin(0.5);
      c.add(ch.label);
    }
    this.setAnim(ch, 0 as Dir, false);
    return ch;
  }

  private setAnim(ch: Char, dir: Dir, moving: boolean) {
    if (ch.dir === dir && ch.moving === moving) return;
    ch.dir = dir;
    ch.moving = moving;
    ch.sprite.play(moving ? 'walk' : 'idle', dir);
  }

  // ── Bucle ─────────────────────────────────────────────────────────────

  private inputDir(): { dx: number; dy: number } | null {
    if (this.hud.promptOpen || this.hud.menuOpen || this.leaving) return null;
    const k = this.keys;
    let dx = 0, dy = 0;
    if (k.LEFT.isDown || k.A.isDown || k.NUMPAD_FOUR.isDown || k.NUMPAD_SEVEN.isDown || k.NUMPAD_ONE.isDown) dx -= 1;
    if (k.RIGHT.isDown || k.D.isDown || k.NUMPAD_SIX.isDown || k.NUMPAD_NINE.isDown || k.NUMPAD_THREE.isDown) dx += 1;
    if (k.UP.isDown || k.W.isDown || k.NUMPAD_EIGHT.isDown || k.NUMPAD_SEVEN.isDown || k.NUMPAD_NINE.isDown) dy -= 1;
    if (k.DOWN.isDown || k.S.isDown || k.NUMPAD_TWO.isDown || k.NUMPAD_ONE.isDown || k.NUMPAD_THREE.isDown) dy += 1;
    // Ratón/táctil: caminar hacia el puntero mientras se mantiene pulsado.
    const p = this.input.activePointer;
    if (!dx && !dy && p.isDown) {
      const w = p.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      const vx = w.x - this.pos.x, vy = w.y - this.pos.y;
      if (Math.hypot(vx, vy) > 6) {
        const a = Math.round(Math.atan2(vy, vx) / (Math.PI / 4));
        dx = Math.round(Math.cos((a * Math.PI) / 4));
        dy = Math.round(Math.sin((a * Math.PI) / 4));
      }
    }
    return dx || dy ? { dx, dy } : null;
  }

  override update(time: number, delta: number) {
    const input = this.inputDir();
    let moving = false;
    if (input) {
      const speed = this.keys.SHIFT.isDown ? RUN_SPEED : WALK_SPEED;
      const len = Math.hypot(input.dx, input.dy);
      let remaining = (speed * Math.min(delta, 50)) / 1000;
      while (remaining > 0) {
        const s = Math.min(1.5, remaining);
        remaining -= s;
        this.pos = moveActor(this.zone, this.pos, (input.dx / len) * s, (input.dy / len) * s);
      }
      moving = true;
      this.setAnim(this.me, deltaToDir(input.dx, input.dy) ?? this.me.dir, true);
    } else {
      this.setAnim(this.me, this.me.dir, false);
    }
    this.me.container.setPosition(this.pos.x, this.pos.y).setDepth(this.pos.y);

    // Compañeros: interpolación hacia la última posición conocida.
    for (const o of this.others.values()) {
      const c = o.container;
      c.setPosition(Phaser.Math.Linear(c.x, o.target.x, 0.25), Phaser.Math.Linear(c.y, o.target.y, 0.25)).setDepth(c.y);
    }

    this.updateCamera();
    this.checkExits();
    this.sendPosition(time, moving);
  }

  private sendPosition(time: number, moving: boolean) {
    const online = this.data0.online;
    if (!online) return;
    const key = `${this.pos.x.toFixed(1)},${this.pos.y.toFixed(1)},${this.me.dir},${moving}`;
    if (key === this.sentState || time - this.lastSent < SEND_INTERVAL) return;
    this.lastSent = time;
    this.sentState = key;
    online.sendTownMove(Math.round(this.pos.x * 10) / 10, Math.round(this.pos.y * 10) / 10, this.me.dir, moving);
  }

  private applyTown(t: TownInfo, correction: boolean) {
    const myId = this.data0.me.playerId;
    const seen = new Set<string>();
    for (const p of t.players) {
      if (p.playerId === myId) {
        // El servidor ha aceptado el cambio de zona: se reinicia la escena en la nueva.
        if (p.zoneId !== this.zone.id) return this.goToZone(p.zoneId);
        if (correction) {
          this.pos = { x: p.x, y: p.y };
          this.sentState = '';
        }
        continue;
      }
      if (p.zoneId !== this.zone.id) continue;
      seen.add(p.playerId);
      let o = this.others.get(p.playerId);
      if (!o) {
        o = this.makeChar(p.species, p.name);
        o.container.setPosition(p.x, p.y);
        this.others.set(p.playerId, o);
      }
      o.target = { x: p.x, y: p.y };
      o.container.setAlpha(p.connected ? 1 : 0.4);
      this.setAnim(o, p.dir as Dir, p.moving);
    }
    for (const [id, o] of this.others) if (!seen.has(id)) (o.sprite.destroy(), this.others.delete(id));
    this.hud.setParty(t.players.map((p) => ({ name: p.name, species: p.species, connected: p.connected, isMe: p.playerId === myId, where: ZONES[p.zoneId]?.name ?? '' })));
  }

  // ── Salidas (sin señales en el mapa, como en el original) ─────────────

  private checkExits() {
    const exit = exitAt(this.zone, this.pos.x, this.pos.y);
    if (!exit) {
      this.insideExit = null;
      return;
    }
    if (this.insideExit === exit.id) return;
    this.insideExit = exit.id;
    this.onExit(exit);
  }

  private onExit(exit: ZoneExit) {
    if (!exit.enabled || !exit.target) {
      this.hud.toast(`${exit.label}: próximamente.`);
      return;
    }
    if (exit.target.kind === 'zone') {
      const online = this.data0.online;
      if (online) {
        this.leaving = true;
        online.sendTownMove(Math.round(this.pos.x * 10) / 10, Math.round(this.pos.y * 10) / 10, this.me.dir, false);
        online.changeZone(exit.id);
        // Si el servidor lo rechaza (o corrige la posición), se puede volver a intentar.
        this.time.delayedCall(1500, () => (this.leaving = false));
      } else {
        this.goToZone(exit.target.zoneId, exit.target.entry);
      }
      return;
    }
    if (exit.target.kind === 'dungeon') {
      const dungeon = getDungeon(exit.target.dungeonId);
      const coop = !!this.data0.online;
      this.hud.dialog(
        `<b>${exit.label}</b><br>¿Empezar la <b>${dungeon.name.toLowerCase()}</b>? ${dungeon.floors} pisos: ${[...new Set(dungeon.bands.map((b) => b.name).filter(Boolean))].join(", ")}.${coop ? '<br><small>Todo el equipo irá contigo.</small>' : ''}`,
        [
          { label: 'Explorar', action: () => this.enterDungeon(exit) },
          { label: 'Quedarse', action: () => {} },
        ],
      );
    }
  }

  /** Fundido a negro y la misma escena con otra zona. */
  private goToZone(zoneId: string, entry?: string) {
    this.leaving = true;
    const cam = this.cameras.main;
    if (cam.fadeEffect.isRunning) return;
    cam.fadeOut(200, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => this.scene.restart({ ...this.data0, zoneId, entry } satisfies TownSceneData));
  }

  private enterDungeon(exit: ZoneExit) {
    if (exit.target?.kind !== 'dungeon') return;
    this.leaving = true;
    if (this.data0.online) {
      this.data0.online.sendTownMove(Math.round(this.pos.x * 10) / 10, Math.round(this.pos.y * 10) / 10, this.me.dir, false);
      this.data0.online.enterDungeon(exit.id);
      // Si el servidor lo rechaza, se puede volver a intentar.
      this.time.delayedCall(1500, () => (this.leaving = false));
    } else {
      app(this).enterDungeonSolo(exit.target.dungeonId);
    }
  }

  private openMenu() {
    this.hud.menuOpen = true;
    this.hud.dialog('<b>Pausa</b>', [
      { label: 'Continuar', action: () => (this.hud.menuOpen = false) },
      { label: this.data0.online ? 'Salir de la sala' : 'Menú principal', action: () => app(this).leaveTown() },
      { label: 'Cancelar', action: () => (this.hud.menuOpen = false) },
    ]);
  }
}
