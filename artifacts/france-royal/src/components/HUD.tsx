import { Faction, GameState } from "../game/types";
import { MAX_ELIXIR } from "../game/constants";

export default function HUD({ state, localFaction = "player" }: { state: GameState; localFaction?: Faction }) {
  // Crowns = enemy towers destroyed (towers belonging to the opposing faction)
  const myCrowns  = state.towers.filter(t => t.faction !== localFaction && t.hp <= 0).length;
  const oppCrowns = state.towers.filter(t => t.faction === localFaction  && t.hp <= 0).length;

  const m = Math.floor(state.timeRemaining / 60);
  const s = Math.floor(state.timeRemaining % 60);
  const timeStr = `${m}:${s.toString().padStart(2, "0")}`;

  const myElixir  = localFaction === "player" ? state.elixir.player : state.elixir.enemy;
  const elixirPct = (myElixir / MAX_ELIXIR) * 100;

  return (
    <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800 p-3 z-50">
      <div className="flex justify-between items-center mb-2">
        {/* My crowns */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border-2 border-blue-400">
            {myCrowns}
          </div>
          <span className="text-blue-400 font-bold text-sm">VOUS</span>
        </div>

        {/* Timer */}
        <div className="text-2xl font-black text-white px-4 py-1 bg-slate-800 rounded-lg border border-slate-700 font-mono tracking-wider">
          {timeStr}
        </div>

        {/* Opponent crowns */}
        <div className="flex items-center gap-2">
          <span className="text-red-400 font-bold text-sm">ENNEMI</span>
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold border-2 border-red-400">
            {oppCrowns}
          </div>
        </div>
      </div>

      {/* Elixir bar */}
      <div className="relative h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
        <div
          className="h-full bg-fuchsia-600 transition-all ease-linear"
          style={{ width: `${elixirPct}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
          {Math.floor(myElixir)} / {MAX_ELIXIR}
        </div>
      </div>
    </div>
  );
}
