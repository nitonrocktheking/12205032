import { Faction, Tower } from "../game/types";

interface Props {
  tower: Tower;
  displayX: number;
  displayY: number;
  localFaction?: Faction;
}

export default function TowerComponent({ tower, displayX, displayY, localFaction = "player" }: Props) {
  const isKing = tower.type === "king";
  const size   = isKing ? 52 : 40;
  const hpPct  = Math.max(0, (tower.hp / tower.maxHp) * 100);
  const isDead = tower.hp <= 0;

  const isMine = tower.faction === localFaction;

  const bodyTop    = isDead ? "#475569" : isMine ? "#60a5fa" : "#fca5a5";
  const bodyBottom = isDead ? "#1e293b" : isMine ? "#1d4ed8" : "#b91c1c";
  const borderCol  = isDead ? "#334155" : isMine ? "#bfdbfe" : "#fecaca";
  const barColor   = isMine ? "#60a5fa" : "#f87171";

  return (
    <div
      className="absolute z-10"
      style={{
        width: size, height: size,
        left: `${displayX}%`,
        top:  `${displayY}%`,
        marginLeft: -size / 2,
        marginTop:  -size / 2,
        filter: isDead ? "none" : "drop-shadow(0 6px 4px rgba(0,0,0,0.55))",
      }}
    >
      {/* Tower base (shadow on ground) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/45 blur-[2px]"
        style={{
          bottom: -4,
          width: size * 0.95,
          height: size * 0.25,
        }}
      />

      {/* Tower body */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{
          borderRadius: isKing ? "10px" : "50%",
          background: `linear-gradient(to bottom, ${bodyTop} 0%, ${bodyBottom} 100%)`,
          border: `2px solid ${borderCol}`,
          boxShadow: isDead
            ? "inset 0 2px 4px rgba(0,0,0,0.5)"
            : `
              inset 0 3px 0 rgba(255,255,255,0.35),
              inset 0 -4px 6px rgba(0,0,0,0.5),
              0 2px 0 rgba(0,0,0,0.4)
            `,
        }}
      >
        {isKing && !isDead && (
          <div className="text-[11px] font-black text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">ROI</div>
        )}
        {isDead && (
          <div className="text-lg opacity-70">💀</div>
        )}
      </div>

      {/* HP bar */}
      {!isDead && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 h-2 bg-black/70 rounded-full overflow-hidden border border-black/40"
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
