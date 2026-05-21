export interface ArenaTheme {
  id: string;
  name: string;
  emoji: string;
  minLevel: number;
  grassTop: string;
  grassBottom: string;
  riverTop: string;
  riverBottom: string;
  riverBorder: string;
  bridgeColor: string;
  bridgeBorder: string;
  gridOpacity: number;
}

export const ARENAS: ArenaTheme[] = [
  {
    id: "champ-de-mars",
    name: "Champ-de-Mars",
    emoji: "🌳",
    minLevel: 1,
    grassTop: "#14532d",
    grassBottom: "#15803d",
    riverTop: "#1e40af88",
    riverBottom: "#3b82f688",
    riverBorder: "rgba(147,197,253,0.4)",
    bridgeColor: "#92400e",
    bridgeBorder: "#a16207",
    gridOpacity: 0.1,
  },
  {
    id: "versailles",
    name: "Jardins de Versailles",
    emoji: "👑",
    minLevel: 3,
    grassTop: "#365314",
    grassBottom: "#65a30d",
    riverTop: "#0891b2aa",
    riverBottom: "#06b6d4aa",
    riverBorder: "rgba(254,240,138,0.5)",
    bridgeColor: "#a16207",
    bridgeBorder: "#fbbf24",
    gridOpacity: 0.08,
  },
  {
    id: "mont-saint-michel",
    name: "Mont-Saint-Michel",
    emoji: "⛪",
    minLevel: 6,
    grassTop: "#78716c",
    grassBottom: "#d6d3d1",
    riverTop: "#0e7490aa",
    riverBottom: "#14b8a6aa",
    riverBorder: "rgba(165,243,252,0.5)",
    bridgeColor: "#57534e",
    bridgeBorder: "#a8a29e",
    gridOpacity: 0.06,
  },
  {
    id: "bastille",
    name: "Place de la Bastille",
    emoji: "🗽",
    minLevel: 10,
    grassTop: "#1f2937",
    grassBottom: "#374151",
    riverTop: "#1e293baa",
    riverBottom: "#475569aa",
    riverBorder: "rgba(248,113,113,0.5)",
    bridgeColor: "#7f1d1d",
    bridgeBorder: "#dc2626",
    gridOpacity: 0.12,
  },
  {
    id: "elysee",
    name: "Palais de l'Élysée",
    emoji: "🏛️",
    minLevel: 15,
    grassTop: "#7f1d1d",
    grassBottom: "#991b1b",
    riverTop: "#854d0eaa",
    riverBottom: "#a16207aa",
    riverBorder: "rgba(253,224,71,0.6)",
    bridgeColor: "#422006",
    bridgeBorder: "#facc15",
    gridOpacity: 0.08,
  },
  {
    id: "champs-elysees",
    name: "Champs-Élysées",
    emoji: "🗼",
    minLevel: 20,
    grassTop: "#0f172a",
    grassBottom: "#1e293b",
    riverTop: "#312e81aa",
    riverBottom: "#4338caaa",
    riverBorder: "rgba(255,255,255,0.6)",
    bridgeColor: "#1e1b4b",
    bridgeBorder: "#818cf8",
    gridOpacity: 0.15,
  },
];

export function getArenaForLevel(level: number): ArenaTheme {
  let current = ARENAS[0];
  for (const a of ARENAS) {
    if (level >= a.minLevel) current = a;
    else break;
  }
  return current;
}

export function getNextArena(level: number): ArenaTheme | null {
  for (const a of ARENAS) {
    if (level < a.minLevel) return a;
  }
  return null;
}
