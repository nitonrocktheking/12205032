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

  const isMine = unit.faction === localFaction;
  const isConverted = unit.isConverted;

  // Color palette
  const ringTop    = isConverted ? "#c4b5fd" : isMine ? "#93c5fd" : "#fca5a5";
  const ringMid    = isConverted ? "#a78bfa" : isMine ? "#3b82f6" : "#ef4444";
  const ringBottom = isConverted ? "#6d28d9" : isMine ? "#1e3a8a" : "#7f1d1d";
  const barColor   = isMine ? "#60a5fa" : "#f87171";

  const barWidth = Math.max(size, 28);

  return (
    <motion.div
      className="absolute z-20"
      style={{
        width: size, height: size * 1.25,
        left: `${displayX}%`,
        top:  `${displayY}%`,
        marginLeft: -unit.radius,
        marginTop:  -unit.radius * 1.25,
      }}
      initial={false}
      animate={{ left: `${displayX}%`, top: `${displayY}%` }}
      transition={{ type: "tween", duration: 0.08, ease: "linear" }}
    >
      {/* Ground shadow (oval, below the figure) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-black/55 blur-[2px] pointer-events-none"
        style={{
          bottom: 0,
          width: size * 0.95,
          height: size * 0.22,
        }}
      />

      {/* HP bar (above the figure) */}
      <div
        className="absolute left-1/2 -translate-x-1/2 h-1.5 bg-black/70 rounded-full overflow-hidden border border-black/40"
        style={{ top: -4, width: barWidth }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${hpPct}%`, backgroundColor: barColor }}
        />
      </div>

      {/* Figure body (pedestal disc + raised portrait) */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: size * 0.08,
          width: size,
          height: size,
          borderRadius: "50%",
          background: `linear-gradient(to bottom, ${ringTop} 0%, ${ringMid} 50%, ${ringBottom} 100%)`,
          border: "2px solid rgba(0,0,0,0.55)",
          boxShadow: `
            inset 0 3px 0 rgba(255,255,255,0.45),
            inset 0 -3px 5px rgba(0,0,0,0.55),
            0 3px 4px rgba(0,0,0,0.5)
          `,
          overflow: "hidden",
        }}
      >
        {/* Inner portrait disc — slight inset for "raised" feel */}
        <div
          className="absolute inset-[3px] rounded-full overflow-hidden flex items-center justify-center font-black text-white"
          style={{
            background: "radial-gradient(circle at 50% 30%, rgba(255,255,255,0.18) 0%, transparent 60%)",
            fontSize: Math.max(7, unit.radius * 0.55),
          }}
        >
          {unit.imagePath ? (
            <img
              src={unit.imagePath}
              alt={unit.label}
              className="w-full h-full object-cover object-top"
              draggable={false}
            />
          ) : (
            <span className="select-none leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">{unit.label}</span>
          )}
        </div>

        {/* Top highlight gloss */}
        <div
          className="absolute inset-x-2 top-1 h-1/3 rounded-full pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, rgba(255,255,255,0.35), transparent)",
            filter: "blur(2px)",
          }}
        />
      </div>

      {/* Converted indicator */}
      {isConverted && (
        <div
          className="absolute rounded-full bg-violet-400 border-2 border-white animate-pulse z-30"
          style={{ right: -2, bottom: size * 0.1, width: 10, height: 10 }}
        />
      )}
    </motion.div>
  );
}
