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
  range: number;
  attackSpeed: number;
  lastAttackTime: number;
  position: Position;
  targetId?: string | null;
  label: string;
  color: string;
  radius: number;
  special?: string;
  isConverted?: boolean;
  imagePath?: string;
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
  status: 'playing' | 'gameover';
  winner?: Faction | 'draw';
  elixir: {
    player: number;
    enemy: number;
  };
  units: Unit[];
  towers: Tower[];
  deck: CardDef[];
  hand: CardDef[];
  nextCard: CardDef | null;
  enemyNextSpawnTime: number;
}
