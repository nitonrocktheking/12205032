import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSetUsername } from "../hooks/useMe";
import LogoutButton from "../components/LogoutButton";
import { UserCircle2 } from "lucide-react";

const RULE = /^[a-zA-Z0-9_-]{3,20}$/;

export default function UsernameSetup() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const setUser = useSetUsername();

  const valid = RULE.test(username.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!valid) {
      setError("3 à 20 caractères : lettres, chiffres, _ ou -.");
      return;
    }
    try {
      await setUser.mutateAsync(username.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white p-4 relative overflow-hidden">
      <div className="absolute top-[-15%] left-[-15%] w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute top-4 right-4 z-20">
        <LogoutButton variant="full" />
      </div>

      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-2xl p-6 space-y-4 shadow-[0_8px_0_rgba(0,0,0,0.4)] relative z-10"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-fuchsia-500 mb-3 shadow-[0_4px_0_rgba(0,0,0,0.4)]">
            <UserCircle2 className="w-8 h-8 text-white" />
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-fuchsia-300 font-bold">
            Dernière étape
          </div>
          <h1 className="text-3xl font-black mt-1">Choisis ton pseudo</h1>
          <p className="text-xs text-slate-400 mt-2">
            Visible des autres joueurs dans l'arène. Modifiable plus tard.
          </p>
        </div>

        <div>
          <Input
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(null); }}
            placeholder="MaCadidate2027"
            autoFocus
            maxLength={20}
            className="bg-slate-800 border-slate-700 text-white text-center text-lg font-bold tracking-wide h-12"
            data-testid="input-username"
          />
          <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
            <span className={valid ? "text-emerald-300" : "text-slate-500"}>
              {username.length === 0 ? "3 à 20 caractères" : valid ? "✓ Format valide" : "Format invalide"}
            </span>
            <span className="text-slate-500">{username.length}/20</span>
          </div>
          {error && (
            <div className="mt-2 text-xs text-rose-300 font-bold text-center bg-rose-950/40 border border-rose-900/60 rounded-lg py-2 px-3">
              {error}
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={!valid || setUser.isPending}
          className="w-full h-12 text-base font-black uppercase tracking-wide bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 shadow-[0_4px_0_rgba(0,0,0,0.4),0_0_24px_rgba(59,130,246,0.35)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.4)] border border-blue-400/30"
          data-testid="button-set-username"
        >
          {setUser.isPending ? "Enregistrement…" : "Entrer dans l'arène"}
        </Button>

        <p className="text-[10px] text-slate-500 text-center leading-relaxed">
          Lettres, chiffres, tirets et underscores autorisés. Les pseudos sont uniques (sensibles à la casse pour l'affichage).
        </p>
      </form>
    </div>
  );
}
