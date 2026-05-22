export type Faction = 'player' | 'enemy';

export interface Position {
  x: number;
  y: number;
}

export interface Unit {
  id: string;
  type: string;
  name: string;
  faction: Faction;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  baseSpeed: number;
  speedMult: number;
  range: number;
  attackSpeed: number;
  lastAttackTime: number;
  position: Position;
  label: string;
  color: string;
  radius: number;
  special?: string;
  isConverted?: boolean;
  imagePath?: string;
  spawnTime: number;
  // URSSAF boss spell: when set, unit has been transformed into an unpaid invoice.
  transformedAsInvoice?: boolean;
}

export interface Tower {
  id: string;
  faction: Faction;
  type: 'king' | 'princess';
  hp: number;
  maxHp: number;
  position: Position;
  range: number;
  damage: number;
  attackSpeed: number;
  lastAttackTime: number;
}

export interface CardDef {
  id: string;
  fullName: string;
  name: string;
  powerName: string;
  powerDesc: string;
  cost: number;
  color: string;
  label: string;
  spawnCount: number;
  baseHp: number;
  baseDamage: number;
  speed: number;
  range: number;
  attackSpeed: number;
  radius: number;
  special?: string;
  imagePath?: string;
}

export interface GameState {
  timeRemaining: number;
  elapsedTime: number;
  status: 'playing' | 'gameover';
  winner?: Faction | 'draw';
  isMultiplayer: boolean;
  elixir: {
    player: number;
    enemy: number;
  };
  units: Unit[];
  towers: Tower[];
  // Player 1 hand
  deck: CardDef[];
  hand: CardDef[];
  nextCard: CardDef | null;
  // Player 2 hand (multiplayer)
  enemyDeck: CardDef[];
  enemyHand: CardDef[];
  enemyNextCard: CardDef | null;
  enemyNextSpawnTime: number;
  floatingTexts: FloatingText[];
  // URSSAF boss effect: global, lasts until game ends. The caster's units/towers
  // are protected; the opponent's units are transformed into invoices and slowly
  // die, opponent towers take DOT, and the caster's own towers become invisible
  // from the opponent's viewpoint.
  urssafEffect?: { casterFaction: Faction; startTime: number } | null;
  // Active "Impôt" perimeters. Each enemy unit that enters drains 1 elixir
  // from its faction (once per zone). Auto-expires after `duration`.
  taxZones: TaxZone[];
  // Solo AI tuning. 0 = beginner (random, slow), 1 = expert (reactive, hoards
  // elixir, prefers high-cost cards). Computed once from the player's level.
  aiDifficulty: number;
  // Card IDs the AI is allowed to play in solo. Restricted to what the player
  // actually owns, so beginners never face cards they haven't unlocked yet.
  aiCardPool: string[];
  // Deterministic RNG. In MP it's seeded from the shared `seed` so both peers
  // consume the exact same random stream — critical to avoid visual / gameplay
  // divergence across screens. In solo it's just Math.random.
  rng: () => number;
}

export interface TaxZone {
  id: string;
  casterFaction: Faction;
  position: Position;
  radius: number;
  createdAt: number;   // elapsedTime
  duration: number;    // seconds
  drainedIds: string[];
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  createdAt: number;
}
