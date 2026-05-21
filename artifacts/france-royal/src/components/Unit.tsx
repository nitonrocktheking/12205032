import { motion } from "framer-motion";
import { Unit } from "../game/types";
import { ARENA_WIDTH, ARENA_HEIGHT } from "../game/constants";

export default function UnitComponent({ unit }: { unit: Unit }) {
  const hpPercent = (unit.hp / unit.maxHp) * 100;
  
  return (
    <motion.div
      className="absolute flex flex-col items-center justify-center shadow-lg font-bold text-white z-20"
      style={{
        width: unit.radius * 2,
        height: unit.radius * 2,
        backgroundColor: unit.color,
        borderRadius: '50%',
        left: `${(unit.position.x / ARENA_WIDTH) * 100}%`,
        top: `${(unit.position.y / ARENA_HEIGHT) * 100}%`,
        marginLeft: -unit.radius,
        marginTop: -unit.radius,
        fontSize: Math.max(8, unit.radius * 0.6),
        border: `2px solid ${unit.faction === 'player' ? '#60a5fa' : '#f87171'}`
      }}
      initial={false}
      animate={{
        left: `${(unit.position.x / ARENA_WIDTH) * 100}%`,
        top: `${(unit.position.y / ARENA_HEIGHT) * 100}%`,
      }}
      transition={{ type: 'tween', duration: 0.1, ease: 'linear' }}
    >
      <div className="absolute -top-4 w-12 h-1.5 bg-black rounded-full overflow-hidden border border-slate-700">
        <div 
          className={`h-full ${unit.faction === 'player' ? 'bg-blue-400' : 'bg-red-400'}`} 
          style={{ width: `${Math.max(0, hpPercent)}%` }} 
        />
      </div>
      {unit.label}
    </motion.div>
  );
}
