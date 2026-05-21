import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Faction, GameState } from "../game/types";
import { createInitialState, updateGame, playCard, playEnemyCard } from "../game/engine";
import { RENDER_RATE, ARENA_HEIGHT } from "../game/constants";
import Arena from "../components/Arena";
import HUD from "../components/HUD";
import CardHand from "../components/CardHand";
import { useMultiplayer } from "../hooks/useMultiplayer";

function parseParams() {
  const p = new URLSearchParams(window.location.search);
  const seedStr = p.get("seed");
  const faction = p.get("faction") as Faction | null;
  const seed = seedStr !== null ? Number(seedStr) : undefined;
  const isMultiplayer = seed !== undefined;
  const localFaction: Faction = faction === "enemy" ? "enemy" : "player";
  return { seed, isMultiplayer, localFaction };
}

export default function Game() {
  const [, setLocation] = useLocation();
  const { seed, isMultiplayer, localFaction } = parseParams();

  const gameStateRef = useRef<GameState>(createInitialState(seed));
  const [renderState, setRenderState] = useState<GameState>(() => ({ ...gameStateRef.current }));
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [opponentLeft, setOpponentLeft] = useState(false);

  // ── Multiplayer WebSocket relay ────────────────────────────────────────────
  const { sendPlayCard } = useMultiplayer({
    onMessage: (msg) => {
      if (msg.type === "opponent_play_card") {
        // The opponent played a card — apply it to our local game state
        if (localFaction === "player") {
          // Opponent controls enemy faction
          playEnemyCard(gameStateRef.current, msg.cardIndex, { x: msg.x, y: msg.y });
        } else {
          // Opponent controls player faction
          playCard(gameStateRef.current, msg.cardIndex, { x: msg.x, y: msg.y });
        }
      } else if (msg.type === "opponent_left") {
        setOpponentLeft(true);
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
          setLocation(`/results?winner=${localWinner}&pCrowns=${pCrowns}&eCrowns=${eCrowns}`);
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

  const syncRender = () => {
    const s = gameStateRef.current;
    setRenderState({ ...s, units: [...s.units], towers: [...s.towers], hand: [...s.hand], enemyHand: [...s.enemyHand], floatingTexts: [...s.floatingTexts] });
  };

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

      <HUD state={renderState} localFaction={localFaction} />
      <div className="flex-1 relative min-h-0">
        <Arena state={renderState} onClick={handleArenaClick} flipped={flipped} localFaction={localFaction} />
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
