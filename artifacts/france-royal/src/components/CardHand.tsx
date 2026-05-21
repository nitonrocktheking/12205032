import { CardDef } from "../game/types";
import { MAX_ELIXIR } from "../game/constants";
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
    <div className="bg-slate-900 border-t border-slate-800 p-2 pb-safe">
      <div className="flex justify-between items-end gap-2 px-1">
        {/* Next Card Preview */}
        <div className="w-12 h-16 bg-slate-800 rounded flex flex-col items-center justify-center border border-slate-700 opacity-70 shrink-0">
          <span className="text-[10px] text-slate-400 uppercase font-bold mb-1">SUIVANT</span>
          {nextCard && (
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-slate-600" style={{ backgroundColor: nextCard.color }}>
              {nextCard.label}
            </div>
          )}
        </div>

        {/* Hand */}
        <div className="flex flex-1 justify-center gap-2">
          {hand.map((card, idx) => {
            const canAfford = elixir >= card.cost;
            const isSelected = selected === idx;
            
            return (
              <motion.div
                key={`${idx}-${card.id}`}
                className={`relative w-20 h-28 rounded-lg border-2 flex flex-col items-center pt-2 transition-colors cursor-pointer
                  ${isSelected ? 'border-blue-400 bg-blue-900/50 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 
                    canAfford ? 'border-slate-600 bg-slate-800 hover:border-slate-500' : 'border-slate-800 bg-slate-900 opacity-50 grayscale'}
                `}
                onClick={() => canAfford && onSelect(idx)}
                data-testid={`card-${card.id}`}
                animate={{ y: isSelected ? -10 : 0 }}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 border-slate-600 shadow-inner mb-2"
                  style={{ backgroundColor: card.color }}
                >
                  {card.label}
                </div>
                
                <span className="text-[10px] font-bold text-slate-300 text-center leading-tight px-1 uppercase line-clamp-2">
                  {card.name}
                </span>

                <div className="absolute -top-3 -left-3 w-6 h-6 rotate-45 bg-fuchsia-600 flex items-center justify-center shadow-md">
                  <span className="-rotate-45 text-white font-bold text-xs">{card.cost}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
