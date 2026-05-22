import { useState } from "react";
import { useMe } from "../hooks/useMe";
import CardTile from "../components/CardTile";
import CardDetailDialog from "../components/CardDetailDialog";
import { CARDS } from "../game/cards";
import PageHeader from "../components/PageHeader";

export default function Collection() {
  const { data: me, isLoading } = useMe();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  if (isLoading || !me) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Chargement…</div>;
  }

  const owned = new Set(me.cards.map((c) => c.cardId));
  const pct = Math.round((owned.size / me.allCards.length) * 100);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white pb-24 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-20%] w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-96 h-96 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md mx-auto px-4 space-y-4 relative">
        <PageHeader
          title="Collection"
          subtitle={`${owned.size} sur ${me.allCards.length} personnalités`}
        />

        {/* Progress bar */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-700/80 rounded-2xl p-3 shadow-[0_4px_0_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between mb-2 text-[10px] uppercase tracking-widest font-bold">
            <span className="text-slate-400">Progression</span>
            <span className="text-blue-300">{pct}%</span>
          </div>
          <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-fuchsia-500 to-rose-500 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur rounded-2xl p-4 border border-slate-700/80 shadow-[0_8px_0_rgba(0,0,0,0.4)]">
          <div className="grid grid-cols-4 gap-3 justify-items-center">
            {me.allCards.map((id) => (
              <div key={id} className="flex flex-col items-center gap-1">
                <CardTile
                  cardId={id}
                  locked={!owned.has(id)}
                  size="md"
                  onClick={() => setSelectedCard(id)}
                />
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

      <CardDetailDialog
        cardId={selectedCard}
        locked={selectedCard ? !owned.has(selectedCard) : false}
        onClose={() => setSelectedCard(null)}
      />
    </div>
  );
}
