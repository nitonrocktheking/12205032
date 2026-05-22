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
  // Each player's chosen deck (8 card IDs). Exchanged at room creation /
  // join so both peers can build identical game states from each other's
  // actual collection rather than a default deck.
  decks: [string[] | null, string[] | null];
  // Each player's display name, shown in the in-game HUD for both sides.
  names: [string | null, string | null];
  deleteTimer: NodeJS.Timeout | null;
  // Locked once an outcome is finalized (after quorum or fallback timeout).
  finalOutcome: FinalOutcome | null;
  // Per-seat game-over reports, awaiting quorum.
  reports: [PeerReport | null, PeerReport | null];
  // Fires if only one peer ever reports — accept the lone report after a delay.
  fallbackTimer: NodeJS.Timeout | null;
}

// Smart matchmaking queue. A player sitting in `findMatchQueue` is paired with
// the next entrant within 5 seconds; the client side is responsible for the
// hard timeout / AI-fallback decision.
interface QueueEntry {
  ws: WebSocket;
  deck: string[] | null;
  name: string;
}
const findMatchQueue: QueueEntry[] = [];

function parseName(raw: unknown): string {
  if (typeof raw !== "string") return "Joueur";
  const trimmed = raw.trim().slice(0, 24);
  return trimmed.length > 0 ? trimmed : "Joueur";
}

function parseDeck(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  if (raw.length !== 8) return null;
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== "string" || v.length === 0 || v.length > 40) return null;
    out.push(v);
  }
  return out;
}

// Cards forbidden in multiplayer (currently the URSSAF boss spell — it's an
// admin-only nuke that trivializes any 1v1).
const MP_FORBIDDEN_CARDS = new Set(["urssaf"]);
function deckHasForbidden(deck: string[] | null): boolean {
  if (!deck) return false;
  return deck.some((id) => MP_FORBIDDEN_CARDS.has(id));
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

// Per-socket room binding state. Stored externally so the matchmaking code
// can also bind the *partner's* socket (whose own message handler closure
// has its own local `roomCode`/`playerIndex` we can't reach into). The
// close handler consults this map first, falling back to the local values.
const socketBinding = new WeakMap<WebSocket, { code: string; idx: 0 | 1 }>();

export function setupWebSocket(wss: WebSocketServer, logger: Logger) {
  wss.on("connection", (ws: WebSocket, _req: IncomingMessage) => {
    let roomCode: string | null = null;
    let playerIndex: 0 | 1 | null = null;

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as Record<string, unknown>;

        if (msg.type === "create_room") {
          const hostDeck = parseDeck(msg.deck);
          if (deckHasForbidden(hostDeck)) {
            send(ws, { type: "error", message: "La carte URSSAF est interdite en multijoueur. Retirez-la de votre deck." });
            return;
          }
          const code = genCode();
          const seed = Math.floor(Math.random() * 1_000_000);
          rooms.set(code, {
            code, seed, players: [ws, null], decks: [hostDeck, null],
            names: [parseName(msg.displayName), null],
            deleteTimer: null,
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

          const guestDeck = parseDeck(msg.deck);
          if (deckHasForbidden(guestDeck)) {
            send(ws, { type: "error", message: "La carte URSSAF est interdite en multijoueur. Retirez-la de votre deck." });
            return;
          }

          cancelDeleteTimer(room);
          room.players[1] = ws;
          room.decks[1] = guestDeck;
          room.names[1] = parseName(msg.displayName);
          roomCode = code;
          playerIndex = 1;
          send(ws, { type: "room_joined", code, seed: room.seed, faction: "enemy" });
          if (room.players[0]) send(room.players[0], { type: "opponent_joined" });
          logger.info({ code }, "Player joined room");
        }

        // Smart matchmaking: pair with the next waiting player, or wait in
        // the queue. The client owns the 5-second timeout — if it gives up
        // first, it sends `cancel_match` to leave the queue cleanly.
        else if (msg.type === "find_match") {
          const myDeck = parseDeck(msg.deck);
          if (deckHasForbidden(myDeck)) {
            send(ws, { type: "error", message: "La carte URSSAF est interdite en multijoueur. Retirez-la de votre deck." });
            return;
          }
          const myName = parseName(msg.displayName);

          // Drop any stale entries belonging to this same socket (defensive).
          for (let i = findMatchQueue.length - 1; i >= 0; i--) {
            if (findMatchQueue[i].ws === ws) findMatchQueue.splice(i, 1);
          }

          // Find another live player to pair with.
          let partner: QueueEntry | null = null;
          while (findMatchQueue.length > 0) {
            const candidate = findMatchQueue.shift()!;
            if (candidate.ws.readyState === WebSocket.OPEN && candidate.ws !== ws) {
              partner = candidate;
              break;
            }
          }

          if (partner) {
            // Pair them: spin up a room with both names + decks pre-filled.
            const code = genCode();
            const seed = Math.floor(Math.random() * 1_000_000);
            const room: Room = {
              code, seed,
              players: [partner.ws, ws],
              decks: [partner.deck, myDeck],
              names: [partner.name, myName],
              deleteTimer: null,
              finalOutcome: null, reports: [null, null], fallbackTimer: null,
            };
            rooms.set(code, room);

            // Bind BOTH sockets to this room immediately so the close handler
            // can clean up (and notify the other side) even if a paired peer
            // disconnects in the brief window before navigating to /game and
            // sending `rejoin_room`. The partner's message handler still has
            // its own local roomCode=null, but the close handler falls back
            // to socketBinding so cleanup still fires.
            socketBinding.set(partner.ws, { code, idx: 0 });
            socketBinding.set(ws, { code, idx: 1 });
            roomCode = code;
            playerIndex = 1;

            send(partner.ws, { type: "match_found", code, seed, faction: "player", opponentName: myName });
            send(ws, { type: "match_found", code, seed, faction: "enemy", opponentName: partner.name });
            logger.info({ code }, "Matchmaking paired two players");
          } else {
            findMatchQueue.push({ ws, deck: myDeck, name: myName });
            logger.info({ name: myName, queueSize: findMatchQueue.length }, "Player queued for matchmaking");
          }
        }

        else if (msg.type === "cancel_match") {
          for (let i = findMatchQueue.length - 1; i >= 0; i--) {
            if (findMatchQueue[i].ws === ws) findMatchQueue.splice(i, 1);
          }
        }

        // Re-attach after navigating from Lobby to Game (old WS was closed).
        // The rejoin response carries BOTH decks so each peer builds the same
        // initial state regardless of which side it joined as.
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
          // If the client re-sends its deck on rejoin (e.g. after a refresh),
          // record it — but never let it overwrite the opponent's slot.
          const incoming = parseDeck(msg.deck);
          if (incoming) room.decks[idx] = incoming;
          if (typeof msg.displayName === "string") {
            room.names[idx] = parseName(msg.displayName);
          }
          roomCode = code;
          playerIndex = idx;
          const opponentIdx: 0 | 1 = idx === 0 ? 1 : 0;
          send(ws, {
            type: "rejoined",
            code,
            faction,
            hostDeck: room.decks[0],
            joinerDeck: room.decks[1],
            opponentName: room.names[opponentIdx],
          });
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
      // Always remove this socket from the matchmaking queue on disconnect.
      for (let i = findMatchQueue.length - 1; i >= 0; i--) {
        if (findMatchQueue[i].ws === ws) findMatchQueue.splice(i, 1);
      }
      // Prefer this connection's own state; fall back to the matchmaking
      // binding (covers the window between `match_found` and `rejoin_room`).
      const binding = socketBinding.get(ws);
      const code = roomCode ?? binding?.code ?? null;
      const idx = playerIndex ?? binding?.idx ?? null;
      socketBinding.delete(ws);
      if (code === null || idx === null) return;
      const room = rooms.get(code);
      if (!room) return;

      // If this socket was already replaced by a fresh one (Lobby→Game navigation
      // where the new WS rejoined before the old WS close event arrived), do nothing.
      if (room.players[idx] !== ws) {
        logger.info({ code, idx }, "Stale socket close ignored (already replaced)");
        return;
      }

      room.players[idx] = null;
      // Only schedule deletion if at least one slot is now empty.
      scheduleRoomDeletion(room, logger);
      logger.info({ code, idx }, "Player disconnected, grace started");
    });
  });
}
