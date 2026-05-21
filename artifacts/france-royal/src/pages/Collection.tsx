import { Link } from "wouter";
import { useMe } from "../hooks/useMe";
import CardTile from "../components/CardTile";
import { CARDS } from "../game/cards";
import { Button } from "@/components/ui/button";

export default function Collection() {
  const { data: me, isLoading } = useMe();

  if (isLoading || !me) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Chargement…</div>;
  }

  const owned = new Set(me.cards.map((c) => c.cardId));

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white p-4 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/"><Button variant="ghost" className="text-slate-300">← Retour</Button></Link>
          <h1 className="text-2xl font-black">COLLECTION</h1>
          <div className="text-xs text-slate-400">{owned.size}/{me.allCards.length}</div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700 shadow-[0_8px_0_rgba(0,0,0,0.4)]">
          <div className="grid grid-cols-4 gap-3 justify-items-center">
            {me.allCards.map((id) => (
              <div key={id} className="flex flex-col items-center gap-1">
                <CardTile cardId={id} locked={!owned.has(id)} size="md" />
                <div className="text-[10px] text-slate-400 text-center max-w-[80px] truncate font-medium">
                  {CARDS[id]?.fullName}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500 text-center">
          Gagnez des matchs pour débloquer de nouvelles personnalités !
        </div>
      </div>
    </div>
  );
}
