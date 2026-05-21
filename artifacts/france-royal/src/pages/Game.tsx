import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { GameState } from "../game/types";
import { createInitialState, updateGame, playCard } from "../game/engine";
import { RENDER_RATE } from "../game/constants";
import Arena from "../components/Arena";
import HUD from "../components/HUD";
import CardHand from "../components/CardHand";

export default function Game() {
  const [, setLocation] = useLocation();
  const gameStateRef = useRef<GameState>(createInitialState());
  const [renderState, setRenderState] = useState<GameState>(() => ({ ...gameStateRef.current }));
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  useEffect(() => {
    let lastTick = performance.now();
    let lastRender = performance.now();
    let reqId: number;
    let redirected = false;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTick) / 1000, 0.05); // cap dt at 50ms
      lastTick = now;

      updateGame(gameStateRef.current, dt);

      if (now - lastRender > RENDER_RATE) {
        const s = gameStateRef.current;
        setRenderState({
          ...s,
          units: [...s.units],
          towers: [...s.towers],
          hand:   [...s.hand],
          floatingTexts: [...s.floatingTexts],
        });
        lastRender = now;
      }

      if (gameStateRef.current.status === 'gameover' && !redirected) {
        redirected = true;
        const { winner, towers } = gameStateRef.current;
        const pCrowns = towers.filter(t => t.faction === 'enemy'  && t.hp <= 0).length;
        const eCrowns = towers.filter(t => t.faction === 'player' && t.hp <= 0).length;
        setTimeout(() => {
          setLocation(`/results?winner=${winner}&pCrowns=${pCrowns}&eCrowns=${eCrowns}`);
        }, 1000);
        return;
      }

      reqId = requestAnimationFrame(loop);
    };

    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [setLocation]);

  const handleArenaClick = (x: number, y: number) => {
    if (selectedCard !== null) {
      if (playCard(gameStateRef.current, selectedCard, { x, y })) {
        setSelectedCard(null);
        const s = gameStateRef.current;
        setRenderState({ ...s, units: [...s.units], towers: [...s.towers], hand: [...s.hand], floatingTexts: [...s.floatingTexts] });
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto bg-slate-950 overflow-hidden relative">
      <HUD state={renderState} />
      <div className="flex-1 relative min-h-0">
        <Arena state={renderState} onClick={handleArenaClick} />
      </div>
      <CardHand
        hand={renderState.hand}
        nextCard={renderState.nextCard}
        elixir={renderState.elixir.player}
        selected={selectedCard}
        onSelect={setSelectedCard}
      />
    </div>
  );
}
