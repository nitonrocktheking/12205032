import { CardDef } from "../game/types";
import { motion } from "framer-motion";

export default function CardHand({ 
  hand, 
  nextCard, 
  elixir, 
  selected, 
  onSelect 
}: { 
  hand: CardDef[], 
  nextCard: CardDef | null, 
  elixir: number,
  selected: number | null,
  onSelect: (idx: number) => void
}) {
  return (
    <div className="bg-slate-900 border-t border-slate-700 px-2 pt-2 pb-3">
      <div className="flex justify-between items-end gap-2">
        {/* Next Card Preview */}
        <div className="w-14 shrink-0 flex flex-col items-center gap-1">
          <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Suivant</span>
          {nextCard && (
            <div 
              className="w-14 h-16 rounded-lg overflow-hidden border border-slate-600 relative flex items-end justify-center"
              style={{ background: `linear-gradient(to bottom, ${nextCard.color}99, ${nextCard.color})` }}
            >
              {nextCard.imagePath ? (
                <img src={nextCard.imagePath} alt={nextCard.fullName} className="absolute inset-0 w-full h-full object-cover object-top opacity-80" />
              ) : (
                <span className="text-xs font-bold text-white z-10">{nextCard.label}</span>
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
                    ? 'ring-2 ring-blue-400 shadow-[0_0_18px_rgba(59,130,246,0.6)]' 
                    : canAfford 
                      ? 'ring-1 ring-slate-600 hover:ring-slate-400' 
                      : 'ring-1 ring-slate-800 opacity-50 grayscale'
                  }
                `}
                style={{ width: 68, height: 96, background: `linear-gradient(to bottom, ${card.color}dd, ${card.color})` }}
                onClick={() => canAfford && onSelect(idx)}
                data-testid={`card-${card.id}`}
                animate={{ y: isSelected ? -12 : 0, scale: isSelected ? 1.05 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {/* Elixir cost diamond */}
                <div className="absolute top-1 right-1 z-20 w-5 h-5 rotate-45 bg-fuchsia-600 border border-fuchsia-400 flex items-center justify-center shadow">
                  <span className="-rotate-45 text-white font-black text-[10px]">{card.cost}</span>
                </div>

                {/* Portrait image */}
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
                  {/* Dark gradient overlay at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/80 to-transparent" />
                </div>

                {/* Card info footer */}
                <div className="bg-black/70 px-1 py-0.5 text-center">
                  <div className="text-[9px] font-black text-white leading-tight truncate">{card.fullName}</div>
                  <div 
                    className="text-[8px] font-bold leading-tight truncate mt-0.5"
                    style={{ color: card.color === '#1e293b' ? '#94a3b8' : `${card.color}dd` }}
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
