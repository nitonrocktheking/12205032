import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CARDS } from "../game/cards";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

const STORAGE_KEY = "fr_admin_pwd";

interface AdminUser {
  clerkUserId: string;
  displayName: string;
  level: number;
  wins: number;
  losses: number;
  gold: number;
  ownedCards: string[];
}

async function adminFetch<T>(path: string, password: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(api(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": password,
      ...(init.headers || {}),
    },
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(err.error || `HTTP ${r.status}`);
  }
  return r.json();
}

export default function Admin() {
  const [password, setPassword] = useState<string | null>(() => sessionStorage.getItem(STORAGE_KEY));
  if (!password) return <Login onAuth={(pwd) => { sessionStorage.setItem(STORAGE_KEY, pwd); setPassword(pwd); }} />;
  return <Panel password={password} onLogout={() => { sessionStorage.removeItem(STORAGE_KEY); setPassword(null); }} />;
}

function Login({ onAuth }: { onAuth: (pwd: string) => void }) {
  const [username, setUsername] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch(api("/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: pwd }),
      }).then(async (r) => { if (!r.ok) throw new Error("Identifiants invalides"); });
      onAuth(pwd);
    } catch (e: any) {
      toast.error(e?.message || "Connexion refusée");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-white p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-slate-900/80 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-[0_8px_0_rgba(0,0,0,0.4)]"
      >
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.4em] text-fuchsia-300 font-bold mb-1">Restreint</div>
          <h1 className="text-3xl font-black">Admin</h1>
          <p className="text-xs text-slate-500 mt-1">Réservé aux modérateurs</p>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Utilisateur</label>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
            data-testid="input-admin-user"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-slate-400 font-bold">Mot de passe</label>
          <Input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            autoComplete="current-password"
            data-testid="input-admin-pwd"
          />
        </div>
        <Button
          type="submit"
          disabled={busy || !username || !pwd}
          className="w-full h-12 font-black bg-fuchsia-600 hover:bg-fuchsia-700 shadow-[0_4px_0_rgba(0,0,0,0.4)] active:translate-y-[2px] active:shadow-[0_2px_0_rgba(0,0,0,0.4)]"
          data-testid="button-admin-login"
        >
          {busy ? "…" : "Entrer"}
        </Button>
        <Link href="/">
          <Button type="button" variant="ghost" className="w-full text-slate-400 hover:text-white">
            ← Retour au menu
          </Button>
        </Link>
      </form>
    </div>
  );
}

function Panel({ password, onLogout }: { password: string; onLogout: () => void }) {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [allCards, setAllCards] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [bulkCard, setBulkCard] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      const r = await adminFetch<{ users: AdminUser[]; allCards: string[] }>("/admin/users", password);
      setUsers(r.users);
      setAllCards(r.allCards);
      if (!bulkCard && r.allCards.length) setBulkCard(r.allCards[0]);
    } catch (e: any) {
      if (/401|Unauthorized/.test(e?.message)) onLogout();
      else toast.error(e?.message || "Erreur");
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const grant = async (target: string, cardId: string) => {
    setBusy(true);
    try {
      const r = await adminFetch<{ granted: number; total: number }>(
        "/admin/grant-card", password,
        { method: "POST", body: JSON.stringify({ target, cardId }) },
      );
      toast.success(
        target === "all"
          ? `Carte donnée à ${r.granted}/${r.total} joueurs.`
          : `Carte donnée (${r.granted ? "nouvelle" : "déjà possédée"}).`,
      );
      await reload();
    } catch (e: any) {
      toast.error(e?.message || "Échec");
    } finally {
      setBusy(false);
    }
  };

  const filteredUsers = users?.filter((u) => {
    if (!filter) return true;
    const f = filter.toLowerCase();
    return u.clerkUserId.toLowerCase().includes(f) || (u.displayName ?? "").toLowerCase().includes(f);
  });

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white p-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/"><Button variant="ghost" className="text-slate-300">← Menu</Button></Link>
          <h1 className="text-2xl font-black">Panel admin</h1>
          <Button onClick={onLogout} variant="ghost" className="text-slate-400 hover:text-red-400 text-xs" data-testid="button-admin-logout">
            Déconnexion
          </Button>
        </div>

        {/* Bulk grant */}
        <div className="bg-gradient-to-br from-fuchsia-950/40 to-slate-900 border border-fuchsia-900/50 rounded-2xl p-4 space-y-3 shadow-[0_6px_0_rgba(0,0,0,0.4)]">
          <div className="text-[10px] uppercase tracking-widest text-fuchsia-300 font-bold">Donner à tout le monde</div>
          <div className="flex gap-2">
            <select
              value={bulkCard}
              onChange={(e) => setBulkCard(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              data-testid="select-bulk-card"
            >
              {allCards.map((id) => (
                <option key={id} value={id}>{CARDS[id]?.fullName ?? id}</option>
              ))}
            </select>
            <Button
              onClick={() => bulkCard && grant("all", bulkCard)}
              disabled={busy || !bulkCard}
              className="bg-fuchsia-600 hover:bg-fuchsia-700 font-bold shadow-[0_3px_0_rgba(0,0,0,0.4)]"
              data-testid="button-grant-all"
            >
              Donner à tous
            </Button>
          </div>
        </div>

        {/* User search */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-3 space-y-3">
          <Input
            placeholder="Rechercher un joueur (id ou pseudo)…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            data-testid="input-user-filter"
          />
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
            {filteredUsers ? `${filteredUsers.length} joueur(s)` : "Chargement…"}
          </div>
        </div>

        {/* User list */}
        <div className="space-y-2">
          {filteredUsers?.map((u) => (
            <UserRow key={u.clerkUserId} user={u} allCards={allCards} busy={busy} onGrant={grant} />
          ))}
          {filteredUsers && filteredUsers.length === 0 && (
            <div className="text-center text-slate-500 py-8 text-sm">Aucun joueur trouvé.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserRow({
  user, allCards, busy, onGrant,
}: {
  user: AdminUser;
  allCards: string[];
  busy: boolean;
  onGrant: (target: string, cardId: string) => void;
}) {
  const lockedCards = allCards.filter((id) => !user.ownedCards.includes(id));
  const [pick, setPick] = useState<string>(lockedCards[0] ?? allCards[0] ?? "");

  useEffect(() => {
    if (!pick || !allCards.includes(pick)) {
      setPick(lockedCards[0] ?? allCards[0] ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.ownedCards.length]);

  return (
    <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-3 shadow-[0_4px_0_rgba(0,0,0,0.4)]">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-white truncate" data-testid={`user-name-${user.clerkUserId}`}>
            {user.displayName || "(sans pseudo)"}
          </div>
          <div className="text-[10px] text-slate-500 font-mono truncate">{user.clerkUserId}</div>
          <div className="text-xs text-slate-400 mt-1">
            Niv. {user.level} · {user.wins}V/{user.losses}D · 🪙 {user.gold} · {user.ownedCards.length}/{allCards.length} cartes
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <select
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs"
          data-testid={`select-card-${user.clerkUserId}`}
        >
          {allCards.map((id) => {
            const owned = user.ownedCards.includes(id);
            return (
              <option key={id} value={id}>
                {owned ? "✓ " : ""}{CARDS[id]?.fullName ?? id}
              </option>
            );
          })}
        </select>
        <Button
          size="sm"
          onClick={() => pick && onGrant(user.clerkUserId, pick)}
          disabled={busy || !pick}
          className="bg-blue-600 hover:bg-blue-700 font-bold shadow-[0_3px_0_rgba(0,0,0,0.4)] text-xs"
          data-testid={`button-grant-${user.clerkUserId}`}
        >
          Donner
        </Button>
      </div>
    </div>
  );
}
