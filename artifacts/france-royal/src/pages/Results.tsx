import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Show } from "@clerk/react";
import { useReportMatchResult, type MatchResultResp } from "../hooks/useMe";
import { CARDS } from "../game/cards";

export default function Results() {
  const searchParams = new URLSearchParams(window.location.search);
  const winner  = searchParams.get('winner');
  const pCrowns = searchParams.get('pCrowns');
  const eCrowns = searchParams.get('eCrowns');
  const isMP    = searchParams.get('mp') === '1';

  const isWin  = winner === 'player';
  const isDraw = winner === 'draw';

  const report = useReportMatchResult();
  const reported = useRef(false);
  const [reward, setReward] = useState<MatchResultResp | null>(null);

  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    const res: "win" | "loss" | "draw" = isWin ? "win" : isDraw ? "draw" : "loss";
    report.mutateAsync(res).then(setReward).catch(() => {});
  }, [isWin, isDraw, report]);

  // Colors
  const titleColor = isWin ? 'text-amber-300' : isDraw ? 'text-slate-300' : 'text-rose-400';
  const accentBg   = isWin ? 'from-amber-500/20 via-amber-400/10' : isDraw ? 'from-slate-600/20 via-slate-400/10' : 'from-rose-500/20 via-rose-400/10';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-50 p-4 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-b ${accentBg} to-transparent pointer-events-none`} />

      <div className="relative w-full max-w-sm space-y-5">
        {/* Title */}
        <div className="text-center">
          <div className={`text-6xl font-black tracking-tight drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] ${titleColor}`}>
            {isWin ? 'VICTOIRE' : isDraw ? 'ÉGALITÉ' : 'DÉFAITE'}
          </div>
          <div className="text-xs text-slate-500 uppercase tracking-[0.3em] mt-1 font-bold">
            {isMP ? 'Multijoueur — 1 vs 1' : 'Partie solo'}
          </div>
        </div>

        {/* Score card */}
        <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-700 p-5 shadow-[0_8px_0_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center gap-1">
              <div className="text-[10px] uppercase tracking-widest text-blue-300 font-bold">Vous</div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-b from-blue-400 to-blue-700 border-2 border-blue-300 flex items-center justify-center text-3xl font-black text-white shadow-[0_4px_0_rgba(0,0,0,0.4)]">
                {pCrowns}
              </div>
            </div>
            <div className="text-2xl font-black text-slate-600">VS</div>
            <div className="flex flex-col items-center gap-1">
              <div className="text-[10px] uppercase tracking-widest text-red-300 font-bold">Ennemi</div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-b from-red-400 to-red-700 border-2 border-red-300 flex items-center justify-center text-3xl font-black text-white shadow-[0_4px_0_rgba(0,0,0,0.4)]">
                {eCrowns}
              </div>
            </div>
          </div>
        </div>

        {/* Rewards */}
        <Show when="signed-in">
          {reward && (
            <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-700 p-4 space-y-3 shadow-[0_8px_0_rgba(0,0,0,0.35)]">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold text-center">Récompenses</div>
              <div className="flex items-center justify-around text-sm font-bold">
                <div className="flex items-center gap-1.5 text-yellow-300">
                  <span className="text-xl">🪙</span><span>+{reward.goldGain}</span>
                </div>
                <div className="flex items-center gap-1.5 text-blue-300">
                  <span className="text-xs uppercase">XP</span><span>+{reward.xpGain}</span>
                </div>
                {reward.leveledUp && (
                  <div className="text-fuchsia-300 font-black animate-pulse">
                    Niv. {reward.newLevel} !
                  </div>
                )}
              </div>

              {reward.unlockedCard && CARDS[reward.unlockedCard] && (
                <div className="border-t border-slate-700 pt-3">
                  <div className="text-[10px] uppercase tracking-widest text-amber-300 mb-2 text-center font-bold">Nouvelle carte débloquée</div>
                  <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl p-2.5">
                    <img
                      src={CARDS[reward.unlockedCard].imagePath}
                      alt={CARDS[reward.unlockedCard].fullName}
                      className="w-14 h-14 rounded-lg object-cover object-top border-2 border-amber-400 shadow-[0_3px_0_rgba(0,0,0,0.4)]"
                    />
                    <div className="text-left flex-1 min-w-0">
                      <div className="font-black text-white truncate">{CARDS[reward.unlockedCard].fullName}</div>
                      <div className="text-xs text-amber-200 truncate">{CARDS[reward.unlockedCard].powerName}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Show>

        {/* Actions */}
        <div className="space-y-2">
          {isMP ? (
            <>
              <Link href="/lobby">
                <Button size="lg" className="w-full h-14 text-base font-bold bg-fuchsia-600 hover:bg-fuchsia-700 shadow-[0_6px_0_rgba(0,0,0,0.4)] active:translate-y-[3px] active:shadow-[0_3px_0_rgba(0,0,0,0.4)]" data-testid="button-back-to-lobby">
                  Retour au lobby
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full h-12 text-sm font-bold border-slate-600 text-slate-200 hover:bg-slate-800" data-testid="button-menu">
                  Menu principal
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/game">
                <Button size="lg" className="w-full h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 shadow-[0_6px_0_rgba(0,0,0,0.4)] active:translate-y-[3px] active:shadow-[0_3px_0_rgba(0,0,0,0.4)]" data-testid="button-play-again">
                  {isWin ? 'Rejouer' : 'Réessayer'}
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full h-12 text-sm font-bold border-slate-600 text-slate-200 hover:bg-slate-800" data-testid="button-menu">
                  Menu principal
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
