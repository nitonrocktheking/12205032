import { GameState, CardDef, Faction, Position, Tower, Unit } from "./types";
import { 
  ARENA_WIDTH, ARENA_HEIGHT, GAME_DURATION, MAX_ELIXIR, ELIXIR_RATE,
  TOWER_KING_HP, TOWER_PRINCESS_HP, TOWER_DAMAGE, TOWER_ATTACK_SPEED, TOWER_RANGE,
  getTowerPositions
} from "./constants";
import { CARDS, DECK } from "./cards";

export const createInitialState = (): GameState => {
  const playerTowers = getTowerPositions('player');
  const enemyTowers = getTowerPositions('enemy');

  const createTower = (id: string, faction: Faction, type: 'king' | 'princess', pos: Position): Tower => ({
    id,
    faction,
    type,
    hp: type === 'king' ? TOWER_KING_HP : TOWER_PRINCESS_HP,
    maxHp: type === 'king' ? TOWER_KING_HP : TOWER_PRINCESS_HP,
    position: pos,
    range: TOWER_RANGE,
    damage: TOWER_DAMAGE,
    attackSpeed: TOWER_ATTACK_SPEED,
    lastAttackTime: 0
  });

  const shuffledDeck = [...DECK].sort(() => Math.random() - 0.5);

  return {
    timeRemaining: GAME_DURATION,
    status: 'playing',
    elixir: { player: 5, enemy: 5 },
    units: [],
    towers: [
      createTower('p_king', 'player', 'king', playerTowers.king),
      createTower('p_l_prin', 'player', 'princess', playerTowers.leftPrincess),
      createTower('p_r_prin', 'player', 'princess', playerTowers.rightPrincess),
      createTower('e_king', 'enemy', 'king', enemyTowers.king),
      createTower('e_l_prin', 'enemy', 'princess', enemyTowers.leftPrincess),
      createTower('e_r_prin', 'enemy', 'princess', enemyTowers.rightPrincess),
    ],
    deck: shuffledDeck.slice(5),
    hand: shuffledDeck.slice(0, 4),
    nextCard: shuffledDeck[4],
    enemyNextSpawnTime: 0,
  };
};

export const updateGame = (state: GameState, dt: number) => {
  if (state.status !== 'playing') return;

  state.timeRemaining -= dt;
  if (state.timeRemaining <= 0) {
    checkWinCondition(state);
    return;
  }

  // Elixir
  if (state.elixir.player < MAX_ELIXIR) state.elixir.player = Math.min(MAX_ELIXIR, state.elixir.player + ELIXIR_RATE * dt);
  if (state.elixir.enemy < MAX_ELIXIR) state.elixir.enemy = Math.min(MAX_ELIXIR, state.elixir.enemy + ELIXIR_RATE * dt);

  // Simple Enemy AI
  if (state.timeRemaining < state.enemyNextSpawnTime) {
    const randomCard = DECK[Math.floor(Math.random() * DECK.length)];
    if (state.elixir.enemy >= randomCard.cost) {
      state.elixir.enemy -= randomCard.cost;
      spawnUnit(state, randomCard, 'enemy', { x: 50 + Math.random() * (ARENA_WIDTH - 100), y: 150 });
      state.enemyNextSpawnTime = state.timeRemaining - (2 + Math.random() * 3);
    }
  }

  // Units
  for (const unit of state.units) {
    if (unit.hp <= 0) continue;

    // Find target
    const target = findTarget(state, unit);
    if (target) {
      const dist = distance(unit.position, target.position);
      if (dist <= unit.range) {
        // Attack
        if (state.timeRemaining < unit.lastAttackTime - unit.attackSpeed) {
          attack(unit, target, state);
          unit.lastAttackTime = state.timeRemaining;
        }
      } else {
        // Move towards
        const dirX = target.position.x - unit.position.x;
        const dirY = target.position.y - unit.position.y;
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        unit.position.x += (dirX / len) * unit.speed * dt;
        unit.position.y += (dirY / len) * unit.speed * dt;
      }
    } else {
       // Move forward default
       unit.position.y += unit.faction === 'player' ? -unit.speed * dt : unit.speed * dt;
    }
  }

  // Towers
  for (const tower of state.towers) {
    if (tower.hp <= 0) continue;
    const target = findTargetForTower(state, tower);
    if (target) {
      if (state.timeRemaining < tower.lastAttackTime - tower.attackSpeed) {
        target.hp -= tower.damage;
        tower.lastAttackTime = state.timeRemaining;
      }
    }
  }

  // Cleanup dead
  state.units = state.units.filter(u => u.hp > 0);
  
  // Check Towers
  const deadTowers = state.towers.filter(t => t.hp <= 0);
  if (deadTowers.some(t => t.type === 'king')) {
    checkWinCondition(state);
  }
};

const spawnUnit = (state: GameState, card: CardDef, faction: Faction, pos: Position) => {
  for (let i = 0; i < card.spawnCount; i++) {
    const isMain = i === 0;
    const offset = i * 20;
    state.units.push({
      id: Math.random().toString(36).substr(2, 9),
      type: card.id,
      name: isMain ? card.name : `${card.name} minion`,
      faction,
      hp: isMain ? card.baseHp : card.baseHp / 2,
      maxHp: isMain ? card.baseHp : card.baseHp / 2,
      damage: isMain ? card.baseDamage : card.baseDamage / 2,
      speed: card.speed,
      range: card.range,
      attackSpeed: card.attackSpeed,
      lastAttackTime: 0,
      position: { x: pos.x + offset, y: pos.y },
      label: card.label,
      color: faction === 'player' ? '#2563eb' : '#dc2626',
      radius: isMain ? card.radius : card.radius * 0.7,
      special: isMain ? card.special : undefined
    });
  }
};

export const playCard = (state: GameState, cardIndex: number, pos: Position) => {
  const card = state.hand[cardIndex];
  if (!card || state.elixir.player < card.cost) return false;

  state.elixir.player -= card.cost;
  spawnUnit(state, card, 'player', pos);

  // Draw new card
  if (state.nextCard) {
    state.hand[cardIndex] = state.nextCard;
    const nextDeck = state.deck.length > 0 ? state.deck.shift()! : DECK[Math.floor(Math.random() * DECK.length)];
    state.deck.push(card);
    state.nextCard = nextDeck;
  }
  return true;
};

const distance = (p1: Position, p2: Position) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

const findTarget = (state: GameState, unit: Unit): { position: Position, hp: number } | null => {
  let closest: any = null;
  let minDist = Infinity;

  const check = (list: any[]) => {
    for (const t of list) {
      if (t.faction !== unit.faction && t.hp > 0) {
        if (unit.special === 'building_target' && (t as any).label) continue; // skip units if building target
        const d = distance(unit.position, t.position);
        if (d < minDist) {
          minDist = d;
          closest = t;
        }
      }
    }
  };

  check(state.units);
  check(state.towers);

  return closest;
};

const findTargetForTower = (state: GameState, tower: Tower): Unit | null => {
  let closest: Unit | null = null;
  let minDist = tower.range;

  for (const u of state.units) {
    if (u.faction !== tower.faction && u.hp > 0) {
      const d = distance(tower.position, u.position);
      if (d <= minDist) {
        minDist = d;
        closest = u;
      }
    }
  }
  return closest;
};

const attack = (unit: Unit, target: any, state: GameState) => {
  if (unit.special === 'conversion' && target.label && Math.random() < 0.4 && !target.isConverted) {
    target.faction = unit.faction;
    target.color = unit.faction === 'player' ? '#2563eb' : '#dc2626';
    target.isConverted = true;
  } else if (unit.special === 'aoe') {
    state.units.forEach(u => {
      if (u.faction !== unit.faction && distance(unit.position, u.position) <= unit.range + 20) {
        u.hp -= unit.damage;
      }
    });
    target.hp -= unit.damage;
  } else {
    target.hp -= unit.damage;
  }
};

const checkWinCondition = (state: GameState) => {
  const pKing = state.towers.find(t => t.type === 'king' && t.faction === 'player');
  const eKing = state.towers.find(t => t.type === 'king' && t.faction === 'enemy');

  if (!pKing || pKing.hp <= 0) {
    state.status = 'gameover';
    state.winner = 'enemy';
    return;
  }
  if (!eKing || eKing.hp <= 0) {
    state.status = 'gameover';
    state.winner = 'player';
    return;
  }

  if (state.timeRemaining <= 0) {
    const pTowers = state.towers.filter(t => t.faction === 'player' && t.hp > 0).length;
    const eTowers = state.towers.filter(t => t.faction === 'enemy' && t.hp > 0).length;
    state.status = 'gameover';
    if (pTowers > eTowers) state.winner = 'player';
    else if (eTowers > pTowers) state.winner = 'enemy';
    else state.winner = 'draw';
  }
};
