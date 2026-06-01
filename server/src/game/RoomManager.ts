import { v4 as uuidv4 } from 'uuid';
import { GameController } from './GameController.js';
import type { PlayerSession } from '../session/PlayerSession.js';
import { config } from '../config.js';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export interface Room {
  code: string;
  controller: GameController;
  /** playerId → session data */
  sessions: Map<string, PlayerSession>;
  /** socketId → stable playerId */
  socketToPlayer: Map<string, string>;
  /** stable playerId → current socketId */
  playerToSocket: Map<string, string>;
  /** socketIds of spectators (room full or explicitly watching) */
  spectators: Set<string>;
  hostPlayerId: string;
}

export type JoinResult =
  | { status: 'joined'; session: PlayerSession }
  | { status: 'spectating' }
  | { status: 'not_found' }
  | { status: 'already_seated' };

export type RejoinResult =
  | { status: 'rejoined'; session: PlayerSession }
  | { status: 'not_found' }
  | { status: 'not_a_player' };

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(socketId: string, playerId: string, name: string, chipStack = config.startingChips, tier: 'free' | 'vip' = 'free'): Room {
    const code = this.uniqueCode();

    const session: PlayerSession = {
      playerId,
      socketId,
      name,
      chipStack,
      handsPlayed: 0,
      handsWon: 0,
      tier,
    };

    const controller = new GameController();
    controller.addPlayer(playerId, name, session.chipStack);

    const room: Room = {
      code,
      controller,
      sessions: new Map([[playerId, session]]),
      socketToPlayer: new Map([[socketId, playerId]]),
      playerToSocket: new Map([[playerId, socketId]]),
      spectators: new Set(),
      hostPlayerId: playerId,
    };

    this.rooms.set(code, room);
    return room;
  }

  joinRoom(code: string, socketId: string, playerId: string, name: string, chipStack = config.startingChips, tier: 'free' | 'vip' = 'free'): JoinResult {
    const room = this.rooms.get(code);
    if (!room) return { status: 'not_found' };
    if (room.sessions.has(playerId)) return { status: 'already_seated' };

    if (room.sessions.size >= 9) {
      room.spectators.add(socketId);
      room.socketToPlayer.set(socketId, playerId);
      return { status: 'spectating' };
    }

    const session: PlayerSession = {
      playerId,
      socketId,
      name,
      chipStack,
      handsPlayed: 0,
      handsWon: 0,
      tier,
    };

    room.sessions.set(playerId, session);
    room.socketToPlayer.set(socketId, playerId);
    room.playerToSocket.set(playerId, socketId);
    room.controller.addPlayer(playerId, name, session.chipStack);

    return { status: 'joined', session };
  }

  rejoinRoom(code: string, newSocketId: string, playerId: string): RejoinResult {
    const room = this.rooms.get(code);
    if (!room) return { status: 'not_found' };

    const session = room.sessions.get(playerId);
    if (!session) return { status: 'not_a_player' };

    const oldSocketId = session.socketId;
    room.socketToPlayer.delete(oldSocketId);
    room.socketToPlayer.set(newSocketId, playerId);
    room.playerToSocket.set(playerId, newSocketId);
    session.socketId = newSocketId;

    room.controller.setConnected(playerId, true);

    return { status: 'rejoined', session };
  }

  leaveRoom(socketId: string): { room: Room; code: string; playerId: string } | null {
    for (const [code, room] of this.rooms) {
      if (room.spectators.has(socketId)) {
        room.spectators.delete(socketId);
        return { room, code, playerId: socketId };
      }

      const playerId = room.socketToPlayer.get(socketId);
      if (!playerId) continue;

      room.socketToPlayer.delete(socketId);
      room.playerToSocket.delete(playerId);
      room.sessions.delete(playerId);
      room.controller.removePlayer(playerId);

      if (room.sessions.size === 0 && room.spectators.size === 0) {
        this.rooms.delete(code);
      }

      return { room, code, playerId };
    }
    return null;
  }

  markDisconnected(socketId: string): { room: Room; code: string; playerId: string } | null {
    for (const [code, room] of this.rooms) {
      const playerId = room.socketToPlayer.get(socketId);
      if (!playerId) continue;
      room.controller.setConnected(playerId, false);
      return { room, code, playerId };
    }
    return null;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  getRoomBySocket(socketId: string): { room: Room; code: string } | null {
    for (const [code, room] of this.rooms) {
      if (room.socketToPlayer.has(socketId) || room.spectators.has(socketId)) {
        return { room, code };
      }
    }
    return null;
  }

  /**
   * Credit chips to a player in any active room.
   * Returns true if the player was found and updated, false if they're not in any room.
   */
  creditChips(playerId: string, chips: number): boolean {
    for (const room of this.rooms.values()) {
      const session = room.sessions.get(playerId);
      if (session) {
        session.chipStack += chips;
        return true;
      }
    }
    return false;
  }

  newPlayerId(): string {
    return uuidv4();
  }

  private uniqueCode(): string {
    let code: string;
    do {
      code = generateCode();
    } while (this.rooms.has(code));
    return code;
  }
}
