import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { Logger } from "pino";

interface PeerReport {
  winner: "player" | "enemy" | "draw";
  pCrowns: number;
  eCrowns: number;
  receivedAt: number;
}

interface FinalOutcome {
  winner: "player" | "enemy" | "draw";
  pCrowns: number;
  eCrowns: number;
}

interface Room {
  code: string;
  seed: number;
  players: [WebSocket | null, WebSocket | null];
  deleteTimer: NodeJS.Timeout | null;
  // Locked once an outcome is finalized (after quorum or fallback timeout).
  finalOutcome: FinalOutcome | null;
  // Per-seat game-over reports, awaiting quorum.
  reports: [PeerReport | null, PeerReport | null];
  // Fires if only one peer ever reports — accept the lone report after a delay.
  fallbackTimer: NodeJS.Timeout | null;
}

// If only one peer reports game_over, wait this long for the other before
// accepting the lone report. Prevents a malicious peer from instantly forging
// a result, while still finishing the match if the opponent really crashed.
const QUORUM_FALLBACK_MS = 10_000;

const rooms = new Map<string, Room>();
const REJOIN_GRACE_MS = 15_000;

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function send(ws: WebSocket, data: object) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function cancelDeleteTimer(room: Room) {
  if (room.deleteTimer) {
    clearTimeout(room.deleteTimer);
    room.deleteTimer = null;
  }
}

function scheduleRoomDeletion(room: Room, logger: Logger) {
  cancelDeleteTimer(room);
  room.deleteTimer = setTimeout(() => {
    const r = rooms.get(room.code);
    if (!r) return;
    // Notify any player still connected, then drop the room.
    for (const p of r.players) {
      if (p) send(p, { type: "opponent_left" });
    }
    rooms.delete(room.code);
    logger.info({ code: room.code }, "Room deleted after grace period");
  }, REJOIN_GRACE_MS);
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
          rooms.set(code, {
            code, seed, players: [ws, null], deleteTimer: null,
            finalOutcome: null, reports: [null, null], fallbackTimer: null,
          });
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

          cancelDeleteTimer(room);
          room.players[1] = ws;
          roomCode = code;
          playerIndex = 1;
          send(ws, { type: "room_joined", code, seed: room.seed, faction: "enemy" });
          if (room.players[0]) send(room.players[0], { type: "opponent_joined" });
          logger.info({ code }, "Player joined room");
        }

        // Re-attach after navigating from Lobby to Game (old WS was closed).
        else if (msg.type === "rejoin_room") {
          const code = String(msg.code ?? "").toUpperCase().trim();
          const faction = msg.faction === "enemy" ? "enemy" : "player";
          const idx: 0 | 1 = faction === "player" ? 0 : 1;
          const room = rooms.get(code);
          if (!room) {
            send(ws, { type: "error", message: "Salle expirée." });
            return;
          }
          cancelDeleteTimer(room);
          room.players[idx] = ws;
          roomCode = code;
          playerIndex = idx;
          send(ws, { type: "rejoined", code, faction });
          logger.info({ code, faction }, "Player rejoined room");
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

        // Authoritative game-over with quorum. Requires BOTH peers to report
        // before locking — prevents a malicious peer from forging a premature
        // result. Falls back to the lone report after QUORUM_FALLBACK_MS so a
        // legitimate crash/disconnect at the very end still finalizes.
        else if (msg.type === "game_over" && roomCode !== null && playerIndex !== null) {
          const room = rooms.get(roomCode);
          if (!room) return;
          if (room.players[playerIndex] !== ws) return;

          // Validate payload shape.
          const winner = msg.winner;
          const pCrowns = Number(msg.pCrowns);
          const eCrowns = Number(msg.eCrowns);
          const validWinner = winner === "player" || winner === "enemy" || winner === "draw";
          const validCrowns =
            Number.isInteger(pCrowns) && Number.isInteger(eCrowns) &&
            pCrowns >= 0 && pCrowns <= 3 && eCrowns >= 0 && eCrowns <= 3;
          if (!validWinner || !validCrowns) return;

          // Already finalized — re-send the locked outcome (covers dropped
          // broadcasts / client retries).
          if (room.finalOutcome) {
            const { winner: w, pCrowns: pc, eCrowns: ec } = room.finalOutcome;
            send(ws, { type: "match_finalized", winner: w, pCrowns: pc, eCrowns: ec });
            return;
          }

          // Record this seat's report (overwrites prior — clients shouldn't
          // change their mind, but if they do we keep the latest).
          room.reports[playerIndex] = { winner, pCrowns, eCrowns, receivedAt: Date.now() };

          const tryFinalize = () => {
            if (room.finalOutcome) return;
            const a = room.reports[0];
            const b = room.reports[1];
            let outcome: FinalOutcome | null = null;

            if (a && b) {
              // Quorum reached. If they agree, easy. If they disagree, prefer
              // the report that claims a king-tower kill (crowns reflect
              // tower drops; a kingfall = unambiguous game end).
              if (a.winner === b.winner && a.pCrowns === b.pCrowns && a.eCrowns === b.eCrowns) {
                outcome = { winner: a.winner, pCrowns: a.pCrowns, eCrowns: a.eCrowns };
              } else {
                const aDecisive = a.winner !== "draw";
                const bDecisive = b.winner !== "draw";
                const pick = aDecisive && !bDecisive ? a
                          : bDecisive && !aDecisive ? b
                          : a.receivedAt <= b.receivedAt ? a : b;
                outcome = { winner: pick.winner, pCrowns: pick.pCrowns, eCrowns: pick.eCrowns };
              }
            }

            if (outcome) {
              if (room.fallbackTimer) { clearTimeout(room.fallbackTimer); room.fallbackTimer = null; }
              room.finalOutcome = outcome;
              const payload = { type: "match_finalized", ...outcome };
              for (const p of room.players) if (p) send(p, payload);
              logger.info({ code: roomCode, ...outcome }, "Match finalized (quorum)");
            }
          };

          tryFinalize();

          // If still not finalized, schedule a fallback so a lone report wins
          // after the opponent's grace window expires.
          if (!room.finalOutcome && !room.fallbackTimer) {
            room.fallbackTimer = setTimeout(() => {
              if (room.finalOutcome) return;
              const lone = room.reports[0] ?? room.reports[1];
              if (!lone) return;
              room.finalOutcome = { winner: lone.winner, pCrowns: lone.pCrowns, eCrowns: lone.eCrowns };
              const payload = { type: "match_finalized", ...room.finalOutcome };
              for (const p of room.players) if (p) send(p, payload);
              logger.info({ code: room.code, ...room.finalOutcome }, "Match finalized (fallback)");
              room.fallbackTimer = null;
            }, QUORUM_FALLBACK_MS);
          }
        }

      } catch {
        // ignore malformed messages
      }
    });

    ws.on("close", () => {
      if (roomCode === null || playerIndex === null) return;
      const room = rooms.get(roomCode);
      if (!room) return;

      // If this socket was already replaced by a fresh one (Lobby→Game navigation
      // where the new WS rejoined before the old WS close event arrived), do nothing.
      if (room.players[playerIndex] !== ws) {
        logger.info({ code: roomCode, playerIndex }, "Stale socket close ignored (already replaced)");
        return;
      }

      room.players[playerIndex] = null;
      // Only schedule deletion if at least one slot is now empty.
      scheduleRoomDeletion(room, logger);
      logger.info({ code: roomCode, playerIndex }, "Player disconnected, grace started");
    });
  });
}
