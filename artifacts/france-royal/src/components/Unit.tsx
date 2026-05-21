import { motion } from "framer-motion";
import { Unit } from "../game/types";
import { ARENA_WIDTH, ARENA_HEIGHT } from "../game/constants";

export default function UnitComponent({ unit }: { unit: Unit }) {
  const hpPercent = Math.max(0, (unit.hp / unit.maxHp) * 100);
  const size = unit.radius * 2;
  const isConverted = unit.isConverted;

  const borderColor = unit.faction === 'player' 
    ? (isConverted ? '#a78bfa' : '#60a5fa') 
    : '#f87171';

  const hpBarColor = unit.faction === 'player' ? '#3b82f6' : '#ef4444';

  return (
    <motion.div
      className="absolute z-20"
      style={{
        width: size,
        height: size,
        left: `${(unit.position.x / ARENA_WIDTH) * 100}%`,
        top: `${(unit.position.y / ARENA_HEIGHT) * 100}%`,
        marginLeft: -unit.radius,
        marginTop: -unit.radius,
      }}
      initial={false}
      animate={{
        left: `${(unit.position.x / ARENA_WIDTH) * 100}%`,
        top: `${(unit.position.y / ARENA_HEIGHT) * 100}%`,
      }}
      transition={{ type: 'tween', duration: 0.08, ease: 'linear' }}
    >
      {/* HP bar */}
      <div 
        className="absolute -top-3 left-1/2 h-1.5 bg-black/70 rounded-full overflow-hidden border border-black/40"
        style={{ width: Math.max(size, 28), marginLeft: -Math.max(size, 28) / 2 }}
      >
        <div 
          className="h-full rounded-full transition-all"
          style={{ width: `${hpPercent}%`, backgroundColor: hpBarColor }} 
        />
      </div>

      {/* Unit circle */}
      <div
        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center font-black text-white shadow-lg"
        style={{
          border: `2px solid ${borderColor}`,
          backgroundColor: unit.color,
          fontSize: Math.max(7, unit.radius * 0.55),
        }}
      >
        {unit.imagePath ? (
          <img 
            src={unit.imagePath} 
            alt={unit.label}
            className="w-full h-full object-cover object-top"
            style={{ filter: unit.faction === 'enemy' ? 'hue-rotate(140deg) saturate(1.5)' : 'none' }}
          />
        ) : (
          <span className="select-none leading-none">{unit.label}</span>
        )}
      </div>

      {/* Conversion sparkle indicator */}
      {isConverted && (
        <div 
          className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-violet-400 border border-white animate-pulse"
          title="Converti"
        />
      )}
    </motion.div>
  );
}
