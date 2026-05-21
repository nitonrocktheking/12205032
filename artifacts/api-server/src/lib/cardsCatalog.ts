export const ALL_CARDS = [
  "macron", "melenchon", "hollande", "sarkozy", "philippe",
  "gilets", "taxe", "piaf",
  "zemmour", "marine", "bardella", "bardot", "chirac", "jmlepen",
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
