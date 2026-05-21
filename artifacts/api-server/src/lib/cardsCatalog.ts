export const ALL_CARDS = [
  // Starters
  "macron", "melenchon", "hollande", "sarkozy", "philippe",
  "gilets", "taxe", "piaf",
  // Original unlockables
  "zemmour", "marine", "bardella", "bardot", "chirac", "jmlepen",
  // Présidents historiques
  "degaulle", "mitterrand", "giscard", "pompidou",
  // Figures historiques
  "napoleon", "jeanne", "louis14", "robespierre", "danton",
  // Ministres contemporains
  "attal", "borne", "castex", "valls", "royal", "fillon", "lemaire", "darmanin",
  // Groupes / corps de métier
  "crs", "agriculteur", "pompier", "journaliste", "lyceen", "taxi",
  "syndicat", "sncf", "ouvrier",
] as const;

export const STARTER_CARDS = [
  "macron", "melenchon", "hollande", "sarkozy", "philippe",
  "gilets", "taxe", "piaf",
] as const;

export const UNLOCKABLE_CARDS = ALL_CARDS.filter(
  (c) => !(STARTER_CARDS as readonly string[]).includes(c),
);

export type CardId = (typeof ALL_CARDS)[number];

export function isValidCardId(s: string): s is CardId {
  return (ALL_CARDS as readonly string[]).includes(s);
}
