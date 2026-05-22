// French-politician-style guest usernames. ASCII-only so they satisfy the
// /^[a-zA-Z0-9_-]{3,20}$/ rule already enforced for displayName.
const POOL = [
  "DeputeDuPeuple", "JeanJaures2", "MachoMacro", "LaFranceQuiPique",
  "ToutPourMoi", "PresidentDuSofa", "MinistreDuVide", "LeFontainier",
  "VoteUtile", "EluDeNulPart", "QuintaCinquieme", "SenatorialeDuVar",
  "ReformeRetraite", "PrefetDuRER", "Commissionnaire", "SmicNiv1",
  "LobbyFromage", "AbstentionMax", "ReacDe2027", "BureauDeVote",
  "AssembleeFantome", "BavardBistrot", "TVA22", "Decrochage",
  "BFMTValeur", "MotionCensure", "CafeDuCommerce", "PetitMarquis",
  "JauneFluo", "PalaisBourbon",
];

function rand(n: number) { return Math.floor(Math.random() * n); }

// Returns a candidate username that fits the regex; caller is responsible for
// the case-insensitive uniqueness check (and may call this multiple times).
export function randomGuestUsername(): string {
  const base = POOL[rand(POOL.length)];
  const suffix = rand(900) + 100; // 3 digits, avoids leading zero
  // Cap at 20 chars — base is ≤ 16, suffix is 3, separator is 1, all fine.
  return `${base}_${suffix}`.slice(0, 20);
}
