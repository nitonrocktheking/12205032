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

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-50 p-4">
      <div className="text-center space-y-6 p-8 max-w-md w-full bg-slate-900 rounded-2xl border border-slate-700 shadow-[0_8px_0_rgba(0,0,0,0.4)]">
        <h1 className={`text-6xl font-black drop-shadow-[0_4px_0_rgba(0,0,0,0.5)] ${isWin ? 'text-blue-400' : isDraw ? 'text-slate-400' : 'text-red-400'}`}>
          {isWin ? 'VICTOIRE!' : isDraw ? 'ÉGALITÉ' : 'DÉFAITE!'}
        </h1>

        <div className="flex justify-center items-center gap-8 text-2xl font-bold">
          <div className="text-blue-400 flex flex-col items-center">
            <span className="text-xs uppercase tracking-widest">VOUS</span>
            <span className="text-5xl">{pCrowns}</span>
          </div>
          <div className="text-slate-500 text-lg">VS</div>
          <div className="text-red-400 flex flex-col items-center">
            <span className="text-xs uppercase tracking-widest">ENNEMI</span>
            <span className="text-5xl">{eCrowns}</span>
          </div>
        </div>

        <Show when="signed-in">
          {reward && (
            <div className="bg-slate-800/80 rounded-xl p-4 space-y-2 border border-slate-700">
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="text-yellow-300 font-bold">+{reward.goldGain} 🪙</span>
                <span className="text-blue-300 font-bold">+{reward.xpGain} XP</span>
                {reward.leveledUp && <span className="text-fuchsia-300 font-black animate-pulse">NIVEAU {reward.newLevel} !</span>}
              </div>
              {reward.unlockedCard && CARDS[reward.unlockedCard] && (
                <div className="pt-2">
                  <div className="text-[10px] uppercase tracking-widest text-yellow-300 mb-2">NOUVELLE CARTE !</div>
                  <div className="flex items-center justify-center gap-3">
                    <img
                      src={CARDS[reward.unlockedCard].imagePath}
                      alt={CARDS[reward.unlockedCard].fullName}
                      className="w-16 h-16 rounded-xl object-cover object-top border-2 border-yellow-400 shadow-[0_4px_0_rgba(0,0,0,0.4)]"
                    />
                    <div className="text-left">
                      <div className="font-black text-white">{CARDS[reward.unlockedCard].fullName}</div>
                      <div className="text-xs text-slate-400">{CARDS[reward.unlockedCard].powerName}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </Show>

        <Link href="/">
          <Button size="lg" className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-[0_4px_0_rgba(0,0,0,0.4)]" data-testid="button-play-again">
            {isWin ? 'REJOUER' : 'RÉESSAYER'}
          </Button>
        </Link>
      </div>
    </div>
  );
}
