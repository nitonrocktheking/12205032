// Satirical French-politics-style usernames for the solo AI opponent.
// Picked once per match so the player has a "named" foe in the HUD.
const AI_USERNAMES = [
  "DéputéDuPeuple", "MachoMacro69", "JeanJaurès2.0", "LaFranceQuiPique",
  "ToutPourMoi", "PrésidentDuSofa", "MinistreDuVide", "LeFontainier",
  "VoteUtile", "ÉluDeNulPart", "QuintaCinquième", "SénatorialeDuVar",
  "RéformeRetraite", "PréfetDuRER", "CommissionEuropé", "SmicNiv1",
  "LobbyDuFromage", "AbstentionMax", "RéacDe2027", "RoulementDeBureau",
  "AssembléeFantôme", "BavardDeBistrot", "BurkiniGate", "TVA22%",
  "DécrochageScolaire", "BFMTValeur",
];

export function randomAiUsername(): string {
  return AI_USERNAMES[Math.floor(Math.random() * AI_USERNAMES.length)];
}
