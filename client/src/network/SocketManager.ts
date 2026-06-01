import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@texas-holdem/shared';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER = import.meta.env['VITE_SERVER_URL'] ?? 'http://localhost:3001';
const KEY_TOKEN   = 'poker_token';
const KEY_ROOM    = 'poker_room';
const KEY_PLAYER  = 'poker_player_id';
const KEY_NAME    = 'poker_name';

let _socket: GameSocket | null = null;

/** Return the singleton socket, creating it if needed. Does NOT connect. */
export function getSocket(): GameSocket {
  if (!_socket) _socket = makeSocket();
  return _socket;
}

/** Connect (or reconnect) and return the socket. */
export function connect(): GameSocket {
  const s = getSocket();
  const t = storedToken();
  if (t) s.auth = { token: t }; // pick up a guest token issued after the socket was created
  if (!s.connected) s.connect();
  return s;
}

function makeSocket(): GameSocket {
  const token = storedToken();
  const s: GameSocket = io(SERVER, {
    autoConnect: false,
    auth: token ? { token } : {},
  });

  // Persist identity on successful room events
  s.on('room:created', ({ roomCode, playerId, token: t }) => {
    localStorage.setItem(KEY_TOKEN, t);
    localStorage.setItem(KEY_ROOM, roomCode);
    localStorage.setItem(KEY_PLAYER, playerId);
  });

  s.on('room:joined', ({ roomCode, playerId, token: t }) => {
    localStorage.setItem(KEY_TOKEN, t);
    localStorage.setItem(KEY_ROOM, roomCode);
    localStorage.setItem(KEY_PLAYER, playerId);
  });

  return s;
}

// ─── Stored session helpers ───────────────────────────────────────────────

export function storedToken(): string | null  { return localStorage.getItem(KEY_TOKEN); }
export function storedRoomCode(): string | null { return localStorage.getItem(KEY_ROOM); }
export function storedPlayerId(): string | null { return localStorage.getItem(KEY_PLAYER); }
export function storedName(): string           { return localStorage.getItem(KEY_NAME) ?? 'Player'; }
export function saveName(name: string)         { localStorage.setItem(KEY_NAME, name); }
export function clearSession()                 {
  [KEY_TOKEN, KEY_ROOM, KEY_PLAYER].forEach(k => localStorage.removeItem(k));
}
