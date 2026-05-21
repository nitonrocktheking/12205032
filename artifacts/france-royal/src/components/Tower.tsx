import { memo } from "react";
import { Faction, Tower } from "../game/types";

interface Props {
  tower: Tower;
  displayX: number;
  displayY: number;
  // Primitive snapshot so React.memo can detect HP changes
  // (engine mutates tower objects in place).
  hp: number;
  localFaction?: Faction;
}

function TowerComponent({ tower, displayX, displayY, hp, localFaction = "player" }: Props) {
  const isKing = tower.type === "king";
  const size   = isKing ? 56 : 42;
  const hpPct  = Math.max(0, (hp / tower.maxHp) * 100);
  const isDead = hp <= 0;

  const isMine = tower.faction === localFaction;

  // Color palette (per side)
  const bodyTop    = isDead ? "#475569" : isMine ? "#93c5fd" : "#fca5a5";
  const bodyMid    = isDead ? "#334155" : isMine ? "#3b82f6" : "#ef4444";
  const bodyBottom = isDead ? "#1e293b" : isMine ? "#1e3a8a" : "#7f1d1d";
  const stoneTop   = isDead ? "#64748b" : "#e7e5e4";
  const stoneBottom = isDead ? "#334155" : "#a8a29e";
  const barColor   = isMine ? "#60a5fa" : "#f87171";

  // Crenellations (3 for princess, 4 for king)
  const merlons = isKing ? 4 : 3;

  return (
    <div
      className="absolute z-10"
      style={{
        width: size, height: size * 1.15,
        left: `${displayX}%`,
        top:  `${displayY}%`,
        marginLeft: -size / 2,
        marginTop:  -size * 0.65,
        filter: isDead ? "grayscale(1) brightness(0.5)" : "drop-shadow(0 6px 5px rgba(0,0,0,0.55))",
      }}
    >
      {/* Ground shadow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/50 blur-[3px]"
        style={{ bottom: -2, width: size * 1.05, height: size * 0.22 }}
      />

      {/* Stone base pedestal */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: 0,
          width: size * 1.05,
          height: size * 0.28,
          borderRadius: "6px",
          background: `linear-gradient(to bottom, ${stoneTop} 0%, ${stoneBottom} 100%)`,
          border: "2px solid rgba(0,0,0,0.45)",
          boxShadow: "inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.3)",
        }}
      />

      {/* Tower body (colored block) */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: size * 0.22,
          width: size * 0.78,
          height: size * 0.62,
          borderRadius: "5px",
          background: `linear-gradient(to bottom, ${bodyTop} 0%, ${bodyMid} 50%, ${bodyBottom} 100%)`,
          border: "2px solid rgba(0,0,0,0.4)",
          boxShadow: `
            inset 0 3px 0 rgba(255,255,255,0.35),
            inset 0 -3px 4px rgba(0,0,0,0.5),
            inset 3px 0 4px rgba(0,0,0,0.2),
            inset -3px 0 4px rgba(0,0,0,0.2)
          `,
        }}
      >
        {/* Crown medallion */}
        {!isDead && (
          <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] leading-none opacity-90 drop-shadow">
            👑
          </div>
        )}
      </div>

      {/* Crenellated top (battlements) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex justify-between items-end"
        style={{
          bottom: size * 0.78,
          width: size * 0.78,
          height: size * 0.18,
          paddingLeft: 1, paddingRight: 1,
        }}
      >
        {Array.from({ length: merlons }).map((_, i) => (
          <div
            key={i}
            style={{
              width: `${(100 / (merlons * 2 - 1))}%`,
              height: "100%",
              background: `linear-gradient(to bottom, ${stoneTop} 0%, ${stoneBottom} 100%)`,
              border: "1.5px solid rgba(0,0,0,0.5)",
              borderRadius: "2px 2px 0 0",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
            }}
          />
        ))}
      </div>

      {/* King flag */}
      {isKing && !isDead && (
        <>
          <div
            className="absolute left-1/2"
            style={{
              bottom: size * 0.95,
              width: 2,
              height: size * 0.32,
              background: "#44403c",
              marginLeft: -1,
            }}
          />
          <div
            className="absolute left-1/2"
            style={{
              bottom: size * 1.15,
              marginLeft: 1,
              width: size * 0.32,
              height: size * 0.18,
              background: isMine ? "#3b82f6" : "#ef4444",
              clipPath: "polygon(0 0, 100% 0, 75% 50%, 100% 100%, 0 100%)",
              boxShadow: "0 2px 2px rgba(0,0,0,0.5)",
            }}
          />
        </>
      )}

      {/* Death indicator */}
      {isDead && (
        <div className="absolute inset-0 flex items-center justify-center text-2xl">💀</div>
      )}

      {/* HP bar */}
      {!isDead && (
        <div
          className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 bg-black/70 rounded-full overflow-hidden border border-black/40"
          style={{ width: Math.max(size, 36) }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${hpPct}%`, backgroundColor: barColor }}
          />
        </div>
      )}
    </div>
  );
}

export default memo(TowerComponent, (prev, next) =>
  prev.hp === next.hp &&
  prev.displayX === next.displayX &&
  prev.displayY === next.displayY &&
  prev.localFaction === next.localFaction
);
