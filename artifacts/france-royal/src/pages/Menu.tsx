import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Show } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { useMe, getSelectedDeck } from "../hooks/useMe";
import CardTile from "../components/CardTile";
import { getArenaForLevel, getNextArena } from "../game/arenas";
import LogoutButton from "../components/LogoutButton";
import { SPLASH_SEEN_KEY } from "./Splash";
import { Swords, Globe2, Library, Layers, Coins, Trophy, HelpCircle } from "lucide-react";

function UserBar() {
  const { data: me } = useMe();
  if (!me) return null;

  const xpForLevel = (lvl: number) => 100 + (lvl - 1) * 50;
  const xpNeeded = xpForLevel(me.profile.level);
  const xpPct = Math.min(100, (me.profile.xp / xpNeeded) * 100);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900/95 to-slate-800/80 backdrop-blur-md p-3 shadow-[0_6px_0_rgba(0,0,0,0.4)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Level avatar with rotating ring */}
          <div className="relative w-12 h-12 shrink-0">
            <div
              className="absolute inset-0 rounded-full p-[2px]"
              style={{
                background: `conic-gradient(from -90deg, #3b82f6 0%, #a855f7 ${xpPct}%, rgba(255,255,255,0.08) ${xpPct}%, rgba(255,255,255,0.08) 100%)`,
              }}
            >
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-black text-white text-base shadow-inner">
                {me.profile.level}
              </div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-black text-white text-sm leading-tight truncate" data-testid="text-username">
              {me.profile.displayName ?? `Niveau ${me.profile.level}`}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-0.5">
              <span>Niv. {me.profile.level}</span>
              <span className="text-slate-600">·</span>
              <span className="inline-flex items-center gap-0.5 text-emerald-300">
                <Trophy className="w-3 h-3" />{me.profile.wins}V
              </span>
              <span className="text-slate-600">·</span>
              <span>{me.profile.losses}D</span>
              <span className="text-slate-600">·</span>
              <span>{Math.round(me.profile.xp)}/{xpNeeded} XP</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-black text-sm shadow-[0_3px_0_rgba(0,0,0,0.4)]">
            <Coins className="w-3.5 h-3.5" />
            <span data-testid="text-gold">{me.profile.gold}</span>
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

function ArenaBadge() {
  const { data: me } = useMe();
  if (!me) return null;
  const arena = getArenaForLevel(me.profile.level);
  const next = getNextArena(me.profile.level);
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/15 shadow-[0_4px_0_rgba(0,0,0,0.4)]"
      style={{ background: `linear-gradient(135deg, ${arena.grassTop}, ${arena.grassBottom})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/40 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
      <div className="relative p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.6)] shrink-0">{arena.emoji}</span>
          <div className="text-left min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-white/80 font-bold">Arène actuelle</div>
            <div className="text-sm font-black text-white drop-shadow truncate">{arena.name}</div>
          </div>
        </div>
        {next && (
          <div className="text-right text-[10px] text-white/90 font-bold shrink-0 bg-black/25 rounded-lg px-2 py-1 backdrop-blur-sm">
            <div className="uppercase tracking-wider text-white/70">Suivante</div>
            <div className="text-sm">{next.emoji} Niv. {next.minLevel}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function DeckPreview() {
  const { data: me } = useMe();
  if (!me) return null;
  const deck = getSelectedDeck(me);
  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-[0_4px_0_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold inline-flex items-center gap-1.5">
          <Layers className="w-3 h-3" /> Deck actif
        </div>
        <Link href="/deck">
          <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold hover:text-blue-300 hover:underline cursor-pointer">
            Modifier →
          </span>
        </Link>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {deck.slice(0, 8).map((id) => (
          <div key={id} className="shrink-0">
            <CardTile cardId={id} size="sm" showCost={false} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Menu() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    try {
      if (!localStorage.getItem(SPLASH_SEEN_KEY)) setLocation("/splash");
    } catch { /* ignore */ }
  }, [setLocation]);
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-50 relative overflow-hidden p-4">
      {/* Ambient background — three blobs and a subtle grid for depth */}
      <div className="absolute top-[-20%] left-[-15%] w-[28rem] h-[28rem] bg-blue-600/25 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute bottom-[-20%] right-[-15%] w-[28rem] h-[28rem] bg-rose-600/25 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: "10s", animationDelay: "1s" }} />
      <div className="absolute top-1/3 right-[-10%] w-72 h-72 bg-fuchsia-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: "12s" }} />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="z-10 space-y-3 max-w-sm w-full">
        <div className="text-center pb-1">
          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-fuchsia-300/90 mb-2">
            <span className="h-px w-6 bg-fuchsia-500/50" />
            République Royale
            <span className="h-px w-6 bg-fuchsia-500/50" />
          </div>
          <h1
            className="text-6xl font-black tracking-tight leading-[0.85] select-none"
            style={{
              background: "linear-gradient(180deg, #f8fafc 0%, #cbd5e1 60%, #64748b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 4px 0 rgba(0,0,0,0.4)) drop-shadow(0 0 30px rgba(59,130,246,0.3))",
            }}
          >
            FRANCE
          </h1>
          <h1
            className="text-5xl font-black tracking-[0.05em] leading-[0.9] mt-1 select-none"
            style={{
              background: "linear-gradient(180deg, #60a5fa 0%, #a855f7 50%, #f43f5e 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 4px 0 rgba(0,0,0,0.4))",
            }}
          >
            ROYAL
          </h1>
          <p className="text-[11px] text-slate-500 font-medium mt-3 tracking-[0.2em] uppercase">
            L'Assemblée dans l'arène
          </p>
        </div>

        <Show when="signed-out">
          <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-700 p-4 space-y-3 shadow-[0_6px_0_rgba(0,0,0,0.4)]">
            <p className="text-sm text-slate-300 text-center">Connectez-vous pour jouer, collectionner et bâtir votre deck.</p>
            <Link href="/sign-in">
              <Button className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 shadow-[0_4px_0_rgba(0,0,0,0.4)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.4)]" data-testid="button-sign-in">
                Se connecter
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button variant="outline" className="w-full h-12 text-base font-bold border-2 border-fuchsia-500 text-fuchsia-300 hover:bg-fuchsia-900/30" data-testid="button-sign-up">
                Créer un compte
              </Button>
            </Link>
            <p className="text-[10px] text-slate-500 text-center pt-1">
              Pseudo + mot de passe, ou Google.
            </p>
          </div>
        </Show>

        <Show when="signed-in">
          <UserBar />
          <ArenaBadge />
          <DeckPreview />

          <div className="space-y-2 pt-1">
            <Link href="/game">
              <Button
                size="lg"
                className="group relative w-full h-14 text-base font-black uppercase tracking-wide bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-[0_6px_0_rgba(0,0,0,0.4),0_0_24px_rgba(59,130,246,0.35)] active:translate-y-[3px] active:shadow-[0_3px_0_rgba(0,0,0,0.4)] border border-blue-400/30"
                data-testid="button-start-solo"
              >
                <Swords className="w-5 h-5 mr-2 transition-transform group-hover:rotate-12" />
                Solo — vs IA
              </Button>
            </Link>
            <Link href="/lobby">
              <Button
                size="lg"
                className="group relative w-full h-14 text-base font-black uppercase tracking-wide bg-gradient-to-r from-fuchsia-600 to-purple-700 hover:from-fuchsia-500 hover:to-purple-600 shadow-[0_6px_0_rgba(0,0,0,0.4),0_0_24px_rgba(217,70,239,0.35)] active:translate-y-[3px] active:shadow-[0_3px_0_rgba(0,0,0,0.4)] border border-fuchsia-400/30 text-white"
                data-testid="button-start-multiplayer"
              >
                <Globe2 className="w-5 h-5 mr-2 transition-transform group-hover:scale-110" />
                Multijoueur 1v1
              </Button>
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/collection">
                <Button
                  variant="outline"
                  className="w-full h-11 text-xs font-bold border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:border-slate-500 shadow-[0_3px_0_rgba(0,0,0,0.4)]"
                  data-testid="button-collection"
                >
                  <Library className="w-3.5 h-3.5 mr-1.5" />
                  Collection
                </Button>
              </Link>
              <Link href="/deck">
                <Button
                  variant="outline"
                  className="w-full h-11 text-xs font-bold border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:border-slate-500 shadow-[0_3px_0_rgba(0,0,0,0.4)]"
                  data-testid="button-deck"
                >
                  <Layers className="w-3.5 h-3.5 mr-1.5" />
                  Éditeur de deck
                </Button>
              </Link>
            </div>
            <Link href="/splash">
              <Button
                variant="ghost"
                className="w-full h-9 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-200 hover:bg-slate-900/60"
                data-testid="button-tutorial"
              >
                <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                Revoir le tutoriel
              </Button>
            </Link>
          </div>
        </Show>
      </div>
    </div>
  );
}
