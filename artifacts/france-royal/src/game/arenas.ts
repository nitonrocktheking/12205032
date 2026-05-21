export interface ArenaTheme {
  id: string;
  name: string;
  emoji: string;
  minLevel: number;
  grassTop: string;
  grassBottom: string;
  tileLight: string;
  tileDark: string;
  riverTop: string;
  riverBottom: string;
  riverBorder: string;
  bridgeColor: string;
  bridgeBorder: string;
  borderColor: string;
  borderHighlight: string;
  pathColor: string;
  gridOpacity: number;
}

export const ARENAS: ArenaTheme[] = [
  {
    id: "champ-de-mars",
    name: "Champ-de-Mars",
    emoji: "🌳",
    minLevel: 1,
    grassTop: "#4ade80",
    grassBottom: "#22c55e",
    tileLight: "#86efac",
    tileDark: "#22c55e",
    riverTop: "#0ea5e9",
    riverBottom: "#22d3ee",
    riverBorder: "#0369a1",
    bridgeColor: "#b45309",
    bridgeBorder: "#78350f",
    borderColor: "#78716c",
    borderHighlight: "#d6d3d1",
    pathColor: "#a8a29e",
    gridOpacity: 0.0,
  },
  {
    id: "versailles",
    name: "Jardins de Versailles",
    emoji: "👑",
    minLevel: 3,
    grassTop: "#84cc16",
    grassBottom: "#65a30d",
    tileLight: "#bef264",
    tileDark: "#65a30d",
    riverTop: "#06b6d4",
    riverBottom: "#22d3ee",
    riverBorder: "#854d0e",
    bridgeColor: "#a16207",
    bridgeBorder: "#fbbf24",
    borderColor: "#fde68a",
    borderHighlight: "#fef3c7",
    pathColor: "#fde68a",
    gridOpacity: 0.0,
  },
  {
    id: "mont-saint-michel",
    name: "Mont-Saint-Michel",
    emoji: "⛪",
    minLevel: 6,
    grassTop: "#d6d3d1",
    grassBottom: "#a8a29e",
    tileLight: "#e7e5e4",
    tileDark: "#a8a29e",
    riverTop: "#14b8a6",
    riverBottom: "#5eead4",
    riverBorder: "#0f766e",
    bridgeColor: "#57534e",
    bridgeBorder: "#292524",
    borderColor: "#44403c",
    borderHighlight: "#78716c",
    pathColor: "#a8a29e",
    gridOpacity: 0.0,
  },
  {
    id: "bastille",
    name: "Place de la Bastille",
    emoji: "🗽",
    minLevel: 10,
    grassTop: "#475569",
    grassBottom: "#334155",
    tileLight: "#64748b",
    tileDark: "#334155",
    riverTop: "#1e293b",
    riverBottom: "#475569",
    riverBorder: "#7f1d1d",
    bridgeColor: "#7f1d1d",
    bridgeBorder: "#fbbf24",
    borderColor: "#1f2937",
    borderHighlight: "#dc2626",
    pathColor: "#64748b",
    gridOpacity: 0.0,
  },
  {
    id: "elysee",
    name: "Palais de l'Élysée",
    emoji: "🏛️",
    minLevel: 15,
    grassTop: "#991b1b",
    grassBottom: "#7f1d1d",
    tileLight: "#b91c1c",
    tileDark: "#7f1d1d",
    riverTop: "#a16207",
    riverBottom: "#eab308",
    riverBorder: "#422006",
    bridgeColor: "#422006",
    bridgeBorder: "#facc15",
    borderColor: "#422006",
    borderHighlight: "#facc15",
    pathColor: "#fde68a",
    gridOpacity: 0.0,
  },
  {
    id: "champs-elysees",
    name: "Champs-Élysées",
    emoji: "🗼",
    minLevel: 20,
    grassTop: "#1e293b",
    grassBottom: "#0f172a",
    tileLight: "#334155",
    tileDark: "#1e293b",
    riverTop: "#4338ca",
    riverBottom: "#6366f1",
    riverBorder: "#1e1b4b",
    bridgeColor: "#1e1b4b",
    bridgeBorder: "#818cf8",
    borderColor: "#0f172a",
    borderHighlight: "#a5b4fc",
    pathColor: "#cbd5e1",
    gridOpacity: 0.0,
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
