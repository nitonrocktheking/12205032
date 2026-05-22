import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Faction, GameState } from "../game/types";
import { createInitialState, updateGame, playCard, playEnemyCard } from "../game/engine";
import { RENDER_RATE, ARENA_HEIGHT } from "../game/constants";
import { ArenaTheme, ARENAS, getArenaForLevel } from "../game/arenas";
import Arena from "../components/Arena";
import HUD from "../components/HUD";
import CardHand from "../components/CardHand";
import { useMultiplayer } from "../hooks/useMultiplayer";
import { useMe, getSelectedDeck } from "../hooks/useMe";
import { randomAiUsername } from "../game/aiNames";

function parseParams() {
  const p = new URLSearchParams(window.location.search);
  const seedStr = p.get("seed");
  const faction = p.get("faction") as Faction | null;
  const code = p.get("code");
  const opp = p.get("opp");
  const friend = p.get("friend") === "1";
  const seed = seedStr !== null ? Number(seedStr) : undefined;
  const isMultiplayer = seed !== undefined;
  const localFaction: Faction = faction === "enemy" ? "enemy" : "player";
  return { seed, isMultiplayer, localFaction, roomCode: code, opponentNameParam: opp, isFriendly: friend };
}

function GameInner({ seed, isMultiplayer, localFaction, deck, arena, roomCode, playerLevel, ownedCardIds, localName, opponentNameParam, isFriendly }: { seed?: number; isMultiplayer: boolean; localFaction: Faction; deck?: string[]; arena: ArenaTheme; roomCode: string | null; playerLevel: number; ownedCardIds: string[]; localName: string; opponentNameParam: string | null; isFriendly: boolean }) {
  const [, setLocation] = useLocation();
  // Solo state is built immediately from the player's selected deck. MP state
  // waits until the server returns BOTH decks (via `rejoined`) so both peers
  // can call createInitialState with identical (seed, hostDeck, joinerDeck).
  const initialState: GameState | null = isMultiplayer
    ? null
    : createInitialState(seed, deck, undefined, { playerLevel, aiCardPool: ownedCardIds });
  const gameStateRef = useRef<GameState | null>(initialState);
  const [renderState, setRenderState] = useState<GameState | null>(initialState);
  const [mpReady, setMpReady] = useState<boolean>(!isMultiplayer);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [opponentLeft, setOpponentLeft] = useState(false);
  // Opponent display name. Solo: a randomly-picked French-politician-style
  // username. MP: comes from the matchmaking URL param, then refined by the
  // server's `rejoined` payload (authoritative).
  const aiNameRef = useRef<string>("");
  if (!aiNameRef.current && !isMultiplayer) aiNameRef.current = randomAiUsername();
  const [opponentName, setOpponentName] = useState<string>(
    isMultiplayer ? (opponentNameParam ?? "Adversaire") : aiNameRef.current
  );
  // Authoritative MP outcome agreed between the two peers. First peer to
  // detect a winner broadcasts it; receiver locks in the same result so both
  // sides never disagree on who actually won.
  const agreedOutcomeRef = useRef<{ winner: "player" | "enemy" | "draw"; pCrowns: number; eCrowns: number } | null>(null);
  const gameOverSentRef = useRef(false);
  const mpReportRef = useRef<{ w: "player" | "enemy" | "draw"; pc: number; ec: number } | null>(null);
  const mpRetryTimerRef = useRef<number | null>(null);
  const mpWaitStartRef = useRef<number | null>(null);

  void isMultiplayer; void localFaction; // referenced below

  // ── Multiplayer WebSocket relay ────────────────────────────────────────────
  const { sendPlayCard, rejoinRoom, sendGameOver } = useMultiplayer({
    onMessage: (msg) => {
      if (msg.type === "rejoined" && isMultiplayer) {
        // Server has the authoritative opponent name — adopt it over the URL hint.
        if (msg.opponentName) setOpponentName(msg.opponentName);
        // Both decks arrived from the server — build the shared initial state
        // now (same inputs on both peers → identical state, identical RNG).
        if (gameStateRef.current) return; // already built
        const hostDeck = msg.hostDeck ?? undefined;
        const joinerDeck = msg.joinerDeck ?? undefined;
        const s = createInitialState(seed, hostDeck, joinerDeck, { playerLevel, aiCardPool: ownedCardIds });
        gameStateRef.current = s;
        setRenderState(s);
        setMpReady(true);
        return;
      }
      const state = gameStateRef.current;
      if (!state) return;
      if (msg.type === "opponent_play_card") {
        if (localFaction === "player") {
          playEnemyCard(state, msg.cardIndex, { x: msg.x, y: msg.y });
        } else {
          playCard(state, msg.cardIndex, { x: msg.x, y: msg.y });
        }
        // Force immediate re-render so the opponent's unit appears without waiting for the next tick.
        syncRender();
      } else if (msg.type === "match_finalized") {
        // Server-authoritative outcome. Both peers receive the EXACT same
        // payload (the first valid `game_over` report wins; the rest are
        // dropped on the server). We trust this over any local computation.
        agreedOutcomeRef.current = { winner: msg.winner, pCrowns: msg.pCrowns, eCrowns: msg.eCrowns };
        state.status = "gameover";
        state.winner = msg.winner;
      } else if (msg.type === "opponent_left") {
        setOpponentLeft(true);
      } else if (msg.type === "error" && isMultiplayer) {
        // Rejoin failed (room expired) — treat as opponent gone.
        setOpponentLeft(true);
      }
    },
    onOpen: () => {
      // After navigating from Lobby, re-attach to the same room with the same
      // faction. Re-send our own deck so the server can recover if the original
      // create/join message was lost.
      if (isMultiplayer && roomCode) {
        rejoinRoom(roomCode, localFaction, deck, localName);
      }
    },
  });

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let lastTick = performance.now();
    let lastRender = performance.now();
    let reqId: number;
    let redirected = false;

    const loop = (now: number) => {
      const state = gameStateRef.current;
      if (!state) {
        // MP: waiting for decks from server. Tick without advancing the sim.
        reqId = requestAnimationFrame(loop);
        return;
      }
      const dt = Math.min((now - lastTick) / 1000, 0.05);
      lastTick = now;
      updateGame(state, dt);

      if (now - lastRender > RENDER_RATE) {
        const s = state;
        setRenderState({
          ...s,
          units: [...s.units],
          towers: [...s.towers],
          hand: [...s.hand],
          enemyHand: [...s.enemyHand],
          floatingTexts: [...s.floatingTexts],
        });
        lastRender = now;
      }

      if (state.status === "gameover") {
        const { winner: localComputedWinner, towers } = state;

        // In MP, never redirect from a purely local result. We report our
        // observation to the server and wait for `match_finalized` to lock
        // the shared outcome for BOTH peers. Reports are retried in case the
        // first one or the server's broadcast was lost in flight.
        if (isMultiplayer && !agreedOutcomeRef.current) {
          if (!gameOverSentRef.current) {
            gameOverSentRef.current = true;
            const w: "player" | "enemy" | "draw" = localComputedWinner ?? "draw";
            const pc = towers.filter(t => t.faction === "enemy"  && t.hp <= 0).length;
            const ec = towers.filter(t => t.faction === "player" && t.hp <= 0).length;
            mpReportRef.current = { w, pc, ec };
            sendGameOver(w, pc, ec);
            mpWaitStartRef.current = now;
            // Retry every 2s until the server confirms.
            mpRetryTimerRef.current = window.setInterval(() => {
              const r = mpReportRef.current;
              if (!r || agreedOutcomeRef.current) return;
              sendGameOver(r.w, r.pc, r.ec);
            }, 2000);
          }
          // Liveness timeout: after 15s with no `match_finalized`, give up
          // and treat as opponent gone so the user isn't stuck staring at a
          // frozen arena.
          if (mpWaitStartRef.current && now - mpWaitStartRef.current > 15_000) {
            if (mpRetryTimerRef.current) {
              clearInterval(mpRetryTimerRef.current);
              mpRetryTimerRef.current = null;
            }
            setOpponentLeft(true);
            return;
          }
          reqId = requestAnimationFrame(loop);
          return;
        }

        // Once we have a finalized result, stop the retry timer.
        if (mpRetryTimerRef.current) {
          clearInterval(mpRetryTimerRef.current);
          mpRetryTimerRef.current = null;
        }

        if (redirected) {
          reqId = requestAnimationFrame(loop);
          return;
        }
        redirected = true;

        // Solo: trust local state. MP: use the server-finalized outcome.
        const sharedWinner: "player" | "enemy" | "draw" = isMultiplayer && agreedOutcomeRef.current
          ? agreedOutcomeRef.current.winner
          : (localComputedWinner ?? "draw");
        const sharedPCrowns = isMultiplayer && agreedOutcomeRef.current
          ? agreedOutcomeRef.current.pCrowns
          : towers.filter(t => t.faction === "enemy"  && t.hp <= 0).length;
        const sharedECrowns = isMultiplayer && agreedOutcomeRef.current
          ? agreedOutcomeRef.current.eCrowns
          : towers.filter(t => t.faction === "player" && t.hp <= 0).length;

        // Translate the shared outcome into the local player's POV for Results.
        const localWinner = localFaction === "player"
          ? sharedWinner
          : sharedWinner === "player" ? "enemy" : sharedWinner === "enemy" ? "player" : "draw";
        const localPCrowns = localFaction === "player" ? sharedPCrowns : sharedECrowns;
        const localECrowns = localFaction === "player" ? sharedECrowns : sharedPCrowns;

        setTimeout(() => {
          const mpFlag = isMultiplayer ? "&mp=1" : "";
          const friendFlag = isFriendly ? "&friend=1" : "";
          setLocation(`/results?winner=${localWinner}&pCrowns=${localPCrowns}&eCrowns=${localECrowns}${mpFlag}${friendFlag}`);
        }, 1000);
        return;
      }

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(reqId);
      if (mpRetryTimerRef.current) {
        clearInterval(mpRetryTimerRef.current);
        mpRetryTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Card play ──────────────────────────────────────────────────────────────
  const handleArenaClick = (x: number, y: number) => {
    if (selectedCard === null) return;
    const state = gameStateRef.current;
    if (!state) return;

    if (localFaction === "player") {
      if (playCard(state, selectedCard, { x, y })) {
        if (isMultiplayer) sendPlayCard(selectedCard, x, y);
        setSelectedCard(null);
        syncRender();
      }
    } else {
      // Player 2: clicks arrive already in internal coords (translated by Arena)
      if (playEnemyCard(state, selectedCard, { x, y })) {
        if (isMultiplayer) sendPlayCard(selectedCard, x, y);
        setSelectedCard(null);
        syncRender();
      }
    }
  };

  function syncRender() {
    const s = gameStateRef.current;
    if (!s) return;
    setRenderState({ ...s, units: [...s.units], towers: [...s.towers], hand: [...s.hand], enemyHand: [...s.enemyHand], floatingTexts: [...s.floatingTexts] });
  }

  if (!renderState || !mpReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="animate-pulse">Synchronisation avec l&apos;adversaire…</p>
      </div>
    );
  }

  // Choose which hand / elixir to show
  const displayHand    = localFaction === "player" ? renderState.hand    : renderState.enemyHand;
  const displayNext    = localFaction === "player" ? renderState.nextCard : renderState.enemyNextCard;
  const displayElixir  = localFaction === "player" ? renderState.elixir.player : renderState.elixir.enemy;
  const flipped        = localFaction === "enemy";

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto bg-slate-950 overflow-hidden relative">
      {opponentLeft && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-slate-800 rounded-2xl p-8 text-center space-y-4 border border-slate-600">
            <p className="text-white font-black text-xl">L&apos;adversaire a quitté !</p>
            <button
              className="bg-blue-600 text-white font-bold px-6 py-3 rounded-xl"
              onClick={() => setLocation("/")}
            >
              Retour au menu
            </button>
          </div>
        </div>
      )}

      <HUD state={renderState} localFaction={localFaction} arena={arena} localName={localName} opponentName={opponentName} />
      <div className="flex-1 relative min-h-0">
        <Arena
          state={renderState}
          onClick={handleArenaClick}
          flipped={flipped}
          localFaction={localFaction}
          arena={arena}
          placing={selectedCard !== null}
          placingCardId={selectedCard !== null ? displayHand[selectedCard]?.id : undefined}
        />
      </div>
      <CardHand
        hand={displayHand}
        nextCard={displayNext}
        elixir={displayElixir}
        selected={selectedCard}
        onSelect={setSelectedCard}
      />
    </div>
  );
}

export default function Game() {
  const { seed, isMultiplayer, localFaction, roomCode, opponentNameParam, isFriendly } = parseParams();
  const { data: me, isLoading } = useMe();

  // Wait for user data before initializing — needed for solo (deck) AND MP
  // (we send our deck to the server so the opponent can build the same state).
  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Préparation de l'arène…</div>;
  }

  const selected = getSelectedDeck(me);
  const finalDeck = selected && selected.length === 8 ? selected : undefined;
  const playerLevel = me?.profile.level ?? 1;
  const arena = getArenaForLevel(playerLevel) ?? ARENAS[0];
  const ownedCardIds = me?.cards.map((c) => c.cardId) ?? [];
  const localName = me?.profile.displayName ?? "Vous";

  return <GameInner seed={seed} isMultiplayer={isMultiplayer} localFaction={localFaction} deck={finalDeck} arena={arena} roomCode={roomCode} playerLevel={playerLevel} ownedCardIds={ownedCardIds} localName={localName} opponentNameParam={opponentNameParam} isFriendly={isFriendly} />;
}
