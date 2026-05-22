import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { useMe, getSelectedDeck } from "../hooks/useMe";
import { useIsGuest } from "../hooks/useGuest";
import CardTile from "../components/CardTile";
import { getArenaForLevel, getNextArena } from "../game/arenas";
import LogoutButton from "../components/LogoutButton";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { SPLASH_SEEN_KEY } from "./Splash";
import { useT } from "../hooks/useT";
import { Swords, Library, Layers, Coins, Trophy, HelpCircle, TrendingUp, Users } from "lucide-react";

function UserBar() {
  const { data: me } = useMe();
  const { t } = useT();
  if (!me) return null;

  const { xpIntoLevel, xpPerLevel } = me.progression;
  const xpPct = Math.min(100, (xpIntoLevel / xpPerLevel) * 100);

  return (
    <div className="relative rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900/95 to-slate-800/80 backdrop-blur-md p-3 shadow-[0_6px_0_rgba(0,0,0,0.4)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
      <div className="flex items-center gap-2.5">
        {/* Level avatar with XP ring (ring already conveys XP progress) */}
        <div className="relative w-11 h-11 shrink-0" title={`${Math.round(xpIntoLevel)}/${xpPerLevel} XP`}>
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

        {/* Identity + compact stats — flex-1 so it absorbs any overflow via truncate */}
        <div className="min-w-0 flex-1">
          <div className="font-black text-white text-sm leading-tight truncate" data-testid="text-username">
            {me.profile.displayName ?? t("menu.level_fallback", { level: me.profile.level })}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mt-0.5">
            <span className="inline-flex items-center gap-0.5 text-emerald-300">
              <Trophy className="w-3 h-3" />{me.profile.wins}{t("menu.wins_short")}
            </span>
            <span className="text-slate-600">·</span>
            <span>{me.profile.losses}{t("menu.losses_short")}</span>
            <span className="text-slate-600">·</span>
            <span className="inline-flex items-center gap-0.5 text-amber-300/90">
              <Coins className="w-3 h-3" />
              <span data-testid="text-gold">{me.profile.gold}</span>
            </span>
          </div>
        </div>

        {/* Actions — kept tight to the right edge */}
        <div className="flex items-center gap-1.5 shrink-0">
          <LanguageSwitcher />
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}

function ArenaBadge() {
  const { data: me } = useMe();
  const { t } = useT();
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
            <div className="text-[10px] uppercase tracking-widest text-white/80 font-bold">{t("menu.current_arena")}</div>
            <div className="text-sm font-black text-white drop-shadow truncate">{arena.name}</div>
          </div>
        </div>
        {next && (
          <div className="text-right text-[10px] text-white/90 font-bold shrink-0 bg-black/25 rounded-lg px-2 py-1 backdrop-blur-sm">
            <div className="uppercase tracking-wider text-white/70">{t("menu.next_arena")}</div>
            <div className="text-sm">{next.emoji} {t("common.level_short")} {next.minLevel}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function DeckPreview() {
  const { data: me } = useMe();
  const { t } = useT();
  if (!me) return null;
  const deck = getSelectedDeck(me);
  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-[0_4px_0_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold inline-flex items-center gap-1.5">
          <Layers className="w-3 h-3" /> {t("menu.active_deck")}
        </div>
        <Link href="/deck">
          <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold hover:text-blue-300 hover:underline cursor-pointer">
            {t("menu.edit")}
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
  const { isSignedIn } = useUser();
  const isGuest = useIsGuest();
  const { t } = useT();
  // Treat both Clerk users and guest-cookie sessions as authenticated so
  // guests see the full Play/Collection/Deck/Progression UI.
  const isAuthed = !!isSignedIn || isGuest;
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
            {t("menu.republique_royale")}
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
            {t("menu.tagline")}
          </p>
        </div>

        {!isAuthed && (
          <div className="bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-700 p-4 space-y-3 shadow-[0_6px_0_rgba(0,0,0,0.4)]">
            <div className="flex justify-center"><LanguageSwitcher /></div>
            <p className="text-sm text-slate-300 text-center">{t("menu.sign_in_prompt")}</p>
            <Link href="/sign-in">
              <Button className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 shadow-[0_4px_0_rgba(0,0,0,0.4)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.4)]" data-testid="button-sign-in">
                {t("menu.sign_in")}
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button variant="outline" className="w-full h-12 text-base font-bold border-2 border-fuchsia-500 text-fuchsia-300 hover:bg-fuchsia-900/30" data-testid="button-sign-up">
                {t("menu.sign_up")}
              </Button>
            </Link>
            <p className="text-[10px] text-slate-500 text-center pt-1">
              {t("menu.sign_up_hint")}
            </p>
          </div>
        )}

        {isAuthed && (
          <>
          <UserBar />
          <ArenaBadge />
          <DeckPreview />

          <div className="space-y-2 pt-1">
            <Link href="/play">
              <Button
                size="lg"
                className="group relative w-full h-16 text-lg font-black uppercase tracking-wide bg-gradient-to-r from-blue-600 via-fuchsia-600 to-rose-600 hover:from-blue-500 hover:via-fuchsia-500 hover:to-rose-500 shadow-[0_6px_0_rgba(0,0,0,0.4),0_0_28px_rgba(217,70,239,0.35)] active:translate-y-[3px] active:shadow-[0_3px_0_rgba(0,0,0,0.4)] border border-white/15 text-white"
                data-testid="button-play"
              >
                <Swords className="w-6 h-6 mr-2 transition-transform group-hover:rotate-12" />
                {t("menu.play")}
              </Button>
            </Link>
            <Link href="/lobby">
              <Button
                variant="outline"
                className="w-full h-10 text-xs font-bold border-fuchsia-700/60 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/20 hover:border-fuchsia-500 shadow-[0_3px_0_rgba(0,0,0,0.4)]"
                data-testid="button-private-room"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" />
                {t("menu.private_room")}
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
                  {t("menu.collection")}
                </Button>
              </Link>
              <Link href="/deck">
                <Button
                  variant="outline"
                  className="w-full h-11 text-xs font-bold border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:border-slate-500 shadow-[0_3px_0_rgba(0,0,0,0.4)]"
                  data-testid="button-deck"
                >
                  <Layers className="w-3.5 h-3.5 mr-1.5" />
                  {t("menu.deck_editor")}
                </Button>
              </Link>
            </div>
            <Link href="/progression">
              <Button
                variant="outline"
                className="w-full h-11 text-xs font-bold border-amber-600/60 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:border-amber-400 shadow-[0_3px_0_rgba(0,0,0,0.4)]"
                data-testid="button-progression"
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                {t("menu.progression_tree")}
              </Button>
            </Link>
            <Link href="/splash">
              <Button
                variant="ghost"
                className="w-full h-9 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-200 hover:bg-slate-900/60"
                data-testid="button-tutorial"
              >
                <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                {t("menu.replay_tutorial")}
              </Button>
            </Link>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
