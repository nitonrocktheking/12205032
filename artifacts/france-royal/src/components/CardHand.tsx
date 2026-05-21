import { CardDef } from "../game/types";
import { motion, AnimatePresence } from "framer-motion";

function CardTooltip({ card }: { card: CardDef }) {
  return (
    <motion.div
      key={card.id}
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="absolute bottom-full left-0 right-0 mb-2 mx-2 z-50 pointer-events-none"
    >
      <div
        className="rounded-xl overflow-hidden border border-white/10 shadow-2xl"
        style={{ background: `linear-gradient(135deg, #0f172a, ${card.color}55)` }}
      >
        <div className="flex gap-3 p-3">
          {/* Portrait */}
          <div
            className="shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 border-white/20 relative"
            style={{ background: card.color }}
          >
            {card.imagePath && (
              <img
                src={card.imagePath}
                alt={card.fullName}
                className="absolute inset-0 w-full h-full object-cover object-top"
              />
            )}
            {/* Cost badge */}
            <div className="absolute top-1 left-1 w-5 h-5 rotate-45 bg-fuchsia-600 border border-fuchsia-400 flex items-center justify-center shadow z-10">
              <span className="-rotate-45 text-white font-black text-[10px]">{card.cost}</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Names */}
            <div className="font-black text-white text-sm leading-tight">{card.fullName}</div>
            <div className="text-[10px] text-slate-400 mb-2 font-medium">{card.name}</div>

            {/* Power badge */}
            <div
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 mb-2"
              style={{ background: `${card.color}44`, border: `1px solid ${card.color}88` }}
            >
              <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: '#fff' }}>
                {card.powerName}
              </span>
            </div>

            {/* Description */}
            <div className="text-[10px] text-slate-300 leading-snug">{card.powerDesc}</div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex border-t border-white/10">
          <StatPill label="PV" value={card.baseHp} color="#4ade80" />
          <StatPill label="DGT" value={card.baseDamage} color="#f87171" />
          <StatPill label="VIT" value={card.speed} color="#60a5fa" />
          <StatPill label="ATK/s" value={+(1 / card.attackSpeed).toFixed(1)} color="#fbbf24" />
        </div>
      </div>
    </motion.div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 flex flex-col items-center py-1.5 border-r border-white/10 last:border-r-0">
      <span className="text-[8px] text-slate-400 uppercase tracking-wide font-bold">{label}</span>
      <span className="text-xs font-black" style={{ color }}>{value}</span>
    </div>
  );
}

export default function CardHand({
  hand,
  nextCard,
  elixir,
  selected,
  onSelect,
}: {
  hand: CardDef[];
  nextCard: CardDef | null;
  elixir: number;
  selected: number | null;
  onSelect: (idx: number | null) => void;
}) {
  const selectedCard = selected !== null ? hand[selected] : null;

  return (
    <div className="bg-slate-900 border-t border-slate-700 px-2 pt-2 pb-3 relative">
      {/* Tooltip — shown above the hand when a card is selected */}
      <AnimatePresence mode="wait">
        {selectedCard && <CardTooltip card={selectedCard} />}
      </AnimatePresence>

      <div className="flex justify-between items-end gap-2">
        {/* Next Card Preview */}
        <div className="w-14 shrink-0 flex flex-col items-center gap-1">
          <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Suivant</span>
          {nextCard && (
            <div
              className="w-14 h-16 rounded-lg overflow-hidden border border-slate-600 relative"
              style={{ background: `linear-gradient(to bottom, ${nextCard.color}99, ${nextCard.color})` }}
            >
              {nextCard.imagePath ? (
                <img
                  src={nextCard.imagePath}
                  alt={nextCard.fullName}
                  className="absolute inset-0 w-full h-full object-cover object-top opacity-80"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{nextCard.label}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center py-0.5 z-10">
                <span className="text-[8px] text-white font-bold">{nextCard.label}</span>
              </div>
            </div>
          )}
        </div>

        {/* Hand cards */}
        <div className="flex flex-1 justify-center gap-2">
          {hand.map((card, idx) => {
            const canAfford = elixir >= card.cost;
            const isSelected = selected === idx;

            return (
              <motion.div
                key={`${idx}-${card.id}`}
                className={`relative rounded-xl overflow-hidden cursor-pointer flex flex-col
                  ${isSelected
                    ? 'ring-2 ring-blue-400 shadow-[0_0_18px_rgba(59,130,246,0.7)]'
                    : canAfford
                      ? 'ring-1 ring-slate-600 hover:ring-slate-400'
                      : 'ring-1 ring-slate-800 opacity-45 grayscale'
                  }
                `}
                style={{
                  width: 68,
                  height: 96,
                  background: `linear-gradient(to bottom, ${card.color}dd, ${card.color})`,
                }}
                onClick={() => {
                  if (!canAfford) return;
                  onSelect(isSelected ? null : idx);
                }}
                data-testid={`card-${card.id}`}
                animate={{ y: isSelected ? -14 : 0, scale: isSelected ? 1.06 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                {/* Elixir cost diamond */}
                <div className="absolute top-1 right-1 z-20 w-5 h-5 rotate-45 bg-fuchsia-600 border border-fuchsia-400 flex items-center justify-center shadow">
                  <span className="-rotate-45 text-white font-black text-[10px]">{card.cost}</span>
                </div>

                {/* Portrait */}
                <div className="flex-1 relative overflow-hidden">
                  {card.imagePath ? (
                    <img
                      src={card.imagePath}
                      alt={card.fullName}
                      className="absolute inset-0 w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-black text-white/80">{card.label}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/80 to-transparent" />
                </div>

                {/* Footer */}
                <div className="bg-black/70 px-1 py-0.5 text-center">
                  <div className="text-[9px] font-black text-white leading-tight truncate">
                    {card.fullName}
                  </div>
                  <div
                    className="text-[8px] font-bold leading-tight truncate mt-0.5"
                    style={{ color: card.color === '#1e3a5f' ? '#93c5fd' : `${card.color}ee` }}
                  >
                    {card.powerName}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
