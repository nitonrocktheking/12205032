import { CARDS } from "../game/cards";

interface Props {
  cardId: string;
  locked?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  showCost?: boolean;
}

const sizes = {
  sm: "w-16 h-24",
  md: "w-20 h-28",
  lg: "w-24 h-32",
};

export default function CardTile({ cardId, locked, selected, onClick, size = "md", showCost = true }: Props) {
  const card = CARDS[cardId];
  if (!card) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked && !onClick}
      data-testid={`card-tile-${cardId}`}
      className={`relative ${sizes[size]} rounded-xl overflow-hidden transition-all shrink-0
        border-2 ${selected ? "border-yellow-400 scale-105" : "border-slate-700"}
        ${locked ? "opacity-40 grayscale cursor-not-allowed" : "hover:scale-105 cursor-pointer"}
        shadow-[0_4px_0_rgba(0,0,0,0.4)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.4)]`}
      style={{
        background: `linear-gradient(155deg, ${card.color} 0%, #0f172a 100%)`,
      }}
    >
      {card.imagePath ? (
        <img
          src={card.imagePath}
          alt={card.fullName}
          className="absolute inset-0 w-full h-full object-cover object-top"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-black text-white/95 drop-shadow-[0_2px_3px_rgba(0,0,0,0.7)] tracking-tight leading-none text-center px-1"
            style={{ fontSize: size === "lg" ? 22 : size === "md" ? 18 : 15 }}
          >
            {card.label}
          </span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-1 pt-2 pb-1">
        <div className="text-[10px] font-black text-white truncate text-center">{card.label}</div>
      </div>
      {showCost && (
        <div className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-fuchsia-600 border border-white text-white text-[10px] font-black flex items-center justify-center shadow">
          {card.cost}
        </div>
      )}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
      )}
    </button>
  );
}
