import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { GameState } from "../game/types";
import { createInitialState, updateGame, playCard } from "../game/engine";
import { RENDER_RATE, TICK_RATE } from "../game/constants";
import Arena from "../components/Arena";
import HUD from "../components/HUD";
import CardHand from "../components/CardHand";

export default function Game() {
  const [, setLocation] = useLocation();
  const gameStateRef = useRef<GameState>(createInitialState());
  const [renderState, setRenderState] = useState<GameState>(gameStateRef.current);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  useEffect(() => {
    let lastTick = performance.now();
    let lastRender = performance.now();
    let reqId: number;

    const loop = (time: number) => {
      const dt = (time - lastTick) / 1000;
      lastTick = time;

      updateGame(gameStateRef.current, dt);

      if (time - lastRender > RENDER_RATE) {
        setRenderState({ ...gameStateRef.current, units: [...gameStateRef.current.units], towers: [...gameStateRef.current.towers], hand: [...gameStateRef.current.hand] });
        lastRender = time;
      }

      if (gameStateRef.current.status === 'gameover') {
        const winner = gameStateRef.current.winner;
        let crowns = { player: 0, enemy: 0 };
        gameStateRef.current.towers.forEach(t => {
          if (t.hp <= 0) {
            if (t.faction === 'enemy') crowns.player++;
            if (t.faction === 'player') crowns.enemy++;
          }
        });
        setTimeout(() => {
          setLocation(`/results?winner=${winner}&pCrowns=${crowns.player}&eCrowns=${crowns.enemy}`);
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
        setRenderState({ ...gameStateRef.current });
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-md mx-auto bg-slate-950 overflow-hidden relative">
      <HUD state={renderState} />
      <div className="flex-1 relative">
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
