import { GameState } from "../game/types";
import { ARENA_WIDTH, ARENA_HEIGHT, RIVER_Y, RIVER_HEIGHT, LEFT_BRIDGE_X, RIGHT_BRIDGE_X, BRIDGE_WIDTH } from "../game/constants";
import TowerComponent from "./Tower";
import UnitComponent from "./Unit";

export default function Arena({ state, onClick }: { state: GameState, onClick: (x: number, y: number) => void }) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = ARENA_WIDTH / rect.width;
    const scaleY = ARENA_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Can only spawn on own half
    if (y > ARENA_HEIGHT / 2) {
      onClick(x, y);
    }
  };

  return (
    <div 
      className="w-full h-full bg-green-800 relative cursor-crosshair overflow-hidden touch-none"
      onClick={handleClick}
      data-testid="arena"
    >
      <div 
        className="absolute w-full top-1/2 -translate-y-1/2 bg-blue-500/30 border-y-2 border-blue-400/50"
        style={{ height: RIVER_HEIGHT }}
      />
      
      <div 
        className="absolute top-1/2 -translate-y-1/2 bg-yellow-700/50 border-x-2 border-yellow-600/50"
        style={{ left: LEFT_BRIDGE_X - BRIDGE_WIDTH/2, width: BRIDGE_WIDTH, height: RIVER_HEIGHT + 10 }}
      />
      
      <div 
        className="absolute top-1/2 -translate-y-1/2 bg-yellow-700/50 border-x-2 border-yellow-600/50"
        style={{ left: RIGHT_BRIDGE_X - BRIDGE_WIDTH/2, width: BRIDGE_WIDTH, height: RIVER_HEIGHT + 10 }}
      />

      {state.towers.map(tower => (
        <TowerComponent key={tower.id} tower={tower} />
      ))}

      {state.units.map(unit => (
        <UnitComponent key={unit.id} unit={unit} />
      ))}
    </div>
  );
}
