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

  const riverTopPct    = flipped
    ? ((ARENA_HEIGHT - (RIVER_Y + RIVER_HEIGHT / 2)) / ARENA_HEIGHT) * 100
    : ((RIVER_Y - RIVER_HEIGHT / 2) / ARENA_HEIGHT) * 100;
  const riverHeightPct = (RIVER_HEIGHT / ARENA_HEIGHT) * 100;

  const bridgeTopPct    = flipped
    ? ((ARENA_HEIGHT - (RIVER_Y + RIVER_HEIGHT / 2 + 6)) / ARENA_HEIGHT) * 100
    : ((RIVER_Y - RIVER_HEIGHT / 2 - 6) / ARENA_HEIGHT) * 100;
  const bridgeHeightPct = ((RIVER_HEIGHT + 12) / ARENA_HEIGHT) * 100;

  // Pseudo-3D grass: radial spotlight + linear gradient for depth
  const grassBackground = `
    radial-gradient(ellipse 80% 60% at 50% 50%, ${arena.grassBottom}cc 0%, transparent 70%),
    linear-gradient(to bottom, ${arena.grassTop} 0%, ${arena.grassBottom} 50%, ${arena.grassTop} 100%)
  `;

  return (
    <div
      className="w-full h-full relative cursor-crosshair overflow-hidden touch-none select-none"
      style={{
        background: grassBackground,
        boxShadow: `
          inset 0 12px 24px rgba(0,0,0,0.55),
          inset 0 -12px 24px rgba(0,0,0,0.55),
          inset 12px 0 24px rgba(0,0,0,0.45),
          inset -12px 0 24px rgba(0,0,0,0.45)
        `,
      }}
      onClick={handleClick}
      data-testid="arena"
      data-arena={arena.id}
    >
      {/* Grass grid (subtle pitch lines) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: arena.gridOpacity,
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 39px,#000 39px,#000 40px)," +
            "repeating-linear-gradient(90deg,transparent,transparent 39px,#000 39px,#000 40px)",
        }}
      />

      {/* Vignette overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Corner decorations (themed) */}
      <div className="absolute top-3 left-3 text-2xl pointer-events-none opacity-50 drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]">{arena.emoji}</div>
      <div className="absolute top-3 right-3 text-2xl pointer-events-none opacity-50 drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]">{arena.emoji}</div>
      <div className="absolute bottom-3 left-3 text-2xl pointer-events-none opacity-50 drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]">{arena.emoji}</div>
      <div className="absolute bottom-3 right-3 text-2xl pointer-events-none opacity-50 drop-shadow-[0_3px_2px_rgba(0,0,0,0.6)]">{arena.emoji}</div>

      {/* Center divider */}
      <div className="absolute w-full border-t border-dashed border-white/15" style={{ top: "50%" }} />

      {/* River — multi-stop gradient + inset shadow for "depth" */}
      <div
        className="absolute w-full overflow-hidden"
        style={{
          top: `${riverTopPct}%`,
          height: `${riverHeightPct}%`,
          background: `linear-gradient(to bottom,
            rgba(0,0,0,0.45) 0%,
            ${arena.riverTop} 18%,
            ${arena.riverBottom} 50%,
            ${arena.riverTop} 82%,
            rgba(0,0,0,0.45) 100%)`,
          borderTop: `2px solid ${arena.riverBorder}`,
          borderBottom: `2px solid ${arena.riverBorder}`,
          boxShadow: "inset 0 6px 12px rgba(0,0,0,0.6), inset 0 -6px 12px rgba(0,0,0,0.6)",
        }}
      >
        <div className="absolute inset-0 arena-water" />
        <div className="absolute inset-0 arena-water-wave" />
      </div>

      {/* Left bridge */}
      <div
        className="absolute arena-bridge-planks"
        style={{
          left: `${((LEFT_BRIDGE_X - BRIDGE_WIDTH / 2) / ARENA_WIDTH) * 100}%`,
          width: `${(BRIDGE_WIDTH / ARENA_WIDTH) * 100}%`,
          top: `${bridgeTopPct}%`,
          height: `${bridgeHeightPct}%`,
          background: `linear-gradient(to bottom,
            ${arena.bridgeBorder} 0%,
            ${arena.bridgeColor} 15%,
            ${arena.bridgeColor} 85%,
            rgba(0,0,0,0.6) 100%)`,
          borderLeft: `3px solid ${arena.bridgeBorder}`,
          borderRight: `3px solid ${arena.bridgeBorder}`,
          borderRadius: "3px",
          boxShadow: `
            inset 0 2px 0 rgba(255,255,255,0.25),
            inset 0 -2px 0 rgba(0,0,0,0.4),
            0 4px 6px rgba(0,0,0,0.55)
          `,
          zIndex: 5,
        }}
      />
      {/* Right bridge */}
      <div
        className="absolute arena-bridge-planks"
        style={{
          left: `${((RIGHT_BRIDGE_X - BRIDGE_WIDTH / 2) / ARENA_WIDTH) * 100}%`,
          width: `${(BRIDGE_WIDTH / ARENA_WIDTH) * 100}%`,
          top: `${bridgeTopPct}%`,
          height: `${bridgeHeightPct}%`,
          background: `linear-gradient(to bottom,
            ${arena.bridgeBorder} 0%,
            ${arena.bridgeColor} 15%,
            ${arena.bridgeColor} 85%,
            rgba(0,0,0,0.6) 100%)`,
          borderLeft: `3px solid ${arena.bridgeBorder}`,
          borderRight: `3px solid ${arena.bridgeBorder}`,
          borderRadius: "3px",
          boxShadow: `
            inset 0 2px 0 rgba(255,255,255,0.25),
            inset 0 -2px 0 rgba(0,0,0,0.4),
            0 4px 6px rgba(0,0,0,0.55)
          `,
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
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-white/40 font-bold uppercase tracking-widest pointer-events-none drop-shadow">
        {localFaction === "enemy" ? "Votre camp (rouge)" : "Votre camp"}
      </div>
    </div>
  );
}
