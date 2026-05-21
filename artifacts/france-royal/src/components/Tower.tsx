import { Tower } from "../game/types";
import { ARENA_WIDTH, ARENA_HEIGHT } from "../game/constants";

export default function TowerComponent({ tower }: { tower: Tower }) {
  const isKing = tower.type === 'king';
  const size = isKing ? 48 : 36;
  const hpPercent = (tower.hp / tower.maxHp) * 100;
  const isDead = tower.hp <= 0;
  
  return (
    <div
      className={`absolute flex flex-col items-center justify-center shadow-xl z-10 transition-colors
        ${isDead ? 'bg-slate-800 border-slate-700' : tower.faction === 'player' ? 'bg-blue-800 border-blue-600' : 'bg-red-800 border-red-600'}
      `}
      style={{
        width: size,
        height: size,
        borderRadius: isKing ? '8px' : '50%',
        left: `${(tower.position.x / ARENA_WIDTH) * 100}%`,
        top: `${(tower.position.y / ARENA_HEIGHT) * 100}%`,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        borderWidth: '2px',
      }}
    >
      {!isDead && (
        <div className="absolute -top-5 w-16 h-2 bg-black rounded-full overflow-hidden border border-slate-700">
          <div 
            className={`h-full ${tower.faction === 'player' ? 'bg-blue-400' : 'bg-red-400'}`} 
            style={{ width: `${Math.max(0, hpPercent)}%` }} 
          />
        </div>
      )}
      {isKing && !isDead && (
        <div className="text-xl font-bold text-white/50">K</div>
      )}
    </div>
  );
}
