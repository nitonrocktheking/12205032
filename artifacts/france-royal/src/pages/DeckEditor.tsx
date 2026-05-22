import { useEffect, useState } from "react";
import { useMe, useSaveDeck, useSelectDeck, getSelectedDeck } from "../hooks/useMe";
import CardTile from "../components/CardTile";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PageHeader from "../components/PageHeader";
import { Save } from "lucide-react";
import { useT } from "../hooks/useT";

export default function DeckEditor() {
  const { t } = useT();
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
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">{t("common.loading")}</div>;
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
    if (deck.length >= 8) { toast.error(t("deck.toast_full")); return; }
    setDeck([...deck, id]);
  };

  const onSave = async () => {
    if (deck.length !== 8) { toast.error(t("deck.toast_exact_8")); return; }
    try {
      await saveDeck.mutateAsync({ slot, cardIds: deck });
      await selectDeck.mutateAsync(slot);
      toast.success(t("deck.toast_save_ok"));
    } catch (e: any) {
      toast.error(e?.message || t("deck.toast_save_err"));
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white pb-24 relative overflow-hidden">
      <div className="absolute top-[-15%] right-[-15%] w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-15%] w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md mx-auto px-4 space-y-4 relative">
        <PageHeader title={t("deck.title")} subtitle={t("deck.slot_n_active", { n: slot + 1 })} />

        <div className="flex gap-2 justify-center">
          {[0, 1, 2].map((s) => (
            <button
              key={s}
              onClick={() => switchSlot(s)}
              data-testid={`deck-slot-${s}`}
              className={`flex-1 max-w-[110px] px-4 py-2 rounded-xl font-black text-sm border-2 transition-all uppercase tracking-wider
                ${slot === s
                  ? "bg-gradient-to-b from-blue-500 to-blue-700 border-blue-300 text-white shadow-[0_4px_0_rgba(0,0,0,0.4),0_0_18px_rgba(59,130,246,0.4)]"
                  : "bg-slate-800/70 backdrop-blur border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 shadow-[0_3px_0_rgba(0,0,0,0.4)]"}`}
            >
              {t("deck.deck_label", { n: s + 1 })}
            </button>
          ))}
        </div>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur rounded-2xl p-3 border border-slate-700/80 shadow-[0_8px_0_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t("deck.your_deck")}</div>
            <div className="text-[10px] font-black">
              <span className={deck.length === 8 ? "text-emerald-300" : "text-amber-300"}>{deck.length}</span>
              <span className="text-slate-500">/8</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 justify-items-center min-h-[120px]">
            {deck.map((id) => (
              <CardTile key={id} cardId={id} size="sm" onClick={() => removeFromDeck(id)} />
            ))}
            {Array.from({ length: 8 - deck.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="w-16 h-24 rounded-xl border-2 border-dashed border-slate-700/80 bg-slate-900/40 flex items-center justify-center text-slate-700 text-2xl font-black"
              >
                +
              </div>
            ))}
          </div>
          <div className="text-[10px] text-slate-500 mt-2 text-center italic">{t("deck.click_to_remove")}</div>
        </div>

        <Button
          onClick={onSave}
          disabled={saveDeck.isPending || deck.length !== 8}
          className="w-full h-12 text-base font-black uppercase tracking-wide bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:from-slate-700 disabled:to-slate-800 disabled:opacity-60 shadow-[0_4px_0_rgba(0,0,0,0.4),0_0_20px_rgba(16,185,129,0.3)] disabled:shadow-[0_4px_0_rgba(0,0,0,0.4)] border border-emerald-400/30 active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.4)]"
          data-testid="button-save-deck"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveDeck.isPending ? t("deck.saving") : t("deck.save_button")}
        </Button>

        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur rounded-2xl p-3 border border-slate-700/80">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-2 text-center font-bold">
            {t("deck.your_cards_count", { n: owned.length })}
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
