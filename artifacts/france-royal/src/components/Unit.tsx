import { motion } from "framer-motion";
import { Faction, Unit } from "../game/types";

interface Props {
  unit: Unit;
  displayX: number;
  displayY: number;
  localFaction?: Faction;
}

export default function UnitComponent({ unit, displayX, displayY, localFaction = "player" }: Props) {
  const hpPct  = Math.max(0, (unit.hp / unit.maxHp) * 100);
  const size   = unit.radius * 2;

  // isMine = this unit is on the local player's side
  const isMine = unit.faction === localFaction;
  const isConverted = unit.isConverted;

  const borderColor = isConverted ? "#a78bfa" : isMine ? "#60a5fa" : "#f87171";
  const bgColor     = isMine ? "#1d4ed8" : "#b91c1c";
  const barColor    = isMine ? "#60a5fa" : "#f87171";

  return (
    <motion.div
      className="absolute z-20"
      style={{
        width: size, height: size,
        left: `${displayX}%`,
        top:  `${displayY}%`,
        marginLeft: -unit.radius,
        marginTop:  -unit.radius,
      }}
      initial={false}
      animate={{ left: `${displayX}%`, top: `${displayY}%` }}
      transition={{ type: "tween", duration: 0.08, ease: "linear" }}
    >
      {/* HP bar */}
      <div
        className="absolute -top-3 left-1/2 h-1.5 bg-black/70 rounded-full overflow-hidden border border-black/40"
        style={{ width: Math.max(size, 28), marginLeft: -Math.max(size, 28) / 2 }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${hpPct}%`, backgroundColor: barColor }}
        />
      </div>

      {/* Body */}
      <div
        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center font-black text-white shadow-lg"
        style={{
          border: `2px solid ${borderColor}`,
          backgroundColor: bgColor,
          fontSize: Math.max(7, unit.radius * 0.55),
        }}
      >
        {unit.imagePath ? (
          <img
            src={unit.imagePath}
            alt={unit.label}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <span className="select-none leading-none">{unit.label}</span>
        )}
      </div>

      {/* Converted indicator */}
      {isConverted && (
        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-violet-400 border border-white animate-pulse" />
      )}
    </motion.div>
  );
}
