import { useEffect, useState } from "react";
import { Faction, GameState } from "../game/types";
import { MAX_ELIXIR } from "../game/constants";
import { ArenaTheme } from "../game/arenas";
import { isMuted, toggleMuted, subscribeMuted } from "../lib/sfx";

interface HUDProps {
  state: GameState;
  localFaction?: Faction;
  arena?: ArenaTheme;
  localName?: string;
  opponentName?: string;
}

export default function HUD({ state, localFaction = "player", arena, localName, opponentName }: HUDProps) {
  const [muted, setMutedState] = useState<boolean>(() => isMuted());
  useEffect(() => subscribeMuted(setMutedState), []);
  // Crowns = enemy towers destroyed (towers belonging to the opposing faction)
  const myCrowns  = state.towers.filter(t => t.faction !== localFaction && t.hp <= 0).length;
  const oppCrowns = state.towers.filter(t => t.faction === localFaction  && t.hp <= 0).length;

  const m = Math.floor(Math.max(0, state.timeRemaining) / 60);
  const s = Math.floor(Math.max(0, state.timeRemaining) % 60);
  const timeStr = `${m}:${s.toString().padStart(2, "0")}`;
  const doubleElixir = state.isOvertime || state.timeRemaining < 30;
  const lowTime = doubleElixir;

  const myElixir   = localFaction === "player" ? state.elixir.player : state.elixir.enemy;
  const elixirInt  = Math.floor(myElixir);
  const elixirPct  = (myElixir / MAX_ELIXIR) * 100;

  return (
    <div className="bg-slate-900/95 backdrop-blur border-b border-slate-800 z-50 px-3 pt-2 pb-2.5">
      {/* Names row */}
      {(localName || opponentName) && (
        <div className="flex items-center justify-between mb-1.5 text-[11px] font-black uppercase tracking-wide">
          <div className="flex items-center gap-1.5 max-w-[42%] min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
            <span className="text-blue-200 truncate" data-testid="text-local-name">{localName ?? "Vous"}</span>
          </div>
          <span className="text-slate-600 text-[9px] tracking-[0.3em]">VS</span>
          <div className="flex items-center gap-1.5 max-w-[42%] min-w-0 justify-end">
            <span className="text-rose-200 truncate text-right" data-testid="text-opponent-name">{opponentName ?? "Adversaire"}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0 shadow-[0_0_6px_rgba(251,113,133,0.8)]" />
          </div>
        </div>
      )}

      {/* Top row: crowns + arena name + timer */}
      <div className="flex items-center justify-between mb-2">
        {/* Crowns left + mute toggle */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggleMuted()}
            aria-label={muted ? "Activer le son" : "Couper le son"}
            data-testid="button-toggle-sfx"
            className="w-6 h-6 rounded-md bg-slate-800/80 hover:bg-slate-700 active:translate-y-px border border-slate-700 text-slate-300 text-xs leading-none flex items-center justify-center shadow-[0_2px_0_rgba(0,0,0,0.4)]"
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <div className="flex items-center gap-0.5">
            {[0, 1, 2].map(i => (
              <Crown key={i} filled={i < myCrowns} color="blue" />
            ))}
          </div>
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
          {state.isOvertime ? (
            <div className="text-[9px] uppercase tracking-[0.25em] font-black text-rose-300 leading-none mt-0.5 animate-pulse">
              Mort subite · x2 élixir
            </div>
          ) : doubleElixir ? (
            <div className="text-[9px] uppercase tracking-[0.25em] font-black text-fuchsia-300 leading-none mt-0.5">
              x2 élixir
            </div>
          ) : null}
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
