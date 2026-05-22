import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useMultiplayer, MPMessage } from "../hooks/useMultiplayer";
import { useMe, getSelectedDeck } from "../hooks/useMe";
import { Button } from "@/components/ui/button";
import { Swords, X } from "lucide-react";

const MATCHMAKING_TIMEOUT_MS = 5_000;
const MP_FORBIDDEN_CARDS = new Set(["urssaf"]);

// Tick the countdown every 100ms so the progress bar feels fluid.
const TICK_MS = 100;

export default function Play() {
  const { data: me, isLoading } = useMe();
  if (isLoading || !me) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Chargement…</div>;
  }
  // We only mount the inner component (and its WebSocket) AFTER `me` is
  // available, so the very first `find_match` we send always carries the
  // correct deck + displayName.
  return <PlayInner me={me} />;
}

function PlayInner({ me }: { me: NonNullable<ReturnType<typeof useMe>["data"]> }) {
  const [, setLocation] = useLocation();

  const selected = getSelectedDeck(me);
  const deck = selected && selected.length === 8 ? selected : undefined;
  const displayName = me.profile.displayName ?? "Joueur";
  const forbiddenInDeck = (deck ?? []).filter((id) => MP_FORBIDDEN_CARDS.has(id));
  // If the player has URSSAF in their deck, skip matchmaking entirely and go
  // straight to solo (where URSSAF is allowed) so they're never stuck.
  const skipMatchmaking = forbiddenInDeck.length > 0;

  const [remainingMs, setRemainingMs] = useState(MATCHMAKING_TIMEOUT_MS);
  const [phase, setPhase] = useState<"searching" | "matched" | "falling-back" | "cancelled">("searching");
  const startRef = useRef<number>(performance.now());
  const decidedRef = useRef(false);
  const cancelMatchRef = useRef<(() => void) | null>(null);

  const goSolo = useCallback(() => {
    if (decidedRef.current) return;
    decidedRef.current = true;
    setPhase("falling-back");
    cancelMatchRef.current?.();
    // Solo: no seed, no code → Game treats this as single-player vs AI.
    setTimeout(() => setLocation("/game"), 300);
  }, [setLocation]);

  const handleMessage = useCallback((msg: MPMessage) => {
    if (decidedRef.current) return;
    if (msg.type === "match_found") {
      decidedRef.current = true;
      setPhase("matched");
      const url = `/game?seed=${msg.seed}&faction=${msg.faction}&code=${msg.code}&opp=${encodeURIComponent(msg.opponentName)}`;
      setTimeout(() => setLocation(url), 400);
    } else if (msg.type === "error") {
      // Server refused (e.g. forbidden card slipped through) — fall back to solo.
      goSolo();
    }
  }, [goSolo, setLocation]);

  const { findMatch, cancelMatch } = useMultiplayer({
    onMessage: handleMessage,
    onOpen: () => {
      if (skipMatchmaking || decidedRef.current) return;
      startRef.current = performance.now();
      findMatch(deck, displayName);
    },
    onClose: () => {
      // Lost the socket while waiting — fall back to solo.
      if (phase === "searching") goSolo();
    },
  });

  // Keep the latest cancel function in a ref so goSolo (stable) can call it.
  useEffect(() => { cancelMatchRef.current = cancelMatch; }, [cancelMatch]);

  // If the deck has forbidden cards, bypass MP without ever connecting.
  useEffect(() => {
    if (skipMatchmaking) goSolo();
  }, [skipMatchmaking, goSolo]);

  // Countdown loop. Fires goSolo when the 5-second window elapses without a match.
  useEffect(() => {
    if (skipMatchmaking) return;
    const id = window.setInterval(() => {
      const elapsed = performance.now() - startRef.current;
      const left = Math.max(0, MATCHMAKING_TIMEOUT_MS - elapsed);
      setRemainingMs(left);
      if (left <= 0) {
        window.clearInterval(id);
        goSolo();
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [skipMatchmaking, goSolo]);

  // On unmount: tell the server to drop us from the queue if still searching.
  useEffect(() => () => {
    if (!decidedRef.current) cancelMatchRef.current?.();
  }, []);

  const pct = Math.max(0, Math.min(100, (remainingMs / MATCHMAKING_TIMEOUT_MS) * 100));
  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-15%] w-[28rem] h-[28rem] bg-blue-600/25 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: "6s" }} />
      <div className="absolute bottom-[-20%] right-[-15%] w-[28rem] h-[28rem] bg-rose-600/25 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />

      <div className="relative z-10 max-w-sm w-full space-y-6 text-center">
        <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-fuchsia-300/90">
          <span className="h-px w-6 bg-fuchsia-500/50" />
          Matchmaking
          <span className="h-px w-6 bg-fuchsia-500/50" />
        </div>

        <div className="relative">
          {/* Spinning ring */}
          <div className="relative w-40 h-40 mx-auto">
            <div
              className="absolute inset-0 rounded-full p-1"
              style={{
                background: `conic-gradient(from -90deg, #3b82f6 0%, #a855f7 ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
              }}
            >
              <div className="w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center">
                {phase === "searching" && (
                  <>
                    <Swords className="w-7 h-7 text-fuchsia-300 mb-1 animate-pulse" />
                    <div className="text-3xl font-black text-white">{secondsLeft}</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">secondes</div>
                  </>
                )}
                {phase === "matched" && (
                  <div className="text-emerald-300 font-black uppercase tracking-widest text-xs px-2 text-center">
                    Adversaire<br />trouvé !
                  </div>
                )}
                {phase === "falling-back" && (
                  <div className="text-blue-300 font-black uppercase tracking-widest text-xs px-2 text-center">
                    Mode<br />solo
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white">
            {phase === "searching" && "Recherche d'un adversaire…"}
            {phase === "matched" && "Lancement du match"}
            {phase === "falling-back" && "Aucun adversaire libre"}
          </h2>
          <p className="text-sm text-slate-400 font-medium">
            {phase === "searching" && "Si personne ne répond, vous affrontez l'IA."}
            {phase === "matched" && "Préparation de l'arène…"}
            {phase === "falling-back" && "Lancement d'un match solo vs IA."}
          </p>
        </div>

        {phase === "searching" && (
          <Button
            variant="outline"
            className="w-full h-11 text-xs font-bold border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
            onClick={() => {
              if (decidedRef.current) return;
              decidedRef.current = true;
              setPhase("cancelled");
              cancelMatchRef.current?.();
              setLocation("/");
            }}
            data-testid="button-cancel-matchmaking"
          >
            <X className="w-4 h-4 mr-1.5" />
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
}
