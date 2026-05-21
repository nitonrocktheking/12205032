import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import LogoutButton from "./LogoutButton";

interface Props {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  backHref?: string;
  showLogout?: boolean;
}

export default function PageHeader({
  title,
  subtitle,
  rightSlot,
  backHref = "/",
  showLogout = true,
}: Props) {
  return (
    <div className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-2 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/60">
      <div className="flex items-center gap-2">
        <Link href={backHref}>
          <button
            type="button"
            aria-label="Retour"
            data-testid="button-back"
            className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors shadow-[0_3px_0_rgba(0,0,0,0.4)] active:translate-y-[1px] active:shadow-[0_2px_0_rgba(0,0,0,0.4)]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>

        <div className="flex-1 min-w-0 text-center">
          <h1 className="text-lg font-black uppercase tracking-wider text-white leading-none truncate">
            {title}
          </h1>
          {subtitle && (
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-0.5">
              {subtitle}
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {rightSlot}
          {showLogout && <LogoutButton />}
        </div>
      </div>
    </div>
  );
}
