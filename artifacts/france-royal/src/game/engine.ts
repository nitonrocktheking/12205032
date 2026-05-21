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
    lastAttackTime: Infinity
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
    enemyNextSpawnTime: GAME_DURATION - 4,
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

  // Enemy AI — spawn when timeRemaining crosses enemyNextSpawnTime
  if (state.timeRemaining <= state.enemyNextSpawnTime) {
    const allCards = Object.values(CARDS);
    const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
    if (state.elixir.enemy >= randomCard.cost) {
      state.elixir.enemy -= randomCard.cost;
      const spawnX = 80 + Math.random() * (ARENA_WIDTH - 160);
      spawnUnit(state, randomCard, 'enemy', { x: spawnX, y: 160 });
    }
    state.enemyNextSpawnTime = state.timeRemaining - (3 + Math.random() * 4);
  }

  // Units
  for (const unit of state.units) {
    if (unit.hp <= 0) continue;

    if (unit.special === 'heal_boost') {
      // Piaf heals nearby allies
      for (const ally of state.units) {
        if (ally.faction === unit.faction && ally.id !== unit.id) {
          const d = distance(unit.position, ally.position);
          if (d < 80) {
            ally.hp = Math.min(ally.maxHp, ally.hp + 5 * dt);
          }
        }
      }
    }

    const target = findTarget(state, unit);
    if (target) {
      const dist = distance(unit.position, target.position);
      if (dist <= unit.range + (target as any).radius || dist <= unit.range + 20) {
        // In range — attack if cooldown elapsed
        // lastAttackTime stores the timeRemaining value when last attack happened
        // Since timeRemaining decreases, enough time has passed when:
        // lastAttackTime - timeRemaining >= attackSpeed  (i.e. attackSpeed seconds have elapsed)
        if (unit.lastAttackTime - state.timeRemaining >= unit.attackSpeed) {
          attack(unit, target, state);
          unit.lastAttackTime = state.timeRemaining;
        }
      } else {
        // Move towards target
        const dirX = target.position.x - unit.position.x;
        const dirY = target.position.y - unit.position.y;
        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        if (len > 0) {
          unit.position.x += (dirX / len) * unit.speed * dt;
          unit.position.y += (dirY / len) * unit.speed * dt;
        }
      }
    } else {
      // No target — walk forward toward enemy
      unit.position.y += unit.faction === 'player' ? -unit.speed * dt : unit.speed * dt;
    }
  }

  // Tower attacks
  for (const tower of state.towers) {
    if (tower.hp <= 0) continue;
    const target = findTargetForTower(state, tower);
    if (target) {
      if (tower.lastAttackTime - state.timeRemaining >= tower.attackSpeed) {
        target.hp -= tower.damage;
        tower.lastAttackTime = state.timeRemaining;
      }
    }
  }

  // Cleanup dead units
  state.units = state.units.filter(u => u.hp > 0);

  // Check win condition when a king tower dies
  const deadKing = state.towers.find(t => t.type === 'king' && t.hp <= 0);
  if (deadKing) {
    checkWinCondition(state);
  }
};

const spawnUnit = (state: GameState, card: CardDef, faction: Faction, pos: Position) => {
  for (let i = 0; i < card.spawnCount; i++) {
    const isMain = i === 0;
    const offsetX = i === 0 ? 0 : (i % 2 === 0 ? 1 : -1) * 25 * Math.ceil(i / 2);
    const offsetY = i > 0 ? 20 * Math.floor(i / 2) : 0;
    state.units.push({
      id: Math.random().toString(36).substr(2, 9),
      type: card.id,
      name: isMain ? card.fullName : `Insoumis`,
      faction,
      hp: isMain ? card.baseHp : Math.round(card.baseHp * 0.5),
      maxHp: isMain ? card.baseHp : Math.round(card.baseHp * 0.5),
      damage: isMain ? card.baseDamage : Math.round(card.baseDamage * 0.5),
      speed: card.speed,
      range: card.range,
      attackSpeed: card.attackSpeed,
      lastAttackTime: Infinity,
      position: { x: pos.x + offsetX, y: pos.y + offsetY },
      label: isMain ? card.label : 'INS',
      color: faction === 'player' ? '#2563eb' : '#dc2626',
      radius: isMain ? card.radius : Math.round(card.radius * 0.7),
      special: isMain ? card.special : undefined,
      imagePath: isMain ? card.imagePath : undefined,
    });
  }
};

export const playCard = (state: GameState, cardIndex: number, pos: Position) => {
  const card = state.hand[cardIndex];
  if (!card || state.elixir.player < card.cost) return false;

  state.elixir.player -= card.cost;

  // Clamp spawn position to player's side (bottom half)
  const spawnPos = {
    x: Math.max(20, Math.min(ARENA_WIDTH - 20, pos.x)),
    y: Math.max(ARENA_HEIGHT / 2 + 10, Math.min(ARENA_HEIGHT - 20, pos.y)),
  };

  spawnUnit(state, card, 'player', spawnPos);

  // Draw new card from deck
  if (state.nextCard) {
    state.hand[cardIndex] = state.nextCard;
    const nextDeck = state.deck.length > 0 ? state.deck.shift()! : DECK[Math.floor(Math.random() * DECK.length)];
    state.deck.push(card);
    state.nextCard = nextDeck;
  }
  return true;
};

const distance = (p1: Position, p2: Position) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

const findTarget = (state: GameState, unit: Unit): { position: Position; hp: number; faction?: string; radius?: number } | null => {
  let closest: any = null;
  let minDist = Infinity;

  const check = (list: any[]) => {
    for (const t of list) {
      if (t.faction !== unit.faction && t.hp > 0) {
        // building_target skips enemy units and only targets towers
        if (unit.special === 'building_target' && t.radius !== undefined) continue;
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

const attack = (attacker: Unit, target: any, state: GameState) => {
  if (attacker.special === 'conversion' && target.radius !== undefined && Math.random() < 0.4 && !target.isConverted) {
    // Zemmour converts enemy units
    target.faction = attacker.faction;
    target.color = attacker.faction === 'player' ? '#3b82f6' : '#ef4444';
    target.isConverted = true;
  } else if (attacker.special === 'aoe') {
    // Mélenchon — AoE splash around the target
    for (const u of state.units) {
      if (u.faction !== attacker.faction && distance(attacker.position, u.position) <= attacker.range + 40) {
        u.hp -= attacker.damage * 0.6;
      }
    }
    target.hp -= attacker.damage;
  } else if (attacker.special === 'splash_pets') {
    // Bardot — pets deal splash
    target.hp -= attacker.damage;
    for (const u of state.units) {
      if (u.faction !== attacker.faction && u.id !== target.id && distance(target.position, u.position) <= 30) {
        u.hp -= attacker.damage * 0.5;
      }
    }
  } else {
    target.hp -= attacker.damage;
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
