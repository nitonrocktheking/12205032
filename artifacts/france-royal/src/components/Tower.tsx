import { Faction, Tower } from "../game/types";

interface Props {
  tower: Tower;
  displayX: number;
  displayY: number;
  localFaction?: Faction;
}

export default function TowerComponent({ tower, displayX, displayY, localFaction = "player" }: Props) {
  const isKing = tower.type === "king";
  const size   = isKing ? 48 : 36;
  const hpPct  = Math.max(0, (tower.hp / tower.maxHp) * 100);
  const isDead = tower.hp <= 0;

  // From localFaction's perspective: isMine = tower belongs to me
  const isMine = tower.faction === localFaction;

  const bgColor   = isDead ? "#1e293b" : isMine ? "#1d4ed8" : "#b91c1c";
  const borderCol = isDead ? "#334155" : isMine ? "#60a5fa" : "#f87171";
  const barColor  = isMine ? "#60a5fa" : "#f87171";

  return (
    <div
      className="absolute flex flex-col items-center justify-center shadow-xl z-10 transition-colors"
      style={{
        width: size, height: size,
        borderRadius: isKing ? "8px" : "50%",
        left: `${displayX}%`,
        top:  `${displayY}%`,
        marginLeft: -size / 2,
        marginTop:  -size / 2,
        backgroundColor: bgColor,
        border: `2px solid ${borderCol}`,
      }}
    >
      {!isDead && (
        <div
          className="absolute -top-5 h-2 bg-black/70 rounded-full overflow-hidden border border-black/40"
          style={{ width: Math.max(size, 32) }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${hpPct}%`, backgroundColor: barColor }}
          />
        </div>
      )}
      {isKing && !isDead && (
        <div className="text-sm font-black text-white/60">ROI</div>
      )}
      {isDead && (
        <div className="text-lg">💀</div>
      )}
    </div>
  );
}
