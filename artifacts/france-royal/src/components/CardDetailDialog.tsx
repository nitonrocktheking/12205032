import { CARDS } from "../game/cards";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Heart, Sword, Zap, Crosshair, Timer, Circle, Coins, Sparkles, Lock, type LucideIcon } from "lucide-react";
import { useT } from "../hooks/useT";

interface Props {
  cardId: string | null;
  locked: boolean;
  onClose: () => void;
}

function StatRow({ icon: Icon, label, value, color = "#cbd5e1" }: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between bg-slate-900/70 border border-slate-700/80 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        {label}
      </div>
      <div className="font-black text-white text-sm">{value}</div>
    </div>
  );
}

export default function CardDetailDialog({ cardId, locked, onClose }: Props) {
  const { t, ct } = useT();
  const card = cardId ? CARDS[cardId] : null;
  const open = !!card;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-slate-950 border border-slate-700 text-white max-w-sm p-0 overflow-hidden">
        <DialogTitle className="sr-only">{card?.fullName ?? t("card_detail.card_fallback")}</DialogTitle>
        <DialogDescription className="sr-only">{card ? ct(card, "powerName") : ""}</DialogDescription>
        {card && (
          <div className="flex flex-col">
            {/* Header banner with image */}
            <div
              className="relative h-44 overflow-hidden"
              style={{ background: `linear-gradient(155deg, ${card.color} 0%, #0f172a 100%)` }}
            >
              {card.imagePath && (
                <img
                  src={card.imagePath}
                  alt={card.fullName}
                  className={`absolute inset-0 w-full h-full object-cover object-top ${locked ? "grayscale opacity-50" : ""}`}
                  draggable={false}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
              {/* Cost badge */}
              <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 h-9 rounded-xl bg-fuchsia-600 border-2 border-white text-white font-black text-base shadow-[0_3px_0_rgba(0,0,0,0.4)]">
                <Coins className="w-4 h-4" />
                {card.cost}
              </div>
              {locked && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 text-white text-xs font-black uppercase tracking-widest">
                    <Lock className="w-3.5 h-3.5" />
                    {t("card_detail.locked")}
                  </div>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 px-4 py-3">
                <div className="text-[10px] uppercase tracking-widest text-white/70 font-bold">{ct(card, "name")}</div>
                <h2 className="text-2xl font-black text-white drop-shadow leading-tight">{card.fullName}</h2>
              </div>
            </div>

            {/* Power description */}
            <div className="px-4 pt-3 pb-2">
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-amber-300 text-[10px] uppercase tracking-widest font-black mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {ct(card, "powerName")}
                </div>
                <p className="text-slate-200 text-sm leading-snug">{ct(card, "powerDesc")}</p>
              </div>
            </div>

            {/* Stats grid (mirrors what's used in the engine) */}
            <div className="px-4 pb-4 grid grid-cols-2 gap-2">
              <StatRow icon={Heart}     label={t("card_detail.hp")}      value={card.baseHp || "—"}    color="#f87171" />
              <StatRow icon={Sword}     label={t("card_detail.damage")}  value={card.baseDamage || "—"} color="#fb923c" />
              <StatRow icon={Zap}       label={t("card_detail.speed")}   value={card.speed || "—"}     color="#60a5fa" />
              <StatRow icon={Crosshair} label={t("card_detail.range")}   value={card.range || "—"}     color="#a78bfa" />
              <StatRow icon={Timer}     label={t("card_detail.cadence")} value={card.attackSpeed ? `${card.attackSpeed}s` : "—"} color="#34d399" />
              <StatRow icon={Circle}    label={t("card_detail.units")}   value={card.spawnCount || t("card_detail.spell")} color="#fbbf24" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
