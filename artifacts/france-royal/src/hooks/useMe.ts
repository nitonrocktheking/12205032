import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

export interface UserProfile {
  clerkUserId: string;
  displayName: string | null;
  level: number;
  xp: number;
  gold: number;
  wins: number;
  losses: number;
  selectedDeckSlot: number;
  tutorialDone: number;
}
export interface UserCard { clerkUserId: string; cardId: string; count: number; }
export interface UserDeck { clerkUserId: string; slot: number; cardIds: string[]; }

export interface ProgressionEntry {
  cardId: string;
  level: number;
  xpRequired: number;
}
export interface ProgressionInfo {
  schedule: ProgressionEntry[];
  xpAtCurrentLevel: number;
  xpAtNextLevel: number;
  xpPerLevel: number;
  xpIntoLevel: number;
}

export interface MeData {
  profile: UserProfile;
  cards: UserCard[];
  decks: UserDeck[];
  allCards: string[];
  starterCards: string[];
  progression: ProgressionInfo;
}

async function fetchMe(): Promise<MeData> {
  const r = await fetch(api("/me"), { credentials: "include" });
  if (!r.ok) throw new Error(`me ${r.status}`);
  return r.json();
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled,
    staleTime: 5_000,
    retry: false,
  });
}

export function useSaveDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { slot: number; cardIds: string[] }) => {
      const r = await fetch(api(`/me/decks/${p.slot}`), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: p.cardIds }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "save failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useSelectDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slot: number) => {
      const r = await fetch(api(`/me/selected-deck`), {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      if (!r.ok) throw new Error("select failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export interface MatchResultResp {
  xpGain: number;
  goldGain: number;
  newLevel: number;
  leveledUp: boolean;
  unlockedCard: string | null;
  unlockedCards: string[];
}

export function useReportMatchResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { result: "win" | "loss" | "draw"; crowns: number }): Promise<MatchResultResp> => {
      const r = await fetch(api(`/me/match-result`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      if (!r.ok) throw new Error("report failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useSetUsername() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (username: string) => {
      const r = await fetch(api(`/me/username`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error || "Erreur");
      return body as { ok: true; username: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function getSelectedDeck(me: MeData | undefined): string[] {
  if (!me) return [];
  const slot = me.profile.selectedDeckSlot;
  const deck = me.decks.find((d) => d.slot === slot) ?? me.decks[0];
  return deck?.cardIds ?? [];
}
