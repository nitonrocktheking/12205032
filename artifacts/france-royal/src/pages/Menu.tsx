import { Link } from "wouter";
import { Show, useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { useMe, getSelectedDeck } from "../hooks/useMe";
import CardTile from "../components/CardTile";
import { getArenaForLevel, getNextArena } from "../game/arenas";

function UserBar() {
  const { data: me } = useMe();
  const { signOut } = useClerk();
  if (!me) return null;
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

  return (
    <div className="flex items-center justify-between bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-sm shadow-[0_4px_0_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-fuchsia-500 flex items-center justify-center font-black text-white text-sm">
          {me.profile.level}
        </div>
        <div className="text-left">
          <div className="font-bold text-white text-xs">Niv. {me.profile.level}</div>
          <div className="text-[10px] text-slate-400">{me.profile.wins}V — {me.profile.losses}D</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-yellow-300 font-bold">
          <span>🪙</span><span>{me.profile.gold}</span>
        </div>
        <button
          onClick={() => signOut({ redirectUrl: basePath })}
          className="text-xs text-slate-400 hover:text-white"
          data-testid="button-logout"
        >
          Sortir
        </button>
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
      className="rounded-xl px-3 py-2 border border-slate-700 shadow-[0_4px_0_rgba(0,0,0,0.4)] flex items-center justify-between"
      style={{ background: `linear-gradient(135deg, ${arena.grassTop}, ${arena.grassBottom})` }}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl drop-shadow">{arena.emoji}</span>
        <div className="text-left">
          <div className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Arène</div>
          <div className="text-sm font-black text-white drop-shadow">{arena.name}</div>
        </div>
      </div>
      {next && (
        <div className="text-right text-[10px] text-white/70 font-bold">
          <div>Prochaine</div>
          <div>{next.emoji} Niv. {next.minLevel}</div>
        </div>
      )}
    </div>
  );
}

function DeckPreview() {
  const { data: me } = useMe();
  if (!me) return null;
  const deck = getSelectedDeck(me);
  return (
    <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-3 shadow-[0_4px_0_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-widest text-slate-400">Deck actif</div>
        <Link href="/deck">
          <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold hover:underline">Modifier</span>
        </Link>
      </div>
      <div className="flex gap-1 overflow-x-auto">
        {deck.slice(0, 8).map((id) => (
          <CardTile key={id} cardId={id} size="sm" showCost={false} />
        ))}
      </div>
    </div>
  );
}

export default function Menu() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-50 relative overflow-hidden p-4">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="z-10 space-y-4 max-w-md w-full">
        <div className="text-center space-y-2 mb-2">
          <h1 className="text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-slate-50 to-red-400 drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">
            FRANCE<br />ROYAL
          </h1>
          <p className="text-sm text-slate-400 font-medium">L&apos;Assemblée meets the Arena.</p>
        </div>

        <Show when="signed-out">
          <div className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-700 p-4 space-y-3 shadow-[0_6px_0_rgba(0,0,0,0.4)]">
            <p className="text-sm text-slate-300 text-center">Connectez-vous pour jouer, débloquer des cartes et construire votre deck.</p>
            <Link href="/sign-in">
              <Button className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 shadow-[0_4px_0_rgba(0,0,0,0.4)]" data-testid="button-sign-in">
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

          <div className="space-y-2">
            <Link href="/game">
              <Button size="lg" className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-[0_6px_0_rgba(0,0,0,0.4)] active:translate-y-[3px] active:shadow-[0_3px_0_rgba(0,0,0,0.4)]" data-testid="button-start-solo">
                Solo — Contre l&apos;IA
              </Button>
            </Link>
            <Link href="/lobby">
              <Button size="lg" variant="outline" className="w-full h-14 text-lg font-bold border-2 border-fuchsia-500 text-fuchsia-300 hover:bg-fuchsia-900/30 shadow-[0_6px_0_rgba(0,0,0,0.4)] active:translate-y-[3px] active:shadow-[0_3px_0_rgba(0,0,0,0.4)]" data-testid="button-start-multiplayer">
                Multijoueur — 1 vs 1
              </Button>
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/collection">
                <Button variant="outline" className="w-full h-12 text-sm font-bold border-slate-600 text-slate-200 hover:bg-slate-800 shadow-[0_4px_0_rgba(0,0,0,0.4)]" data-testid="button-collection">
                  Collection
                </Button>
              </Link>
              <Link href="/deck">
                <Button variant="outline" className="w-full h-12 text-sm font-bold border-slate-600 text-slate-200 hover:bg-slate-800 shadow-[0_4px_0_rgba(0,0,0,0.4)]" data-testid="button-deck">
                  Éditeur de Deck
                </Button>
              </Link>
            </div>
          </div>
        </Show>

        <div className="text-[10px] text-slate-600 text-center pt-2">v2 — base path: {basePath}</div>
      </div>
    </div>
  );
}
