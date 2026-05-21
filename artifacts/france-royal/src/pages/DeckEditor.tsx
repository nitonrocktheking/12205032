import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMe, useSaveDeck, useSelectDeck, getSelectedDeck } from "../hooks/useMe";
import CardTile from "../components/CardTile";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DeckEditor() {
  const { data: me, isLoading } = useMe();
  const saveDeck   = useSaveDeck();
  const selectDeck = useSelectDeck();

  const [slot, setSlot] = useState(0);
  const [deck, setDeck] = useState<string[]>([]);

  useEffect(() => {
    if (!me) return;
    setSlot(me.profile.selectedDeckSlot);
    const current = me.decks.find((d) => d.slot === me.profile.selectedDeckSlot);
    setDeck(current?.cardIds ?? getSelectedDeck(me));
  }, [me]);

  if (isLoading || !me) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Chargement…</div>;
  }

  const owned = me.cards.map((c) => c.cardId);
  const inDeck = new Set(deck);

  const switchSlot = (s: number) => {
    setSlot(s);
    const d = me.decks.find((x) => x.slot === s);
    setDeck(d?.cardIds ?? []);
  };

  const removeFromDeck = (id: string) => {
    setDeck(deck.filter((c) => c !== id));
  };

  const addToDeck = (id: string) => {
    if (inDeck.has(id)) return;
    if (deck.length >= 8) { toast.error("Le deck est plein (8 cartes max)"); return; }
    setDeck([...deck, id]);
  };

  const onSave = async () => {
    if (deck.length !== 8) { toast.error("Il faut exactement 8 cartes."); return; }
    try {
      await saveDeck.mutateAsync({ slot, cardIds: deck });
      await selectDeck.mutateAsync(slot);
      toast.success("Deck sauvegardé !");
    } catch (e: any) {
      toast.error(e?.message || "Erreur de sauvegarde");
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white p-4 pb-24">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/"><Button variant="ghost" className="text-slate-300">← Retour</Button></Link>
          <h1 className="text-2xl font-black">DECK</h1>
          <div className="w-16" />
        </div>

        <div className="flex gap-2 justify-center">
          {[0, 1, 2].map((s) => (
            <button
              key={s}
              onClick={() => switchSlot(s)}
              data-testid={`deck-slot-${s}`}
              className={`px-4 py-2 rounded-lg font-bold text-sm border-2 transition-all
                ${slot === s
                  ? "bg-blue-600 border-blue-400 text-white shadow-[0_4px_0_rgba(0,0,0,0.4)]"
                  : "bg-slate-800 border-slate-700 text-slate-300"}`}
            >
              Deck {s + 1}
            </button>
          ))}
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-3 border border-slate-700 shadow-[0_8px_0_rgba(0,0,0,0.4)]">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 text-center">
            Votre deck ({deck.length}/8) — cliquez pour retirer
          </div>
          <div className="grid grid-cols-4 gap-2 justify-items-center min-h-[120px]">
            {deck.map((id) => (
              <CardTile key={id} cardId={id} size="sm" onClick={() => removeFromDeck(id)} />
            ))}
            {Array.from({ length: 8 - deck.length }).map((_, i) => (
              <div key={`empty-${i}`} className="w-16 h-24 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/50" />
            ))}
          </div>
        </div>

        <Button
          onClick={onSave}
          disabled={saveDeck.isPending || deck.length !== 8}
          className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 shadow-[0_4px_0_rgba(0,0,0,0.4)]"
          data-testid="button-save-deck"
        >
          {saveDeck.isPending ? "Sauvegarde…" : "SAUVEGARDER LE DECK"}
        </Button>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-3 border border-slate-700">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 text-center">
            Vos cartes ({owned.length}) — cliquez pour ajouter
          </div>
          <div className="grid grid-cols-4 gap-2 justify-items-center">
            {owned.map((id) => (
              <div key={id} className={inDeck.has(id) ? "opacity-30 pointer-events-none" : ""}>
                <CardTile cardId={id} size="sm" onClick={() => addToDeck(id)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
