import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { Logger } from "pino";

interface Room {
  code: string;
  seed: number;
  players: [WebSocket | null, WebSocket | null];
}

const rooms = new Map<string, Room>();

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

export function setupWebSocket(wss: WebSocketServer, logger: Logger) {
  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    let roomCode: string | null = null;
    let playerIndex: 0 | 1 | null = null;

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as Record<string, unknown>;

        if (msg.type === "create_room") {
          const code = genCode();
          const seed = Math.floor(Math.random() * 1_000_000);
          rooms.set(code, { code, seed, players: [ws, null] });
          roomCode = code;
          playerIndex = 0;
          send(ws, { type: "room_created", code, seed, faction: "player" });
          logger.info({ code }, "Room created");
        }

        else if (msg.type === "join_room") {
          const code = String(msg.code ?? "").toUpperCase().trim();
          const room = rooms.get(code);
          if (!room) { send(ws, { type: "error", message: "Salle introuvable." }); return; }
          if (room.players[1]) { send(ws, { type: "error", message: "Salle déjà pleine." }); return; }

          room.players[1] = ws;
          roomCode = code;
          playerIndex = 1;
          send(ws, { type: "room_joined", code, seed: room.seed, faction: "enemy" });
          if (room.players[0]) send(room.players[0], { type: "opponent_joined" });
          logger.info({ code }, "Player joined room");
        }

        // Either player relays a card-play action to their opponent
        else if (msg.type === "play_card" && roomCode !== null && playerIndex !== null) {
          const room = rooms.get(roomCode);
          if (!room) return;
          const opponentIdx: 0 | 1 = playerIndex === 0 ? 1 : 0;
          const opponent = room.players[opponentIdx];
          if (opponent) {
            send(opponent, {
              type: "opponent_play_card",
              cardIndex: msg.cardIndex,
              x: msg.x,
              y: msg.y,
            });
          }
        }

      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => {
      if (!roomCode) return;
      const room = rooms.get(roomCode);
      if (!room) return;
      const opponentIdx: 0 | 1 = playerIndex === 0 ? 1 : 0;
      const opponent = room.players[opponentIdx];
      if (opponent) send(opponent, { type: "opponent_left" });
      rooms.delete(roomCode);
      logger.info({ roomCode }, "Room closed");
    });
  });
}
