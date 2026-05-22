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

function parseParams() {
  const p = new URLSearchParams(window.location.search);
  const seedStr = p.get("seed");
  const faction = p.get("faction") as Faction | null;
  const code = p.get("code");
  const seed = seedStr !== null ? Number(seedStr) : undefined;
  const isMultiplayer = seed !== undefined;
  const localFaction: Faction = faction === "enemy" ? "enemy" : "player";
  return { seed, isMultiplayer, localFaction, roomCode: code };
}

function GameInner({ seed, isMultiplayer, localFaction, deck, arena, roomCode }: { seed?: number; isMultiplayer: boolean; localFaction: Faction; deck?: string[]; arena: ArenaTheme; roomCode: string | null }) {
  const [, setLocation] = useLocation();
  const gameStateRef = useRef<GameState>(createInitialState(seed, deck));
  const [renderState, setRenderState] = useState<GameState>(() => ({ ...gameStateRef.current }));
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [opponentLeft, setOpponentLeft] = useState(false);

  void isMultiplayer; void localFaction; // referenced below

  // ── Multiplayer WebSocket relay ────────────────────────────────────────────
  const { sendPlayCard, rejoinRoom } = useMultiplayer({
    onMessage: (msg) => {
      if (msg.type === "opponent_play_card") {
        if (localFaction === "player") {
          playEnemyCard(gameStateRef.current, msg.cardIndex, { x: msg.x, y: msg.y });
        } else {
          playCard(gameStateRef.current, msg.cardIndex, { x: msg.x, y: msg.y });
        }
        // Force immediate re-render so the opponent's unit appears without waiting for the next tick.
        syncRender();
      } else if (msg.type === "opponent_left") {
        setOpponentLeft(true);
      } else if (msg.type === "error" && isMultiplayer) {
        // Rejoin failed (room expired) — treat as opponent gone.
        setOpponentLeft(true);
      }
    },
    onOpen: () => {
      // After navigating from Lobby, re-attach to the same room with the same faction.
      if (isMultiplayer && roomCode) {
        rejoinRoom(roomCode, localFaction);
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
      const dt = Math.min((now - lastTick) / 1000, 0.05);
      lastTick = now;
      updateGame(gameStateRef.current, dt);

      if (now - lastRender > RENDER_RATE) {
        const s = gameStateRef.current;
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

      if (gameStateRef.current.status === "gameover" && !redirected) {
        redirected = true;
        const { winner, towers } = gameStateRef.current;
        // From the local player's perspective
        const localWinner = localFaction === "player"
          ? winner
          : winner === "player" ? "enemy" : winner === "enemy" ? "player" : "draw";
        const pCrowns = towers.filter(t => t.faction === (localFaction === "player" ? "enemy" : "player") && t.hp <= 0).length;
        const eCrowns = towers.filter(t => t.faction === localFaction && t.hp <= 0).length;
        setTimeout(() => {
          const mpFlag = isMultiplayer ? "&mp=1" : "";
          setLocation(`/results?winner=${localWinner}&pCrowns=${pCrowns}&eCrowns=${eCrowns}${mpFlag}`);
        }, 1000);
        return;
      }

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Card play ──────────────────────────────────────────────────────────────
  const handleArenaClick = (x: number, y: number) => {
    if (selectedCard === null) return;

    if (localFaction === "player") {
      if (playCard(gameStateRef.current, selectedCard, { x, y })) {
        if (isMultiplayer) sendPlayCard(selectedCard, x, y);
        setSelectedCard(null);
        syncRender();
      }
    } else {
      // Player 2: clicks arrive already in internal coords (translated by Arena)
      if (playEnemyCard(gameStateRef.current, selectedCard, { x, y })) {
        if (isMultiplayer) sendPlayCard(selectedCard, x, y);
        setSelectedCard(null);
        syncRender();
      }
    }
  };

  function syncRender() {
    const s = gameStateRef.current;
    setRenderState({ ...s, units: [...s.units], towers: [...s.towers], hand: [...s.hand], enemyHand: [...s.enemyHand], floatingTexts: [...s.floatingTexts] });
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

      <HUD state={renderState} localFaction={localFaction} arena={arena} />
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
  const { seed, isMultiplayer, localFaction, roomCode } = parseParams();
  const { data: me, isLoading } = useMe();

  // Wait for user data before initializing solo state so we use the selected deck.
  // MP doesn't need it (uses default deck for both sides for now).
  if (!isMultiplayer && isLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Préparation de l'arène…</div>;
  }

  const deck = isMultiplayer ? undefined : getSelectedDeck(me);
  const finalDeck = deck && deck.length === 8 ? deck : undefined;
  const arena = getArenaForLevel(me?.profile.level ?? 1) ?? ARENAS[0];

  return <GameInner seed={seed} isMultiplayer={isMultiplayer} localFaction={localFaction} deck={finalDeck} arena={arena} roomCode={roomCode} />;
}
