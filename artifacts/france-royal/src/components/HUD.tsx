import { Faction, GameState } from "../game/types";
import { MAX_ELIXIR } from "../game/constants";
import { ArenaTheme } from "../game/arenas";

export default function HUD({ state, localFaction = "player", arena }: { state: GameState; localFaction?: Faction; arena?: ArenaTheme }) {
  // Crowns = enemy towers destroyed (towers belonging to the opposing faction)
  const myCrowns  = state.towers.filter(t => t.faction !== localFaction && t.hp <= 0).length;
  const oppCrowns = state.towers.filter(t => t.faction === localFaction  && t.hp <= 0).length;

  const m = Math.floor(state.timeRemaining / 60);
  const s = Math.floor(state.timeRemaining % 60);
  const timeStr = `${m}:${s.toString().padStart(2, "0")}`;
  const lowTime = state.timeRemaining < 30;

  const myElixir   = localFaction === "player" ? state.elixir.player : state.elixir.enemy;
  const elixirInt  = Math.floor(myElixir);
  const elixirPct  = (myElixir / MAX_ELIXIR) * 100;

  return (
    <div className="bg-slate-900/95 backdrop-blur border-b border-slate-800 z-50 px-3 pt-2 pb-2.5">
      {/* Top row: crowns + arena name + timer */}
      <div className="flex items-center justify-between mb-2">
        {/* Crowns left */}
        <div className="flex items-center gap-0.5">
          {[0, 1, 2].map(i => (
            <Crown key={i} filled={i < myCrowns} color="blue" />
          ))}
        </div>

        {/* Center: arena + timer */}
        <div className="flex flex-col items-center">
          {arena && (
            <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold leading-none flex items-center gap-1">
              <span>{arena.emoji}</span><span>{arena.name}</span>
            </div>
          )}
          <div className={`text-xl font-black font-mono tracking-wider leading-tight ${lowTime ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {timeStr}
          </div>
        </div>

        {/* Crowns right */}
        <div className="flex items-center gap-0.5">
          {[0, 1, 2].map(i => (
            <Crown key={i} filled={i < oppCrowns} color="red" />
          ))}
        </div>
      </div>

      {/* Elixir bar */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-b from-fuchsia-400 to-fuchsia-700 border-2 border-fuchsia-300 flex items-center justify-center font-black text-white text-sm shadow-[0_2px_0_rgba(0,0,0,0.4)]">
          {elixirInt}
        </div>
        <div className="relative flex-1 h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
          <div
            className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 transition-all ease-linear"
            style={{ width: `${elixirPct}%` }}
          />
          {/* Notches */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: MAX_ELIXIR - 1 }).map((_, i) => (
              <div key={i} className="flex-1 border-r border-black/30 last:border-r-0" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Crown({ filled, color }: { filled: boolean; color: "blue" | "red" }) {
  const filledColor = color === "blue" ? "#fbbf24" : "#fbbf24";
  const bgColor     = filled
    ? (color === "blue" ? "from-blue-500 to-blue-700 border-blue-300" : "from-red-500 to-red-700 border-red-300")
    : "from-slate-800 to-slate-900 border-slate-700";
  return (
    <div className={`w-8 h-8 rounded-md bg-gradient-to-b ${bgColor} border-2 flex items-center justify-center shadow-[0_2px_0_rgba(0,0,0,0.4)]`}>
      {filled && <span className="text-base leading-none" style={{ color: filledColor, filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.6))" }}>👑</span>}
    </div>
  );
}
