/**
 * Servidor multijugador: HTTP (sirve dist/ si existe) + WebSocket.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from '../shared/net/protocol';
import { PROTOCOL_VERSION } from '../shared/net/protocol';
import { type Peer, Room, isKnownDungeon, makeCode } from './room';

const ROOM_IDLE_MS = 30 * 60 * 1000;
const DIST = resolve('dist');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml',
};

export interface ServerOptions {
  port: number;
  turnTimeoutSeconds: number;
  quiet?: boolean;
  /** Dónde aparece el grupo al salir del lobby (pruebas); por defecto, dentro de casa. */
  startPlace?: { zoneId: string; entry: string };
}

export interface ServerHandle {
  port: number;
  rooms: Map<string, Room>;
  close(): Promise<void>;
}

export function startServer(opts: ServerOptions): Promise<ServerHandle> {
  const log = (...a: unknown[]) => {
    if (!opts.quiet) console.log(...a);
  };
  const rooms = new Map<string, Room>();

  const http = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    }
    if (!existsSync(DIST)) {
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('Servidor Pokerift activo. En desarrollo abre el cliente de Vite (npm run dev).');
    }
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
    let file = normalize(join(DIST, urlPath));
    if (!file.startsWith(DIST)) {
      res.writeHead(403);
      return res.end();
    }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });

  const wss = new WebSocketServer({ server: http, maxPayload: 16 * 1024 });

  wss.on('connection', (ws: WebSocket) => {
    let room: Room | null = null;
    const peer: Peer = {
      send(msg: ServerMessage) {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
      },
    };

    ws.on('message', (data) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return peer.send({ type: 'error', message: 'Mensaje inválido.' });
      }
      if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;

      switch (msg.type) {
        case 'hello':
          if (msg.version !== PROTOCOL_VERSION)
            peer.send({ type: 'error', message: 'Versión de cliente incompatible. Recarga la página.' });
          return;
        case 'create': {
          if (room) return;
          const code = makeCode((c) => rooms.has(c));
          room = new Room(code, isKnownDungeon(msg.dungeonId) ? msg.dungeonId : 'expedition', {
            turnTimeoutSeconds: opts.turnTimeoutSeconds,
            startPlace: opts.startPlace,
          });
          rooms.set(code, room);
          room.addMember(msg.name, peer);
          log(`[sala ${code}] creada`);
          return;
        }
        case 'join': {
          if (room) return;
          const r = rooms.get(String(msg.code ?? '').toUpperCase().trim());
          if (!r) return peer.send({ type: 'error', message: 'La sala no existe.' });
          const res = r.addMember(msg.name, peer);
          if (typeof res === 'string') return peer.send({ type: 'error', message: res });
          room = r;
          return;
        }
        case 'resume': {
          if (room) return;
          const r = rooms.get(String(msg.code ?? '').toUpperCase());
          if (!r) return peer.send({ type: 'error', message: 'La sala no existe o ha expirado.' });
          const res = r.resume(String(msg.token ?? ''), peer);
          if (typeof res === 'string') return peer.send({ type: 'error', message: res });
          room = r;
          return;
        }
        default:
          if (!room) return peer.send({ type: 'error', message: 'Primero crea o únete a una sala.' });
          room.handle(peer, msg);
          if (msg.type === 'leave') room = null;
      }
    });

    ws.on('close', () => room?.disconnect(peer));
  });

  // Limpieza de salas vacías e inactivas.
  const sweeper = setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      if (room.isEmpty() && now - room.lastActivity > ROOM_IDLE_MS) {
        room.dispose();
        rooms.delete(code);
        log(`[sala ${code}] eliminada por inactividad`);
      }
    }
  }, 60_000);
  sweeper.unref();

  return new Promise((done) => {
    http.listen(opts.port, () => {
      const addr = http.address();
      const port = typeof addr === 'object' && addr ? addr.port : opts.port;
      log(`Servidor Pokerift escuchando en http://localhost:${port} (WebSocket en ws://localhost:${port})`);
      log(`Límite de turno: ${opts.turnTimeoutSeconds ? opts.turnTimeoutSeconds + ' s' : 'sin límite'}`);
      done({
        port,
        rooms,
        close: () =>
          new Promise<void>((closed) => {
            clearInterval(sweeper);
            for (const r of rooms.values()) r.dispose();
            for (const c of wss.clients) c.terminate();
            wss.close();
            http.close(() => closed());
          }),
      });
    });
  });
}
