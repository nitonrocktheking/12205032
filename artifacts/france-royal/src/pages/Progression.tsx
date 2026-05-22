import { Link } from "wouter";
import { ArrowLeft, Lock, Check, Trophy, Sparkles } from "lucide-react";
import { useMe, type ProgressionEntry } from "../hooks/useMe";
import { CARDS } from "../game/cards";
import { Button } from "@/components/ui/button";

const XP_PER_WIN = 30;

interface Row {
  entry: ProgressionEntry;
  status: "owned" | "next" | "locked";
  winsAway: number;
  xpAway: number;
}

export default function Progression() {
  const { data: me, isLoading } = useMe();

  if (isLoading || !me) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-300">
        Chargement…
      </div>
    );
  }

  const { profile, progression } = me;
  const ownedSet = new Set(me.cards.map((c) => c.cardId));
  const currentLevel = profile.level;
  const xpIntoLevel = progression.xpIntoLevel;
  const xpPerLevel  = progression.xpPerLevel;
  const xpPct       = Math.min(100, (xpIntoLevel / xpPerLevel) * 100);

  // Build the row list — every unlockable card with its status.
  const nextLockedLevel = progression.schedule.find(
    (e) => !ownedSet.has(e.cardId),
  )?.level ?? Infinity;

  const rows: Row[] = progression.schedule.map((entry) => {
    const isOwned = ownedSet.has(entry.cardId);
    const status: Row["status"] = isOwned
      ? "owned"
      : entry.level === nextLockedLevel ? "next" : "locked";
    const xpAway   = Math.max(0, entry.xpRequired - profile.xp);
    const winsAway = Math.ceil(xpAway / XP_PER_WIN);
    return { entry, status, winsAway, xpAway };
  });

  const ownedCount  = rows.filter((r) => r.status === "owned").length;
  const totalCount  = rows.length;

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-50 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-[24rem] h-[24rem] bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[24rem] h-[24rem] bg-fuchsia-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-300 hover:text-white hover:bg-slate-800"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 text-center">
            <div className="text-[10px] uppercase tracking-[0.3em] text-amber-300/80 font-black">
              Arbre de progression
            </div>
            <h1 className="text-2xl font-black text-white">Niveaux & cartes</h1>
          </div>
          <div className="w-9" />
        </div>

        {/* Level summary card */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900/95 to-slate-800/80 p-4 shadow-[0_6px_0_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              <div
                className="absolute inset-0 rounded-full p-[3px]"
                style={{
                  background: `conic-gradient(from -90deg, #f59e0b 0%, #ec4899 ${xpPct}%, rgba(255,255,255,0.08) ${xpPct}%, rgba(255,255,255,0.08) 100%)`,
                }}
              >
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-black text-white text-xl shadow-inner">
                  {currentLevel}
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Niveau {currentLevel}
              </div>
              <div className="text-sm font-black text-white">
                {Math.round(xpIntoLevel)} / {xpPerLevel} XP
              </div>
              <div className="mt-2 h-2.5 w-full rounded-full bg-slate-800 overflow-hidden border border-slate-700/60">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 transition-all"
                  style={{ width: `${xpPct}%` }}
                  data-testid="bar-xp"
                />
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-1">
                {Math.max(0, xpPerLevel - Math.round(xpIntoLevel))} XP avant Niv. {currentLevel + 1}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <Stat label="Collectées" value={`${ownedCount + me.starterCards.length}/${totalCount + me.starterCards.length}`} />
            <Stat label="Victoires" value={String(profile.wins)} icon={<Trophy className="w-3 h-3" />} />
            <Stat label="XP total" value={String(Math.round(profile.xp))} />
          </div>
        </div>

        {/* Tree */}
        <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 backdrop-blur-md p-3 shadow-[0_4px_0_rgba(0,0,0,0.4)]">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3 flex items-center gap-2 px-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Cartes à débloquer
          </div>

          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[27px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-emerald-500/60 via-amber-500/40 to-slate-700/40" />

            <ol className="space-y-2.5">
              {rows.map((row) => (
                <ProgressionRow key={row.entry.cardId} row={row} />
              ))}
            </ol>
          </div>
        </div>

        <div className="pb-4" />
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-800/70 border border-slate-700/60 px-2 py-2">
      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
        {label}
      </div>
      <div className="text-sm font-black text-white inline-flex items-center gap-1 justify-center mt-0.5">
        {icon}{value}
      </div>
    </div>
  );
}

function ProgressionRow({ row }: { row: Row }) {
  const { entry, status, winsAway, xpAway } = row;
  const card = CARDS[entry.cardId];
  if (!card) return null;

  const isOwned  = status === "owned";
  const isNext   = status === "next";

  const nodeBg =
    isOwned ? "bg-gradient-to-br from-emerald-500 to-emerald-700 border-emerald-300"
    : isNext ? "bg-gradient-to-br from-amber-400 to-orange-600 border-amber-200 animate-pulse"
    :          "bg-gradient-to-br from-slate-700 to-slate-900 border-slate-600";

  return (
    <li className="relative flex items-center gap-3" data-testid={`row-progression-${entry.cardId}`}>
      {/* Level node */}
      <div
        className={`relative z-10 w-[56px] h-[56px] shrink-0 rounded-full border-2 ${nodeBg} flex flex-col items-center justify-center shadow-[0_3px_0_rgba(0,0,0,0.4)]`}
      >
        {isOwned ? (
          <Check className="w-5 h-5 text-white" />
        ) : isNext ? (
          <span className="text-[10px] font-black text-slate-900 uppercase">Prochain</span>
        ) : (
          <Lock className="w-4 h-4 text-slate-300" />
        )}
        <span className={`text-[10px] font-black ${isOwned ? "text-emerald-100" : isNext ? "text-slate-900" : "text-slate-300"}`}>
          Niv.{entry.level}
        </span>
      </div>

      {/* Card preview row */}
      <div
        className={`flex-1 flex items-center gap-3 rounded-xl border p-2 transition
          ${isOwned ? "border-emerald-700/40 bg-emerald-900/20"
            : isNext ? "border-amber-500/60 bg-amber-500/10 shadow-[0_0_18px_rgba(245,158,11,0.25)]"
            : "border-slate-700/60 bg-slate-800/40"}`}
      >
        <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-slate-700">
          <img
            src={card.imagePath}
            alt={card.fullName}
            className={`w-full h-full object-cover ${isOwned ? "" : "grayscale brightness-50"}`}
          />
          {!isOwned && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Lock className="w-4 h-4 text-slate-200" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-black truncate ${isOwned ? "text-emerald-100" : isNext ? "text-amber-100" : "text-slate-300"}`}>
            {card.fullName}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold truncate">
            {card.powerName}
          </div>
          {!isOwned && (
            <div className={`text-[10px] font-bold mt-0.5 ${isNext ? "text-amber-300" : "text-slate-400"}`}>
              Encore {xpAway} XP · ≈ {winsAway} victoire{winsAway > 1 ? "s" : ""}
            </div>
          )}
          {isOwned && (
            <div className="text-[10px] font-bold mt-0.5 text-emerald-300">
              Débloquée
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-fuchsia-600/80 border border-fuchsia-300 text-white font-black text-sm shadow-[0_2px_0_rgba(0,0,0,0.4)]">
            {card.cost}
          </div>
        </div>
      </div>
    </li>
  );
}
