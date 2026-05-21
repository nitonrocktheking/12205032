import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function Results() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const winner = searchParams.get('winner');
  const pCrowns = searchParams.get('pCrowns');
  const eCrowns = searchParams.get('eCrowns');

  const isWin = winner === 'player';
  const isDraw = winner === 'draw';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-slate-50">
      <div className="text-center space-y-8 p-8 max-w-md w-full bg-slate-800 rounded-2xl">
        <h1 className={`text-6xl font-black ${isWin ? 'text-blue-400' : isDraw ? 'text-slate-400' : 'text-red-400'}`}>
          {isWin ? 'VICTOIRE!' : isDraw ? 'ÉGALITÉ' : 'DÉFAITE!'}
        </h1>

        <div className="flex justify-center items-center gap-8 text-3xl font-bold">
          <div className="text-blue-400 flex flex-col items-center">
            <span>VOUS</span>
            <span className="text-5xl">{pCrowns}</span>
          </div>
          <div className="text-slate-500 text-xl">VS</div>
          <div className="text-red-400 flex flex-col items-center">
            <span>ENNEMI</span>
            <span className="text-5xl">{eCrowns}</span>
          </div>
        </div>

        <Link href="/">
          <Button size="lg" className="w-full h-14 text-lg font-bold bg-slate-700 hover:bg-slate-600 mt-8" data-testid="button-play-again">
            {isWin ? 'REJOUER' : 'RÉESSAYER'}
          </Button>
        </Link>
      </div>
    </div>
  );
}
