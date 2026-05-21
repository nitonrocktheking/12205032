import { useState } from "react";
import { useClerk } from "@clerk/react";
import { LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  variant?: "compact" | "full";
  className?: string;
}

export default function LogoutButton({ variant = "compact", className = "" }: Props) {
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

  const doSignOut = async () => {
    setOpen(false);
    await signOut({ redirectUrl: basePath });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {variant === "compact" ? (
          <button
            type="button"
            aria-label="Se déconnecter"
            data-testid="button-logout"
            className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl
              bg-slate-800/80 hover:bg-rose-600/90 text-slate-300 hover:text-white
              border border-slate-700 hover:border-rose-500
              transition-colors shadow-[0_3px_0_rgba(0,0,0,0.4)] active:translate-y-[1px] active:shadow-[0_2px_0_rgba(0,0,0,0.4)]
              ${className}`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            data-testid="button-logout"
            className={`inline-flex items-center gap-2 px-3 h-9 rounded-xl
              bg-slate-800/80 hover:bg-rose-600/90 text-slate-200 hover:text-white
              border border-slate-700 hover:border-rose-500
              text-xs font-bold uppercase tracking-wider
              transition-colors shadow-[0_3px_0_rgba(0,0,0,0.4)] active:translate-y-[1px] active:shadow-[0_2px_0_rgba(0,0,0,0.4)]
              ${className}`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        )}
      </AlertDialogTrigger>

      <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Quitter la session ?</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            Vous serez déconnecté de votre compte. Votre progression est sauvegardée.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            data-testid="button-logout-cancel"
            className="bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid="button-logout-confirm"
            onClick={doSignOut}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            Se déconnecter
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
