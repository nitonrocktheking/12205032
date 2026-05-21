import { Faction, FloatingText, GameState } from "../game/types";
import {
  ARENA_WIDTH, ARENA_HEIGHT,
  RIVER_Y, RIVER_HEIGHT,
  LEFT_BRIDGE_X, RIGHT_BRIDGE_X, BRIDGE_WIDTH,
} from "../game/constants";
import { ArenaTheme, ARENAS } from "../game/arenas";
import TowerComponent from "./Tower";
import UnitComponent from "./Unit";

function FloatingTextComponent({ ft, elapsed }: { ft: FloatingText; elapsed: number }) {
  const age     = elapsed - ft.createdAt;
  const opacity = Math.max(0, 1 - age / 1.2);
  const yOff    = age * 40;
  return (
    <div
      className="absolute pointer-events-none font-black text-xs select-none z-30 drop-shadow"
      style={{
        left: `${(ft.x / ARENA_WIDTH) * 100}%`,
        top:  `${(ft.y / ARENA_HEIGHT) * 100}%`,
        color: ft.color, opacity,
        transform: `translateY(-${yOff}px) translateX(-50%)`,
        textShadow: "0 1px 3px rgba(0,0,0,0.8)",
        whiteSpace: "nowrap",
      }}
    />
  );
}

interface Props {
  state: GameState;
  onClick: (x: number, y: number) => void;
  flipped?: boolean;
  localFaction?: Faction;
  arena?: ArenaTheme;
}

export default function Arena({ state, onClick, flipped = false, localFaction = "player", arena = ARENAS[0] }: Props) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width)  * ARENA_WIDTH;
    const cy = ((e.clientY - rect.top)  / rect.height) * ARENA_HEIGHT;

    if (flipped) {
      // Player 2: screen bottom = internal top (enemy's side)
      // cy > ARENA_HEIGHT/2 means the bottom screen half → internal y < ARENA_HEIGHT/2
      const iy = ARENA_HEIGHT - cy;
      if (cy > ARENA_HEIGHT / 2) onClick(cx, iy);
    } else {
      if (cy > ARENA_HEIGHT / 2) onClick(cx, cy);
    }
  };

  // Map internal Y → display Y%
  const displayY = (iy: number) =>
    flipped
      ? ((ARENA_HEIGHT - iy) / ARENA_HEIGHT) * 100
      : (iy / ARENA_HEIGHT) * 100;

  const displayX = (ix: number) => (ix / ARENA_WIDTH) * 100;

  // River display positions (same in both orientations — river is always in the middle)
  const riverTopPct    = flipped
    ? ((ARENA_HEIGHT - (RIVER_Y + RIVER_HEIGHT / 2)) / ARENA_HEIGHT) * 100
    : ((RIVER_Y - RIVER_HEIGHT / 2) / ARENA_HEIGHT) * 100;
  const riverHeightPct = (RIVER_HEIGHT / ARENA_HEIGHT) * 100;

  const bridgeTopPct    = flipped
    ? ((ARENA_HEIGHT - (RIVER_Y + RIVER_HEIGHT / 2 + 4)) / ARENA_HEIGHT) * 100
    : ((RIVER_Y - RIVER_HEIGHT / 2 - 4) / ARENA_HEIGHT) * 100;
  const bridgeHeightPct = ((RIVER_HEIGHT + 8) / ARENA_HEIGHT) * 100;

  return (
    <div
      className="w-full h-full relative cursor-crosshair overflow-hidden touch-none select-none"
      style={{ background: `linear-gradient(to bottom, ${arena.grassTop} 50%, ${arena.grassBottom} 100%)` }}
      onClick={handleClick}
      data-testid="arena"
      data-arena={arena.id}
    >
      {/* Grass grid */}
      <div
        className="absolute inset-0"
        style={{
          opacity: arena.gridOpacity,
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 39px,#000 39px,#000 40px)," +
            "repeating-linear-gradient(90deg,transparent,transparent 39px,#000 39px,#000 40px)",
        }}
      />

      {/* Arena name watermark */}
      <div className="absolute top-2 right-2 z-10 pointer-events-none flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/30">
        <span>{arena.emoji}</span><span>{arena.name}</span>
      </div>

      {/* Center divider */}
      <div className="absolute w-full border-t border-dashed border-white/10" style={{ top: "50%" }} />

      {/* River */}
      <div
        className="absolute w-full"
        style={{
          top: `${riverTopPct}%`,
          height: `${riverHeightPct}%`,
          background: `linear-gradient(to bottom, ${arena.riverTop}, ${arena.riverBottom})`,
          borderTop: `2px solid ${arena.riverBorder}`,
          borderBottom: `2px solid ${arena.riverBorder}`,
        }}
      />

      {/* Left bridge */}
      <div
        className="absolute"
        style={{
          left: `${((LEFT_BRIDGE_X - BRIDGE_WIDTH / 2) / ARENA_WIDTH) * 100}%`,
          width: `${(BRIDGE_WIDTH / ARENA_WIDTH) * 100}%`,
          top: `${bridgeTopPct}%`,
          height: `${bridgeHeightPct}%`,
          background: arena.bridgeColor,
          borderLeft: `2px solid ${arena.bridgeBorder}`,
          borderRight: `2px solid ${arena.bridgeBorder}`,
          zIndex: 5,
        }}
      />
      {/* Right bridge */}
      <div
        className="absolute"
        style={{
          left: `${((RIGHT_BRIDGE_X - BRIDGE_WIDTH / 2) / ARENA_WIDTH) * 100}%`,
          width: `${(BRIDGE_WIDTH / ARENA_WIDTH) * 100}%`,
          top: `${bridgeTopPct}%`,
          height: `${bridgeHeightPct}%`,
          background: arena.bridgeColor,
          borderLeft: `2px solid ${arena.bridgeBorder}`,
          borderRight: `2px solid ${arena.bridgeBorder}`,
          zIndex: 5,
        }}
      />

      {/* Towers */}
      {state.towers.map(tower => (
        <TowerComponent
          key={tower.id}
          tower={tower}
          displayX={displayX(tower.position.x)}
          displayY={displayY(tower.position.y)}
          localFaction={localFaction}
        />
      ))}

      {/* Units */}
      {state.units.map(unit => (
        <UnitComponent
          key={unit.id}
          unit={unit}
          displayX={displayX(unit.position.x)}
          displayY={displayY(unit.position.y)}
          localFaction={localFaction}
        />
      ))}

      {/* Floating damage texts */}
      {state.floatingTexts.map(ft => (
        <FloatingTextComponent key={ft.id} ft={ft} elapsed={state.elapsedTime} />
      ))}

      {/* Side label */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-white/25 font-bold uppercase tracking-widest pointer-events-none">
        {localFaction === "enemy" ? "Votre camp (rouge)" : "Votre camp"}
      </div>
    </div>
  );
}
