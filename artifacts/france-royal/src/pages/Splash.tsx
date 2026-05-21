import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Swords, Coins, Trophy, Layers, ChevronLeft, ChevronRight } from "lucide-react";

export const SPLASH_SEEN_KEY = "france-royal-splash-seen";

interface Step {
  title: string;
  body: React.ReactNode;
  visual: React.ReactNode;
}

function TowerMini({ side }: { side: "mine" | "enemy" }) {
  const accentMid = side === "mine" ? "#3b82f6" : "#ef4444";
  const accentLight = side === "mine" ? "#93c5fd" : "#fca5a5";
  return (
    <div className="relative" style={{ width: 38, height: 56 }}>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0" style={{ width: 44, height: 12, borderRadius: 6, background: "linear-gradient(to bottom, #f5f5f4, #57534e)", border: "2px solid rgba(0,0,0,0.55)" }} />
      <div className="absolute left-1/2 -translate-x-1/2 overflow-hidden" style={{ bottom: 8, width: 34, height: 36, borderRadius: "5px 5px 3px 3px", background: "linear-gradient(to right, #57534e, #f5f5f4, #57534e)", border: "2px solid rgba(0,0,0,0.55)" }}>
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 6, width: 14, height: 16, background: `linear-gradient(to bottom, ${accentLight}, ${accentMid})`, clipPath: "polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)" }} />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 flex justify-between" style={{ bottom: 42, width: 32, height: 6 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: 6, height: 6, background: "linear-gradient(to bottom, #f5f5f4, #a8a29e)", border: "1px solid rgba(0,0,0,0.55)", borderRadius: "1px 1px 0 0" }} />
        ))}
      </div>
    </div>
  );
}

function UnitMini({ side }: { side: "mine" | "enemy" }) {
  const mid = side === "mine" ? "#3b82f6" : "#ef4444";
  const light = side === "mine" ? "#93c5fd" : "#fca5a5";
  return (
    <div className="relative" style={{ width: 28, height: 40 }}>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0" style={{ width: 26, height: 8, borderRadius: "50%", background: `radial-gradient(ellipse at center, ${light}, rgba(0,0,0,0.4))` }} />
      <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 4, width: 20, height: 28, borderRadius: "45% 45% 38% 38% / 55% 55% 22% 22%", background: `linear-gradient(to bottom, ${light}, ${mid}, #1e3a8a)`, border: "1.5px solid rgba(0,0,0,0.55)", boxShadow: "inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -2px 4px rgba(0,0,0,0.5)" }} />
    </div>
  );
}

function CardMini({ cost, color }: { cost: number; color: string }) {
  return (
    <div className="relative rounded-md border-2 border-black/60 shadow-[0_3px_0_rgba(0,0,0,0.5)]" style={{ width: 40, height: 52, background: `linear-gradient(to bottom, ${color}, #0f172a)` }}>
      <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-fuchsia-600 border-2 border-white text-white text-[10px] font-black flex items-center justify-center shadow-md">{cost}</div>
    </div>
  );
}

export default function Splash() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(0);

  const steps: Step[] = [
    {
      title: "Bienvenue dans l'arène",
      body: (
        <>
          <p>France Royal, c'est <span className="font-bold text-fuchsia-300">l'Assemblée dans l'arène</span> : tes personnalités politiques préférées s'affrontent en duel sur deux voies.</p>
          <p className="text-slate-400 text-xs">Solo contre l'IA, ou multijoueur 1v1 en ligne. Parties courtes, deck de 4 cartes, victoire en détruisant la tour royale adverse.</p>
        </>
      ),
      visual: (
        <div className="flex items-end justify-center gap-6 pt-4">
          <TowerMini side="mine" />
          <div className="flex gap-2 pb-3"><UnitMini side="mine" /><UnitMini side="enemy" /></div>
          <TowerMini side="enemy" />
        </div>
      ),
    },
    {
      title: "L'élixir et les cartes",
      body: (
        <>
          <p>Ta réserve d'<span className="font-bold text-fuchsia-300">élixir</span> remonte toute seule (max 10). Chaque carte coûte un certain nombre d'élixirs pour être jouée.</p>
          <p className="text-slate-400 text-xs">Touche une carte de ta main, puis touche l'arène pour faire apparaître ton unité. Gère ton élixir : trop dépenser, c'est ouvrir la porte à l'adversaire.</p>
        </>
      ),
      visual: (
        <div className="flex flex-col items-center gap-3 pt-4">
          <div className="flex gap-2">
            <CardMini cost={3} color="#3b82f6" />
            <CardMini cost={5} color="#a855f7" />
            <CardMini cost={2} color="#10b981" />
            <CardMini cost={7} color="#ef4444" />
          </div>
          <div className="w-44 h-3 rounded-full bg-black/60 border border-fuchsia-900/60 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-fuchsia-500 to-purple-600" style={{ width: "70%" }} />
          </div>
          <div className="text-[10px] text-fuchsia-300 font-bold tracking-widest uppercase">Élixir 7 / 10</div>
        </div>
      ),
    },
    {
      title: "Tours et voies",
      body: (
        <>
          <p>Chaque camp défend <span className="font-bold text-fuchsia-300">3 tours</span> : deux princesses (gauche/droite) et une tour du roi au centre.</p>
          <p className="text-slate-400 text-xs">Les unités traversent par les <span className="font-bold">deux ponts</span>. Les tours tirent sur les ennemis à portée. Détruire une princesse débloque l'attaque sur la tour du roi de ce côté.</p>
        </>
      ),
      visual: (
        <div className="flex items-end justify-center gap-3 pt-4">
          <TowerMini side="enemy" />
          <TowerMini side="enemy" />
          <TowerMini side="enemy" />
        </div>
      ),
    },
    {
      title: "Victoire et récompenses",
      body: (
        <>
          <p>La partie se termine quand une <span className="font-bold text-fuchsia-300">tour du roi tombe</span> — ou quand le temps imparti est écoulé (le camp avec le plus de tours détruites gagne).</p>
          <p className="text-slate-400 text-xs">Chaque match rapporte <span className="text-amber-300 font-bold">or</span> et <span className="text-emerald-300 font-bold">XP</span>. Gagner débloque parfois une nouvelle carte aléatoire jusqu'à compléter la collection.</p>
        </>
      ),
      visual: (
        <div className="flex items-center justify-center gap-4 pt-4">
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center shadow-[0_4px_0_rgba(0,0,0,0.4)]"><Coins className="w-6 h-6 text-amber-300" /></div>
            <div className="text-[10px] text-amber-300 font-black">+12 OR</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-[0_4px_0_rgba(0,0,0,0.4)]"><Trophy className="w-6 h-6 text-emerald-300" /></div>
            <div className="text-[10px] text-emerald-300 font-black">+25 XP</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-fuchsia-500/20 border-2 border-fuchsia-400 flex items-center justify-center shadow-[0_4px_0_rgba(0,0,0,0.4)]"><Layers className="w-6 h-6 text-fuchsia-300" /></div>
            <div className="text-[10px] text-fuchsia-300 font-black">CARTE !</div>
          </div>
        </div>
      ),
    },
  ];

  const isHero = step === 0;

  const dismiss = () => {
    try { localStorage.setItem(SPLASH_SEEN_KEY, "1"); } catch { /* ignore */ }
    setLocation("/");
  };

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else dismiss();
  };
  const prev = () => { if (step > 0) setStep(step - 1); };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-50 relative overflow-hidden p-4">
      {/* Ambient gradient blobs */}
      <div className="absolute top-[-20%] left-[-15%] w-[28rem] h-[28rem] bg-blue-600/30 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute bottom-[-20%] right-[-15%] w-[28rem] h-[28rem] bg-rose-600/30 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: "10s", animationDelay: "1s" }} />
      <div className="absolute top-1/3 right-[-10%] w-72 h-72 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: "12s" }} />
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-4">
        {/* HERO */}
        <div className="text-center select-none">
          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.4em] text-fuchsia-300/90 mb-2">
            <span className="h-px w-6 bg-fuchsia-500/50" />République Royale<span className="h-px w-6 bg-fuchsia-500/50" />
          </div>
          <h1 className="text-6xl sm:text-7xl font-black tracking-tight leading-[0.85]" style={{
            background: "linear-gradient(180deg, #f8fafc 0%, #cbd5e1 60%, #64748b 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 4px 0 rgba(0,0,0,0.45)) drop-shadow(0 0 30px rgba(59,130,246,0.4))",
          }}>FRANCE</h1>
          <h1 className="text-5xl sm:text-6xl font-black tracking-[0.05em] leading-[0.9] mt-1" style={{
            background: "linear-gradient(180deg, #60a5fa 0%, #a855f7 50%, #f43f5e 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 4px 0 rgba(0,0,0,0.4))",
          }}>ROYAL</h1>
          {isHero && (
            <p className="text-[11px] text-slate-500 font-medium mt-3 tracking-[0.2em] uppercase">L'Assemblée dans l'arène</p>
          )}
        </div>

        {/* Card panel */}
        <div className="w-full bg-slate-900/85 backdrop-blur rounded-2xl border border-slate-700 p-5 shadow-[0_6px_0_rgba(0,0,0,0.4)] space-y-3">
          {isHero ? (
            <>
              {/* Animated mini-scene */}
              <div className="flex items-end justify-center gap-4 py-2">
                <TowerMini side="mine" />
                <div className="flex items-end gap-2 pb-2">
                  <UnitMini side="mine" />
                  <UnitMini side="enemy" />
                </div>
                <TowerMini side="enemy" />
              </div>
              <p className="text-sm text-slate-300 text-center leading-relaxed">
                Plonge dans <span className="font-bold text-white">l'arène politique</span> : pose tes cartes, gère ton élixir, et fais tomber la tour royale adverse.
              </p>
              <Button
                onClick={() => setStep(1)}
                className="w-full h-12 text-base font-black uppercase tracking-wide bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 shadow-[0_4px_0_rgba(0,0,0,0.4),0_0_24px_rgba(59,130,246,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.4)] border border-blue-400/30"
                data-testid="button-start-tutorial"
              >
                <Swords className="w-5 h-5 mr-2" />
                Voir le tutoriel
              </Button>
              <button
                onClick={dismiss}
                className="w-full text-xs text-slate-400 hover:text-slate-200 font-bold uppercase tracking-widest pt-1"
                data-testid="button-skip-tutorial"
              >
                Passer
              </button>
            </>
          ) : (
            <>
              <div className="text-center">
                <div className="text-[10px] text-fuchsia-300/80 font-black uppercase tracking-[0.3em] mb-1">Étape {step} / {steps.length - 1}</div>
                <h2 className="text-xl font-black text-white">{steps[step].title}</h2>
              </div>
              <div className="rounded-xl bg-slate-950/60 border border-slate-700/60 p-3 min-h-[100px]">
                {steps[step].visual}
              </div>
              <div className="text-sm text-slate-200 space-y-2 leading-relaxed">
                {steps[step].body}
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  onClick={prev}
                  disabled={step <= 1}
                  variant="outline"
                  className="h-11 px-3 text-xs font-bold border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800 disabled:opacity-30"
                  data-testid="button-tutorial-prev"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex gap-1.5">
                  {steps.slice(1).map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? "w-6 bg-fuchsia-400" : "w-1.5 bg-slate-600"}`} />
                  ))}
                </div>
                <Button
                  onClick={next}
                  className="h-11 px-4 text-sm font-black uppercase bg-gradient-to-r from-fuchsia-600 to-purple-700 hover:from-fuchsia-500 hover:to-purple-600 shadow-[0_4px_0_rgba(0,0,0,0.4)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.4)] text-white"
                  data-testid="button-tutorial-next"
                >
                  {step === steps.length - 1 ? "Jouer" : "Suivant"}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
