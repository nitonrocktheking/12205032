import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Menu() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-slate-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="text-center z-10 space-y-8 p-8 max-w-md bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl">
        <div className="space-y-4">
          <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-slate-50 to-red-400">
            FRANCE<br />ROYAL
          </h1>
          <p className="text-lg text-slate-400 font-medium">L'Assemblée Nationale meets the Arena.</p>
        </div>

        <div className="space-y-4 text-sm text-slate-300 text-left bg-slate-800/50 p-4 rounded-lg">
          <h3 className="font-bold text-white mb-2 uppercase tracking-wider text-xs">Comment jouer :</h3>
          <ul className="list-disc pl-4 space-y-2">
            <li>Glissez des cartes pour déployer vos figures politiques.</li>
            <li>Détruisez la Tour du Roi ennemie pour gagner.</li>
            <li>L'élixir se recharge au fil du temps.</li>
            <li>Chaque personnalité a ses propres pouvoirs!</li>
          </ul>
        </div>

        <Link href="/game">
          <Button size="lg" className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all transform hover:scale-105" data-testid="button-start-game">
            ENTRER DANS L'ARÈNE
          </Button>
        </Link>
      </div>
    </div>
  );
}
