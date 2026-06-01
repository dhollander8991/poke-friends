import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, GameState } from '@texas-holdem/shared';
import { signToken, verifyToken, type JWTPayload } from '../auth/jwt.js';
import { roomManager } from '../game/roomManagerInstance.js';
import type { Room } from '../game/RoomManager.js';
import { toPlayer, type ControllerState } from '../game/GameController.js';
import type { WinnerInfo } from '@texas-holdem/shared';
import { sessionStore } from '../store/SessionStore.js';
import { FREE_STARTING_CHIPS } from '../payments/chipBundles.js';
import { botManager, BOT_NAMES } from '../game/BotManager.js';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

// ─── State broadcast with per-player hole card privacy ────────────────────

function buildState(
  raw: ControllerState,
  roomCode: string,
  viewerPlayerId: string | null,
): GameState {
  const { dealerIndex, smallBlindIndex, bigBlindIndex, phase } = raw;
  const revealAll = phase === 'showdown';

  return {
    roomId: roomCode,
    roomCode,
    phase: raw.phase,
    communityCards: raw.communityCards,
    pot: raw.pot,
    sidePots: raw.sidePots,
    currentBet: raw.currentBet,
    activePlayerId: raw.activePlayerId,
    dealerIndex: raw.dealerIndex,
    smallBlind: raw.smallBlind,
    bigBlind: raw.bigBlind,
    winners: raw.winners,
    secondsLeft: raw.secondsLeft,
    actionHistory: raw.actionHistory,
    players: raw.players.map((p, i) => {
      const base = toPlayer(p, i, dealerIndex, smallBlindIndex, bigBlindIndex);
      const canSeeCards = revealAll || p.id === viewerPlayerId;
      return { ...base, holeCards: canSeeCards ? p.holeCards : [] };
    }),
  };
}

function broadcastState(io: IO, room: Room, roomCode: string) {
  const raw = room.controller.getState();

  // Each seated player receives their own hole cards
  for (const [playerId, session] of room.sessions) {
    const socketId = room.playerToSocket.get(playerId);
    if (!socketId) continue;
    io.to(socketId).emit('game:state', buildState(raw, roomCode, playerId));
  }

  // Spectators see cards only at showdown
  const spectatorState = buildState(raw, roomCode, null);
  for (const sid of room.spectators) {
    io.to(sid).emit('game:state', spectatorState);
  }
}

// ─── Attach per-room game event listeners (call once per room) ───────────

function attachControllerListeners(io: IO, room: Room, roomCode: string) {
  const ctrl = room.controller;

  ctrl.on('stateChanged', () => broadcastState(io, room, roomCode));

  ctrl.on('timer', (secondsLeft: number) => {
    // All clients in the Socket.IO room receive the timer tick
    io.to(roomCode).emit('game:timer', { secondsLeft });
  });

  ctrl.on('handComplete', (winners: WinnerInfo[]) => {
    for (const w of winners) {
      const session = room.sessions.get(w.playerId);
      if (session) session.handsWon++;
    }
    for (const [, session] of room.sessions) {
      session.handsPlayed++;
    }
  });
}

// ─── Socket event registration ────────────────────────────────────────────

export function registerSocketHandlers(io: IO, socket: Sock) {
  // ── room:create ──────────────────────────────────────────────────────────
  socket.on('room:create', ({ playerName }) => {
    const auth = (socket.data as { jwt?: JWTPayload }).jwt;
    const playerId = auth?.playerId ?? roomManager.newPlayerId();
    const token = signToken({ playerId, name: playerName });

    const startingChips = FREE_STARTING_CHIPS + sessionStore.drainPendingChips(playerId);
    const tier          = sessionStore.getTier(playerId);
    const room          = roomManager.createRoom(socket.id, playerId, playerName, startingChips, tier);
    attachControllerListeners(io, room, room.code);

    socket.join(room.code);
    socket.emit('room:created', { roomCode: room.code, playerId, token });
    broadcastState(io, room, room.code);
  });

  // ── room:join ────────────────────────────────────────────────────────────
  socket.on('room:join', ({ roomCode, playerName }) => {
    const auth = (socket.data as { jwt?: JWTPayload }).jwt;
    const playerId = auth?.playerId ?? roomManager.newPlayerId();
    const token = signToken({ playerId, name: playerName });

    const startingChips = FREE_STARTING_CHIPS + sessionStore.drainPendingChips(playerId);
    const tier          = sessionStore.getTier(playerId);
    const result        = roomManager.joinRoom(roomCode, socket.id, playerId, playerName, startingChips, tier);

    if (result.status === 'not_found') {
      socket.emit('room:error', `Room ${roomCode} not found`);
      return;
    }

    if (result.status === 'already_seated') {
      socket.emit('room:error', 'Already seated at this table');
      return;
    }

    socket.join(roomCode);

    if (result.status === 'spectating') {
      socket.emit('room:spectating', { roomCode });
      const room = roomManager.getRoom(roomCode)!;
      // Spectator receives a state with hidden hole cards
      const raw = room.controller.getState();
      socket.emit('game:state', buildState(raw, roomCode, null));
      return;
    }

    // result.status === 'joined'
    const room = roomManager.getRoom(roomCode)!;
    socket.emit('room:joined', { roomId: roomCode, roomCode, playerId, token });

    // Notify existing players
    socket.to(roomCode).emit('player:joined', {
      id: playerId,
      name: playerName,
      chips: result.session.chipStack,
    });

    broadcastState(io, room, roomCode);
  });

  // ── room:rejoin ──────────────────────────────────────────────────────────
  socket.on('room:rejoin', ({ roomCode, token }) => {
    const payload = verifyToken(token);
    if (!payload) {
      socket.emit('room:error', 'Invalid or expired session token');
      return;
    }

    const result = roomManager.rejoinRoom(roomCode, socket.id, payload.playerId);

    if (result.status === 'not_found') {
      socket.emit('room:error', `Room ${roomCode} not found`);
      return;
    }

    if (result.status === 'not_a_player') {
      socket.emit('room:error', 'Not a player in this room');
      return;
    }

    socket.join(roomCode);

    const room = roomManager.getRoom(roomCode)!;
    const { session } = result;
    socket.emit('room:joined', {
      roomId: roomCode,
      roomCode,
      playerId: session.playerId,
      token,
    });

    const raw = room.controller.getState();
    socket.emit('game:state', buildState(raw, roomCode, session.playerId));
    socket.to(roomCode).emit('player:joined', {
      id: session.playerId,
      name: session.name,
      chips: session.chipStack,
    });
  });

  // ── game:start ───────────────────────────────────────────────────────────
  socket.on('game:start', () => {
    const ctx = roomManager.getRoomBySocket(socket.id);
    if (!ctx) return;
    const { room, code } = ctx;

    const playerId = room.socketToPlayer.get(socket.id);
    if (playerId !== room.hostPlayerId) return; // only host can start

    if (!room.controller.canStart()) {
      socket.emit('room:error', 'Need at least 2 players to start');
      return;
    }

    room.controller.startHand();
    // stateChanged event fires internally → broadcastState via listener
  });

  // ── game:action ──────────────────────────────────────────────────────────
  socket.on('game:action', action => {
    const ctx = roomManager.getRoomBySocket(socket.id);
    if (!ctx) return;
    const { room, code } = ctx;

    const playerId = room.socketToPlayer.get(socket.id);
    if (!playerId) return;

    const ok = room.controller.applyAction(playerId, action);
    if (!ok) socket.emit('room:error', 'Invalid action');
    // stateChanged event fires internally → broadcastState via listener
  });

  // ── room:demo ────────────────────────────────────────────────────────────
  socket.on('room:demo', ({ playerName }) => {
    const auth = (socket.data as { jwt?: JWTPayload }).jwt;
    const playerId = auth?.playerId ?? roomManager.newPlayerId();
    const token = signToken({ playerId, name: playerName });

    const startingChips = FREE_STARTING_CHIPS + sessionStore.drainPendingChips(playerId);
    const tier          = sessionStore.getTier(playerId);
    const room          = roomManager.createRoom(socket.id, playerId, playerName, startingChips, tier);
    attachControllerListeners(io, room, room.code);
    socket.join(room.code);
    socket.emit('room:created', { roomCode: room.code, playerId, token });

    // Add 4 bots
    const botIds: string[] = [];
    for (let i = 0; i < 4; i++) {
      const botId   = roomManager.newPlayerId();
      const botName = BOT_NAMES[i]!;
      room.sessions.set(botId, {
        playerId: botId,
        socketId: `bot-${botId}`,
        name: botName,
        chipStack: FREE_STARTING_CHIPS,
        handsPlayed: 0,
        handsWon: 0,
        tier: 'free',
      });
      room.controller.addPlayer(botId, botName, FREE_STARTING_CHIPS);
      botIds.push(botId);
    }

    // Start hand and bot loop
    room.controller.startHand();
    botManager.startBots(room.code, room.controller, botIds);

    broadcastState(io, room, room.code);
  });

  // ── chat:message ─────────────────────────────────────────────────────────
  socket.on('chat:message', text => {
    const ctx = roomManager.getRoomBySocket(socket.id);
    if (!ctx) return;
    const { room, code } = ctx;

    const playerId = room.socketToPlayer.get(socket.id);
    const session = playerId ? room.sessions.get(playerId) : undefined;
    if (!session) return;

    io.to(code).emit('chat:message', {
      playerId: session.playerId,
      playerName: session.name,
      text: text.slice(0, 300),
      timestamp: Date.now(),
    });
  });

  // ── room:leave ───────────────────────────────────────────────────────────
  socket.on('room:leave', () => handleLeave(io, socket, false));

  // ── disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => handleLeave(io, socket, true));
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function handleLeave(io: IO, socket: Sock, isDisconnect: boolean) {
  if (isDisconnect) {
    // Soft disconnect: keep the player in the hand, mark as disconnected
    const ctx = roomManager.markDisconnected(socket.id);
    if (ctx) {
      const { room, code, playerId } = ctx;
      socket.to(code).emit('player:left', playerId);
      broadcastState(io, room, code);
    }
    return;
  }

  // Explicit leave: fully remove from room
  const result = roomManager.leaveRoom(socket.id);
  if (!result) return;

  const { room, code, playerId } = result;
  socket.leave(code);
  io.to(code).emit('player:left', playerId);

  const roomStillExists = roomManager.getRoom(code);
  if (roomStillExists) {
    broadcastState(io, room, code);
  } else {
    botManager.stopBots(code);
  }
}
