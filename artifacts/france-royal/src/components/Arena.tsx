import { useState } from "react";
import { Faction, FloatingText, GameState, TaxZone } from "../game/types";
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

function TaxZoneCircle({ zone, elapsedTime, localFaction, displayX, displayY }: {
  zone: TaxZone; elapsedTime: number; localFaction: Faction; displayX: number; displayY: number;
}) {
  const age = elapsedTime - zone.createdAt;
  const remaining = Math.max(0, zone.duration - age);
  const isMine = zone.casterFaction === localFaction;
  const color = isMine ? "250,204,21" : "239,68,68"; // amber for mine, red for enemy
  // Pulse stronger in the last 3 seconds
  const fade = remaining < 3 ? 0.4 + 0.6 * (remaining / 3) : 1;
  return (
    <div
      className="absolute pointer-events-none z-[7]"
      style={{
        left: `${displayX}%`,
        top:  `${displayY}%`,
        width:  `${(zone.radius * 2 / ARENA_WIDTH) * 100 * (1 - 2 * FIELD_INSET_X)}%`,
        height: `${(zone.radius * 2 / ARENA_HEIGHT) * 100 * (1 - 2 * FIELD_INSET_Y)}%`,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        border: `2px dashed rgba(${color},${0.9 * fade})`,
        background: `radial-gradient(circle, rgba(${color},${0.22 * fade}) 0%, rgba(${color},${0.10 * fade}) 60%, transparent 100%)`,
        boxShadow: `0 0 18px rgba(${color},${0.5 * fade})`,
        animation: "tax-pulse 1.4s ease-in-out infinite",
      }}
    >
      <div
        className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-black tracking-wider px-1.5 py-0.5 rounded"
        style={{
          background: `rgba(${color},0.9)`,
          color: "#0f172a",
          textShadow: "0 1px 0 rgba(255,255,255,0.4)",
          whiteSpace: "nowrap",
        }}
      >
        IMPÔT · {remaining.toFixed(1)}s
      </div>
    </div>
  );
}

interface Props {
  state: GameState;
  onClick: (x: number, y: number) => void;
  flipped?: boolean;
  localFaction?: Faction;
  arena?: ArenaTheme;
  placing?: boolean;
  placingCardId?: string;
}

// Decorative rock — fixed-size pseudo-3D pebble using CSS gradient
function Rock({ left, top, size = 18 }: { left: string; top: string; size?: number }) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left, top,
        width: size, height: size * 0.7,
        marginLeft: -size / 2,
        marginTop: -size * 0.35,
        borderRadius: "50%",
        background: "radial-gradient(ellipse at 35% 30%, #d6d3d1 0%, #78716c 60%, #44403c 100%)",
        boxShadow: "0 2px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
        zIndex: 6,
      }}
    />
  );
}

// Playing field is inset from the stone frame. Keep in sync with the
// playing-field <div> styles below (top/bottom 2.5%, left/right 4%).
const FIELD_INSET_X = 0.04;
const FIELD_INSET_Y = 0.025;

export default function Arena({ state, onClick, flipped = false, localFaction = "player", arena = ARENAS[0], placing = false, placingCardId }: Props) {
  // Hover position in internal arena coords (always world-space, not flipped).
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);

  const toArenaCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fieldLeftPx = rect.width  * FIELD_INSET_X;
    const fieldTopPx  = rect.height * FIELD_INSET_Y;
    const fieldW = rect.width  * (1 - 2 * FIELD_INSET_X);
    const fieldH = rect.height * (1 - 2 * FIELD_INSET_Y);
    const lx = e.clientX - rect.left - fieldLeftPx;
    const ly = e.clientY - rect.top  - fieldTopPx;
    if (lx < 0 || ly < 0 || lx > fieldW || ly > fieldH) return null;
    const cx = (lx / fieldW) * ARENA_WIDTH;
    const cy = (ly / fieldH) * ARENA_HEIGHT;
    // Convert to world (un-flipped) coords for the active faction
    const wx = cx;
    const wy = flipped ? ARENA_HEIGHT - cy : cy;
    return { wx, wy, displayY: cy };
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = toArenaCoords(e);
    if (!p) return;
    // Player can only deploy on their own half (bottom half in display).
    if (p.displayY <= ARENA_HEIGHT / 2) return;
    onClick(p.wx, p.wy);
  };

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!placing) return;
    const p = toArenaCoords(e);
    if (!p || p.displayY <= ARENA_HEIGHT / 2) { setHover(null); return; }
    setHover({ x: p.wx, y: p.wy });
  };

  const handleLeave = () => setHover(null);

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
    ? ((ARENA_HEIGHT - (RIVER_Y + RIVER_HEIGHT / 2 + 8)) / ARENA_HEIGHT) * 100
    : ((RIVER_Y - RIVER_HEIGHT / 2 - 8) / ARENA_HEIGHT) * 100;
  const bridgeHeightPct = ((RIVER_HEIGHT + 16) / ARENA_HEIGHT) * 100;

  // Checkerboard grass — 50px tiles (8 cols × 12 rows in 400×600)
  const checkerBackground = `
    linear-gradient(45deg, ${arena.tileDark} 25%, transparent 25%, transparent 75%, ${arena.tileDark} 75%),
    linear-gradient(45deg, ${arena.tileDark} 25%, transparent 25%, transparent 75%, ${arena.tileDark} 75%),
    ${arena.tileLight}
  `;

  // Stone path positions (from king to each bridge)
  // King is at y=55 (enemy) and y=545 (player); bridges at LEFT_BRIDGE_X=100, RIGHT_BRIDGE_X=300
  const pathWidth = 20;

  return (
    <div
      className="w-full h-full relative cursor-crosshair overflow-hidden touch-none select-none"
      style={{
        background: arena.borderColor,
        padding: 0,
      }}
      onClick={handleClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      data-testid="arena"
      data-arena={arena.id}
    >
      {/* Stone border frame with corner highlights */}
      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{
          background: `
            radial-gradient(circle at 0% 0%, ${arena.borderHighlight} 0%, transparent 8%),
            radial-gradient(circle at 100% 0%, ${arena.borderHighlight} 0%, transparent 8%),
            radial-gradient(circle at 0% 100%, ${arena.borderHighlight} 0%, transparent 8%),
            radial-gradient(circle at 100% 100%, ${arena.borderHighlight} 0%, transparent 8%)
          `,
          boxShadow: `inset 0 0 0 2px rgba(0,0,0,0.4)`,
        }}
      />

      {/* Playing field (inset from border) */}
      <div
        className="absolute"
        style={{
          top: "2.5%", bottom: "2.5%", left: "4%", right: "4%",
          background: checkerBackground,
          backgroundSize: "50px 50px, 50px 50px, auto",
          backgroundPosition: "0 0, 25px 25px, 0 0",
          boxShadow: `
            inset 0 0 0 2px rgba(0,0,0,0.35),
            inset 0 4px 6px rgba(0,0,0,0.25),
            inset 0 -4px 6px rgba(0,0,0,0.25)
          `,
        }}
      />

      {/* Stone paths (from king tower to bridges) — drawn inside the field area */}
      <div
        className="absolute pointer-events-none z-[2]"
        style={{
          left: `${((LEFT_BRIDGE_X - pathWidth / 2) / ARENA_WIDTH) * 100}%`,
          width: `${(pathWidth / ARENA_WIDTH) * 100}%`,
          top: "8%",
          bottom: "8%",
          background: `repeating-linear-gradient(
            0deg,
            ${arena.pathColor} 0px,
            ${arena.pathColor} 8px,
            rgba(0,0,0,0.2) 8px,
            rgba(0,0,0,0.2) 10px
          )`,
          opacity: 0.35,
        }}
      />
      <div
        className="absolute pointer-events-none z-[2]"
        style={{
          left: `${((RIGHT_BRIDGE_X - pathWidth / 2) / ARENA_WIDTH) * 100}%`,
          width: `${(pathWidth / ARENA_WIDTH) * 100}%`,
          top: "8%",
          bottom: "8%",
          background: `repeating-linear-gradient(
            0deg,
            ${arena.pathColor} 0px,
            ${arena.pathColor} 8px,
            rgba(0,0,0,0.2) 8px,
            rgba(0,0,0,0.2) 10px
          )`,
          opacity: 0.35,
        }}
      />

      {/* Center divider (subtle) */}
      <div
        className="absolute border-t-2 border-dashed border-white/15 pointer-events-none z-[3]"
        style={{ top: "50%", left: "4%", right: "4%" }}
      />

      {/* River */}
      <div
        className="absolute overflow-hidden z-[4]"
        style={{
          left: "4%", right: "4%",
          top: `${riverTopPct}%`,
          height: `${riverHeightPct}%`,
          background: `linear-gradient(to bottom,
            ${arena.riverBorder} 0%,
            ${arena.riverTop} 15%,
            ${arena.riverBottom} 50%,
            ${arena.riverTop} 85%,
            ${arena.riverBorder} 100%)`,
          borderTop: `3px solid ${arena.riverBorder}`,
          borderBottom: `3px solid ${arena.riverBorder}`,
          boxShadow: "inset 0 6px 10px rgba(0,0,0,0.5), inset 0 -6px 10px rgba(0,0,0,0.5)",
        }}
      >
        <div className="absolute inset-0 arena-water" />
        <div className="absolute inset-0 arena-water-wave" />
      </div>

      {/* Rocks along the river bank */}
      <Rock left="6%"  top={`${riverTopPct - 1}%`} size={16} />
      <Rock left="22%" top={`${riverTopPct - 0.5}%`} size={14} />
      <Rock left="40%" top={`${riverTopPct - 1}%`} size={15} />
      <Rock left="60%" top={`${riverTopPct - 0.5}%`} size={14} />
      <Rock left="78%" top={`${riverTopPct - 1}%`} size={16} />
      <Rock left="94%" top={`${riverTopPct - 0.5}%`} size={15} />
      <Rock left="6%"  top={`${riverTopPct + riverHeightPct + 1}%`} size={16} />
      <Rock left="22%" top={`${riverTopPct + riverHeightPct + 0.5}%`} size={14} />
      <Rock left="40%" top={`${riverTopPct + riverHeightPct + 1}%`} size={15} />
      <Rock left="60%" top={`${riverTopPct + riverHeightPct + 0.5}%`} size={14} />
      <Rock left="78%" top={`${riverTopPct + riverHeightPct + 1}%`} size={16} />
      <Rock left="94%" top={`${riverTopPct + riverHeightPct + 0.5}%`} size={15} />

      {/* Left bridge — wooden planks */}
      <div
        className="absolute z-[5]"
        style={{
          left: `${((LEFT_BRIDGE_X - BRIDGE_WIDTH / 2) / ARENA_WIDTH) * 100}%`,
          width: `${(BRIDGE_WIDTH / ARENA_WIDTH) * 100}%`,
          top: `${bridgeTopPct}%`,
          height: `${bridgeHeightPct}%`,
          background: `repeating-linear-gradient(
            0deg,
            ${arena.bridgeBorder} 0px,
            ${arena.bridgeColor} 2px,
            ${arena.bridgeColor} 10px,
            ${arena.bridgeBorder} 12px
          )`,
          borderLeft: `3px solid ${arena.bridgeBorder}`,
          borderRight: `3px solid ${arena.bridgeBorder}`,
          borderRadius: "4px",
          boxShadow: `
            inset 0 2px 0 rgba(255,255,255,0.2),
            inset 0 -2px 0 rgba(0,0,0,0.4),
            0 6px 8px rgba(0,0,0,0.55)
          `,
        }}
      />
      {/* Right bridge */}
      <div
        className="absolute z-[5]"
        style={{
          left: `${((RIGHT_BRIDGE_X - BRIDGE_WIDTH / 2) / ARENA_WIDTH) * 100}%`,
          width: `${(BRIDGE_WIDTH / ARENA_WIDTH) * 100}%`,
          top: `${bridgeTopPct}%`,
          height: `${bridgeHeightPct}%`,
          background: `repeating-linear-gradient(
            0deg,
            ${arena.bridgeBorder} 0px,
            ${arena.bridgeColor} 2px,
            ${arena.bridgeColor} 10px,
            ${arena.bridgeBorder} 12px
          )`,
          borderLeft: `3px solid ${arena.bridgeBorder}`,
          borderRight: `3px solid ${arena.bridgeBorder}`,
          borderRadius: "4px",
          boxShadow: `
            inset 0 2px 0 rgba(255,255,255,0.2),
            inset 0 -2px 0 rgba(0,0,0,0.4),
            0 6px 8px rgba(0,0,0,0.55)
          `,
        }}
      />

      {/* Towers — URSSAF effect hides the caster's towers from the opponent's viewpoint */}
      {state.towers.map(tower => {
        if (
          state.urssafEffect &&
          tower.faction === state.urssafEffect.casterFaction &&
          localFaction !== state.urssafEffect.casterFaction
        ) return null;
        return (
          <TowerComponent
            key={tower.id}
            tower={tower}
            hp={tower.hp}
            lastAttackTime={Number.isFinite(tower.lastAttackTime) ? tower.lastAttackTime : 0}
            displayX={displayX(tower.position.x)}
            displayY={displayY(tower.position.y)}
            localFaction={localFaction}
          />
        );
      })}

      {/* Units */}
      {state.units.map(unit => (
        <UnitComponent
          key={unit.id}
          unit={unit}
          hp={unit.hp}
          faction={unit.faction}
          isConverted={unit.isConverted ?? false}
          transformedAsInvoice={unit.transformedAsInvoice ?? false}
          lastAttackTime={Number.isFinite(unit.lastAttackTime) ? unit.lastAttackTime : 0}
          displayX={displayX(unit.position.x)}
          displayY={displayY(unit.position.y)}
          localFaction={localFaction}
        />
      ))}

      {/* Active "Impôt" perimeters */}
      {state.taxZones.map(zone => (
        <TaxZoneCircle
          key={zone.id}
          zone={zone}
          elapsedTime={state.elapsedTime}
          localFaction={localFaction}
          displayX={displayX(zone.position.x)}
          displayY={displayY(zone.position.y)}
        />
      ))}

      {/* Placement zone overlay — red tint on the enemy half (visual target indicator) */}
      {placing && (
        <div
          className="absolute pointer-events-none z-[7]"
          style={{
            left: "4%", right: "4%",
            top: "2.5%", bottom: "50%",
            background:
              "repeating-linear-gradient(45deg, rgba(220,38,38,0.45) 0px, rgba(220,38,38,0.45) 12px, rgba(185,28,28,0.30) 12px, rgba(185,28,28,0.30) 24px)",
            border: "3px dashed rgba(254,202,202,0.95)",
            boxShadow: "inset 0 0 40px rgba(220,38,38,0.7), 0 0 18px rgba(220,38,38,0.55)",
            animation: "tax-pulse 1.4s ease-in-out infinite",
          }}
        />
      )}

      {/* Hover preview — circle for tax zones, dot otherwise */}
      {placing && hover && (
        placingCardId === 'taxe' ? (
          <div
            className="absolute pointer-events-none z-[8]"
            style={{
              left: `${displayX(hover.x)}%`,
              top:  `${displayY(hover.y)}%`,
              width:  `${(70 * 2 / ARENA_WIDTH) * 100 * (1 - 2 * FIELD_INSET_X)}%`,
              height: `${(70 * 2 / ARENA_HEIGHT) * 100 * (1 - 2 * FIELD_INSET_Y)}%`,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              border: "2px dashed rgba(250,204,21,0.95)",
              background: "radial-gradient(circle, rgba(250,204,21,0.22) 0%, rgba(250,204,21,0.10) 60%, transparent 100%)",
              boxShadow: "0 0 20px rgba(250,204,21,0.45)",
            }}
          />
        ) : (
          <div
            className="absolute pointer-events-none z-[8]"
            style={{
              left: `${displayX(hover.x)}%`,
              top:  `${displayY(hover.y)}%`,
              width: 26, height: 26,
              marginLeft: -13, marginTop: -13,
              borderRadius: "50%",
              border: "2px solid rgba(248,113,113,0.95)",
              background: "rgba(248,113,113,0.25)",
              boxShadow: "0 0 12px rgba(248,113,113,0.6)",
            }}
          />
        )
      )}

      {/* URSSAF aura overlay when effect is active */}
      {state.urssafEffect && (
        <div
          className="absolute inset-0 pointer-events-none z-[35]"
          style={{
            background: "radial-gradient(ellipse at center, rgba(245,158,11,0.10) 0%, rgba(127,29,29,0.18) 70%, rgba(0,0,0,0.30) 100%)",
            mixBlendMode: "multiply",
          }}
        />
      )}

      {/* Floating damage texts */}
      {state.floatingTexts.map(ft => (
        <FloatingTextComponent key={ft.id} ft={ft} elapsed={state.elapsedTime} />
      ))}

      {/* Arena name watermark */}
      <div className="absolute top-1 right-2 z-[40] pointer-events-none flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white/40 drop-shadow">
        <span>{arena.emoji}</span><span>{arena.name}</span>
      </div>
    </div>
  );
}
