/**
 * Punto de entrada y controlador de la aplicación.
 *
 * Un único juego de Phaser persistente recorre las escenas:
 *   boot → intro → título → menú principal → zonas exteriores (casa, Aldea Tesoro…) ⇄ mazmorra
 * Los formularios (nombre, Pokémon, código de sala, lobby) son paneles DOM
 * sobre el fondo animado del menú. En cooperativo, el servidor decide las
 * transiciones de grupo (exterior ↔ mazmorra) y este controlador las sigue.
 */
import Phaser from 'phaser';
import './style.css';
import './ui/romUi';
import { BootScene } from './scenes/BootScene';
import { IntroScene } from './scenes/IntroScene';
import { TitleScene } from './scenes/TitleScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { TownScene, type TownSceneData } from './scenes/TownScene';
import { DungeonScene, type DungeonSceneData } from './scenes/DungeonScene';
import type { AppApi, MenuOptionId } from './scenes/stage';
import { LocalSession, type GameSession } from './net/session';
import { OnlineSession } from './net/online';
import { hideMenu, showCredits, showHistory, showLobby, showMessage, showSetup, type SetupKind } from './ui/menu';
import { validateCatalog, CATALOG } from './assets/catalog';
import { loadProfile, saveProfile } from './meta/profile';
import { SPECIES } from '../shared/data/species';
import { DUNGEONS } from '../shared/data/dungeons';
import { RETURN_PLACE, START_PLACE } from '../shared/town/zone';
import type { ClientMessage } from '../shared/net/protocol';

for (const p of validateCatalog(CATALOG, Object.keys(SPECIES), Object.values(DUNGEONS).map((d) => d.tileset))) console.warn('[catálogo]', p);

type SceneKey = 'intro' | 'title' | 'menu' | 'town' | 'dungeon';
const SPEEDS = [1, 1.5, 2];

class App implements AppApi {
  readonly game: Phaser.Game;
  readonly menuRoot = document.getElementById('menu')!;
  scene: SceneKey | 'boot' = 'boot';
  session: GameSession | null = null;
  online: OnlineSession | null = null;
  private solo: { name: string; species: string; seed: string } | null = null;
  private switching = false;

  constructor() {
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      pixelArt: true,
      backgroundColor: '#000000',
      scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
      scene: [BootScene, IntroScene, TitleScene, MainMenuScene, TownScene, DungeonScene],
      callbacks: {
        preBoot: (g) => {
          g.registry.set('app', this);
          g.registry.set('onBooted', () => this.onBooted());
        },
      },
    });
  }

  private onBooted() {
    const saved = OnlineSession.savedSession();
    if (saved) {
      // Recarga de página en mitad de una partida online: se reanuda la sesión.
      this.switchTo('menu');
      this.goOnline({ type: 'resume', code: saved.code, token: saved.token }, null);
    } else {
      this.switchTo('intro');
    }
  }

  /** Cambia de escena con fundido a negro. */
  switchTo(key: SceneKey, data?: object) {
    if (this.switching) return;
    const active = this.game.scene.getScenes(true);
    const start = () => {
      this.scene = key;
      this.switching = false;
      // Parar y arrancar la misma escena en el mismo fotograma la deja parada: se reinicia.
      const same = this.game.scene.getScenes(true).find((s) => s.scene.key === key);
      for (const s of this.game.scene.getScenes(true)) if (s !== same) s.scene.stop();
      if (same) same.scene.restart(data);
      else this.game.scene.start(key, data);
    };
    const from = active[0];
    if (!from || from.scene.key === 'boot') return start();
    this.switching = true;
    from.cameras.main.fadeOut(300, 0, 0, 0);
    from.cameras.main.once('camerafadeoutcomplete', start);
  }

  private menuScene() {
    return this.game.scene.getScene('menu') as MainMenuScene;
  }

  private panel(open: boolean) {
    if (this.scene === 'menu') this.menuScene().setLocked(open);
    if (!open) hideMenu(this.menuRoot);
  }

  // ── AppApi (llamado desde las escenas) ───────────────────────────────

  toTitle() {
    this.panel(false);
    this.switchTo('title');
  }

  toMenu() {
    this.switchTo('menu');
  }

  menuSelect(id: MenuOptionId) {
    this.panel(true);
    const back = () => this.panel(false);
    // Versión web estática (GitHub Pages): no hay servidor para el cooperativo.
    if ((id === 'create' || id === 'join') && import.meta.env.VITE_NO_SERVER)
      return showMessage(this.menuRoot, 'El cooperativo online no está disponible en esta versión web (no hay servidor). Juega en solitario.', back);
    switch (id) {
      case 'solo':
      case 'create':
      case 'join':
        return this.openSetup(id);
      case 'history':
        return showHistory(this.menuRoot, back);
      case 'credits':
        return showCredits(this.menuRoot, back);
    }
  }

  animationSpeed() {
    return loadProfile().settings.animationSpeed || 1;
  }

  cycleAnimationSpeed() {
    const p = loadProfile();
    const next = SPEEDS[(SPEEDS.indexOf(p.settings.animationSpeed) + 1) % SPEEDS.length];
    p.settings.animationSpeed = next;
    saveProfile(p);
    return next;
  }

  enterDungeonSolo(dungeonId: string) {
    if (!this.solo) return;
    const session = new LocalSession({
      dungeonId,
      seed: this.solo.seed || Math.floor(Math.random() * 2 ** 32),
      name: this.solo.name,
      species: this.solo.species,
    });
    this.session = session;
    this.switchTo('dungeon', { session, onExit: () => this.afterExpedition() } satisfies DungeonSceneData);
  }

  leaveTown() {
    if (this.online) {
      this.online.close();
      this.online = null;
    }
    this.session = null;
    this.switchTo('menu');
  }

  // ── Flujo ────────────────────────────────────────────────────────────

  private openSetup(kind: SetupKind, error?: string) {
    showSetup(
      this.menuRoot,
      kind,
      (r) => {
        if (kind === 'solo') {
          this.solo = r;
          this.panel(false);
          this.toSoloTown();
        } else if (kind === 'create') {
          this.goOnline({ type: 'create', name: r.name }, r.species);
        } else {
          this.goOnline({ type: 'join', code: r.code, name: r.name }, r.species);
        }
      },
      () => this.panel(false),
      error,
    );
  }

  /** En solitario: a una zona exterior (al empezar, dentro de casa). */
  toSoloTown(zoneId: string = START_PLACE.zoneId, entry: string = START_PLACE.entry) {
    const s = this.solo!;
    this.session = null;
    this.switchTo('town', { zoneId, entry, me: { playerId: 'local', name: s.name, species: s.species } } satisfies TownSceneData);
  }

  /** Fin de una expedición: de vuelta a la Encrucijada (en cooperativo, lo coordina el servidor). */
  private afterExpedition() {
    if (this.online) this.online.returnToTown();
    else this.toSoloTown(RETURN_PLACE.zoneId, RETURN_PLACE.entry);
  }

  private toOnlineTown() {
    const online = this.online!;
    const me = online.lobby?.players.find((p) => p.playerId === online.localPlayerId);
    this.bindOnline(online);
    this.panel(false);
    this.switchTo('town', {
      zoneId: online.town?.players.find((p) => p.playerId === online.localPlayerId)?.zoneId ?? START_PLACE.zoneId,
      me: { playerId: online.localPlayerId, name: me?.name ?? 'Explorador', species: me?.species ?? 'pikachu' },
      online,
    } satisfies TownSceneData);
  }

  /** Callbacks de la sesión online cuando no hay una escena de juego que los gestione. */
  private bindOnline(online: OnlineSession) {
    online.onUpdate = () => {
      // Llega un estado de mazmorra: el grupo ha entrado en una expedición.
      if (this.scene === 'dungeon') return;
      this.session = online;
      this.switchTo('dungeon', { session: online, onExit: () => this.afterExpedition() } satisfies DungeonSceneData);
    };
  }

  private goOnline(first: ClientMessage, species: string | null) {
    this.online?.close();
    const online = new OnlineSession();
    this.online = online;
    let status = '';
    const lobbyActions = {
      pick: (s: string) => online.pickSpecies(s),
      start: () => online.start(),
      leave: () => {
        online.close();
        this.online = null;
        this.panel(false);
      },
    };
    online.onWelcome = () => {
      if (species) online.pickSpecies(species);
    };
    online.onLobby = (lobby) => {
      if (lobby.phase === 'lobby') {
        if (this.scene !== 'menu') this.switchTo('menu');
        this.panel(true);
        showLobby(this.menuRoot, lobby, online.localPlayerId, lobbyActions, status);
      } else if (lobby.phase === 'town' && this.scene !== 'town') {
        this.toOnlineTown();
      }
    };
    online.onRejected = (reason) => {
      status = reason;
      if (online.lobby?.phase === 'lobby') showLobby(this.menuRoot, online.lobby, online.localPlayerId, lobbyActions, status);
    };
    online.onError = (msg) => {
      online.close();
      this.online = null;
      this.session = null;
      if (this.scene !== 'menu') this.switchTo('menu');
      this.panel(true);
      showMessage(this.menuRoot, msg, () => this.panel(false));
    };
    this.bindOnline(online);
    this.panel(true);
    showMessage(this.menuRoot, 'Conectando con el servidor…');
    online.connect(first);
  }
}

const app = new App();

// Gancho de depuración (consola del navegador y pruebas de humo).
(window as unknown as { __pokerift: object }).__pokerift = {
  app,
  get scene() {
    return app.scene;
  },
  get session() {
    return app.session ?? app.online;
  },
  get state() {
    return (app.session ?? app.online)?.state ?? null;
  },
  get townPos() {
    return app.scene === 'town' ? (app.game.scene.getScene('town') as unknown as { pos: { x: number; y: number } }).pos : null;
  },
  /** Zona exterior que se está mostrando (null fuera de ellas). */
  get townZone() {
    return app.scene === 'town' ? (app.game.scene.getScene('town') as unknown as { zone: { id: string } }).zone.id : null;
  },
};
