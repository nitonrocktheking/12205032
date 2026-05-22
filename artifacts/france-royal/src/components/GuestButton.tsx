import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserX, AlertTriangle } from "lucide-react";
import { startGuestSession } from "../hooks/useGuest";

/** Button + warning dialog that creates a throwaway guest account.
 *  Mounted under the Clerk SignIn/SignUp components. */
export default function GuestButton() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const clerk = useClerk();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      // If a Clerk session is somehow active (e.g. user opened sign-in while
      // already signed in), sign them out FIRST so we don't have two identities
      // fighting over /api/me.
      if (clerk.user) {
        try { await clerk.signOut(); } catch { /* best effort */ }
      }
      await startGuestSession();
      // Clear the whole query cache so any stale /api/me 401 result is dropped
      // before we navigate. Then SPA-navigate — a hard reload would trigger
      // pagehide → guest cleanup beacon and immediately delete the new account.
      qc.clear();
      setOpen(false);
      setLocation("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-[440px] max-w-full mt-4 flex flex-col items-center">
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-slate-700/70" />
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">ou</span>
          <div className="flex-1 h-px bg-slate-700/70" />
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full h-11 text-sm font-bold border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:border-slate-600 shadow-[0_3px_0_rgba(0,0,0,0.4)]"
          onClick={() => setOpen(true)}
          data-testid="button-guest-mode"
        >
          <UserX className="w-4 h-4 mr-2 text-fuchsia-300" />
          Continuer en tant qu'invité
        </Button>
        <p className="mt-2 text-[11px] text-slate-500 text-center leading-snug">
          Aucune adresse email requise. Les données sont effacées au rechargement.
        </p>
      </div>

      <AlertDialog open={open} onOpenChange={(o) => { if (!loading) setOpen(o); }}>
        <AlertDialogContent className="bg-slate-950 border border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-5 h-5" />
              Attention — mode éphémère
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300 leading-relaxed pt-2 space-y-2">
              <span className="block">
                En continuant sans compte, un pseudo aléatoire vous sera attribué.
              </span>
              <span className="block font-bold text-amber-200">
                Si vous rechargez la page ou fermez l'onglet, votre compte d'invité
                ainsi que vos cartes, votre progression et vos decks seront définitivement
                supprimés.
              </span>
              <span className="block">
                Pour conserver votre progression, créez un compte plutôt.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <div className="text-rose-400 text-xs font-bold bg-rose-950/40 border border-rose-900 rounded p-2">
              {error}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading} className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={handleConfirm}
              className="bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 font-bold"
              data-testid="button-guest-confirm"
            >
              {loading ? "Création…" : "J'ai compris, continuer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
