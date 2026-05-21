import { GameState, FloatingText } from "../game/types";
import {
  ARENA_WIDTH, ARENA_HEIGHT,
  RIVER_Y, RIVER_HEIGHT,
  LEFT_BRIDGE_X, RIGHT_BRIDGE_X, BRIDGE_WIDTH
} from "../game/constants";
import TowerComponent from "./Tower";
import UnitComponent from "./Unit";

function FloatingTextComponent({ ft, elapsed }: { ft: FloatingText; elapsed: number }) {
  const age = elapsed - ft.createdAt;
  const opacity = Math.max(0, 1 - age / 1.2);
  const yOff = age * 40;

  return (
    <div
      className="absolute pointer-events-none font-black text-xs select-none z-30 drop-shadow"
      style={{
        left: `${(ft.x / ARENA_WIDTH) * 100}%`,
        top:  `${(ft.y / ARENA_HEIGHT) * 100}%`,
        color: ft.color,
        opacity,
        transform: `translateY(-${yOff}px) translateX(-50%)`,
        textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        whiteSpace: 'nowrap',
      }}
    >
      {ft.text}
    </div>
  );
}

export default function Arena({
  state,
  onClick,
}: {
  state: GameState;
  onClick: (x: number, y: number) => void;
}) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * ARENA_WIDTH;
    const y = ((e.clientY - rect.top)  / rect.height) * ARENA_HEIGHT;
    if (y > ARENA_HEIGHT / 2) onClick(x, y);
  };

  return (
    <div
      className="w-full h-full relative cursor-crosshair overflow-hidden touch-none select-none"
      style={{
        background: 'linear-gradient(to bottom, #14532d 50%, #15803d 100%)',
      }}
      onClick={handleClick}
      data-testid="arena"
    >
      {/* Subtle grass grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 39px,#000 39px,#000 40px), repeating-linear-gradient(90deg,transparent,transparent 39px,#000 39px,#000 40px)',
        }}
      />

      {/* Center divider line */}
      <div
        className="absolute w-full border-t border-dashed border-white/10"
        style={{ top: '50%' }}
      />

      {/* River */}
      <div
        className="absolute w-full"
        style={{
          top: `${((RIVER_Y - RIVER_HEIGHT / 2) / ARENA_HEIGHT) * 100}%`,
          height: `${(RIVER_HEIGHT / ARENA_HEIGHT) * 100}%`,
          background: 'linear-gradient(to bottom, #1e40af88, #3b82f688)',
          borderTop:    '2px solid rgba(147,197,253,0.4)',
          borderBottom: '2px solid rgba(147,197,253,0.4)',
        }}
      />

      {/* Left bridge */}
      <div
        className="absolute"
        style={{
          left:   `${((LEFT_BRIDGE_X - BRIDGE_WIDTH / 2) / ARENA_WIDTH) * 100}%`,
          width:  `${(BRIDGE_WIDTH / ARENA_WIDTH) * 100}%`,
          top:    `${((RIVER_Y - RIVER_HEIGHT / 2 - 4) / ARENA_HEIGHT) * 100}%`,
          height: `${((RIVER_HEIGHT + 8) / ARENA_HEIGHT) * 100}%`,
          background: '#92400e',
          borderLeft:  '2px solid #a16207',
          borderRight: '2px solid #a16207',
          zIndex: 5,
        }}
      />

      {/* Right bridge */}
      <div
        className="absolute"
        style={{
          left:   `${((RIGHT_BRIDGE_X - BRIDGE_WIDTH / 2) / ARENA_WIDTH) * 100}%`,
          width:  `${(BRIDGE_WIDTH / ARENA_WIDTH) * 100}%`,
          top:    `${((RIVER_Y - RIVER_HEIGHT / 2 - 4) / ARENA_HEIGHT) * 100}%`,
          height: `${((RIVER_HEIGHT + 8) / ARENA_HEIGHT) * 100}%`,
          background: '#92400e',
          borderLeft:  '2px solid #a16207',
          borderRight: '2px solid #a16207',
          zIndex: 5,
        }}
      />

      {/* Towers */}
      {state.towers.map(tower => (
        <TowerComponent key={tower.id} tower={tower} />
      ))}

      {/* Units */}
      {state.units.map(unit => (
        <UnitComponent key={unit.id} unit={unit} />
      ))}

      {/* Floating damage texts */}
      {state.floatingTexts.map(ft => (
        <FloatingTextComponent key={ft.id} ft={ft} elapsed={state.elapsedTime} />
      ))}

      {/* Player side label */}
      <div
        className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-white/30 font-bold uppercase tracking-widest pointer-events-none"
      >
        Votre camp
      </div>
    </div>
  );
}
