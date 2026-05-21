import { GameState, CardDef, Faction, Position, Tower, Unit, FloatingText } from "./types";
import {
  ARENA_WIDTH, ARENA_HEIGHT, GAME_DURATION, MAX_ELIXIR, ELIXIR_RATE,
  TOWER_KING_HP, TOWER_PRINCESS_HP, TOWER_DAMAGE, TOWER_ATTACK_SPEED, TOWER_RANGE,
  LEFT_BRIDGE_X, RIGHT_BRIDGE_X, RIVER_Y, RIVER_HEIGHT, UNIT_AGGRO_RANGE,
  getTowerPositions
} from "./constants";
import { CARDS, DECK } from "./cards";

// ─── Initial State ──────────────────────────────────────────────────────────

export const createInitialState = (): GameState => {
  const playerTowers = getTowerPositions('player');
  const enemyTowers = getTowerPositions('enemy');

  const createTower = (id: string, faction: Faction, type: 'king' | 'princess', pos: Position): Tower => ({
    id, faction, type,
    hp: type === 'king' ? TOWER_KING_HP : TOWER_PRINCESS_HP,
    maxHp: type === 'king' ? TOWER_KING_HP : TOWER_PRINCESS_HP,
    position: pos,
    range: TOWER_RANGE,
    damage: TOWER_DAMAGE,
    attackSpeed: TOWER_ATTACK_SPEED,
    lastAttackTime: Infinity,
  });

  const shuffledDeck = [...DECK].sort(() => Math.random() - 0.5);

  return {
    timeRemaining: GAME_DURATION,
    elapsedTime: 0,
    status: 'playing',
    elixir: { player: 5, enemy: 2 },
    units: [],
    towers: [
      createTower('p_king',   'player', 'king',     playerTowers.king),
      createTower('p_l_prin', 'player', 'princess', playerTowers.leftPrincess),
      createTower('p_r_prin', 'player', 'princess', playerTowers.rightPrincess),
      createTower('e_king',   'enemy',  'king',     enemyTowers.king),
      createTower('e_l_prin', 'enemy',  'princess', enemyTowers.leftPrincess),
      createTower('e_r_prin', 'enemy',  'princess', enemyTowers.rightPrincess),
    ],
    deck: shuffledDeck.slice(5),
    hand: shuffledDeck.slice(0, 4),
    nextCard: shuffledDeck[4],
    enemyNextSpawnTime: GAME_DURATION - 10,
    floatingTexts: [],
  };
};

// ─── Main Update Loop ────────────────────────────────────────────────────────

export const updateGame = (state: GameState, dt: number) => {
  if (state.status !== 'playing') return;

  state.timeRemaining -= dt;
  state.elapsedTime   += dt;

  if (state.timeRemaining <= 0) {
    checkWinCondition(state);
    return;
  }

  // Elixir generation — enemy gets elixir slightly slower
  state.elixir.player = Math.min(MAX_ELIXIR, state.elixir.player + ELIXIR_RATE * dt);
  state.elixir.enemy  = Math.min(MAX_ELIXIR, state.elixir.enemy  + ELIXIR_RATE * 0.7 * dt);

  // Enemy AI — spawn every 8-14 seconds, prefer cheap cards
  if (state.timeRemaining <= state.enemyNextSpawnTime) {
    const allCards = Object.values(CARDS);
    // Weighted pick: cheaper cards are 3x more likely
    const weighted: CardDef[] = [];
    for (const c of allCards) {
      const weight = c.cost <= 3 ? 3 : c.cost <= 5 ? 2 : 1;
      for (let w = 0; w < weight; w++) weighted.push(c);
    }
    const card = weighted[Math.floor(Math.random() * weighted.length)];
    if (state.elixir.enemy >= card.cost) {
      state.elixir.enemy -= card.cost;
      const spawnX = 80 + Math.random() * (ARENA_WIDTH - 160);
      spawnUnit(state, card, 'enemy', { x: spawnX, y: 155 });
    }
    state.enemyNextSpawnTime = state.timeRemaining - (8 + Math.random() * 6);
  }

  // Slow aura reset each tick (recalculated below)
  for (const u of state.units) {
    u.speedMult = 1;
  }

  // Per-unit update
  for (const unit of state.units) {
    if (unit.hp <= 0) continue;

    // ── Passives ──────────────────────────────────────────────────────────

    // Piaf: heal nearby allies
    if (unit.special === 'heal_boost') {
      for (const ally of state.units) {
        if (ally.id !== unit.id && ally.faction === unit.faction) {
          if (dist(unit.position, ally.position) < 80) {
            ally.hp = Math.min(ally.maxHp, ally.hp + 20 * dt);
          }
        }
      }
    }

    // Chirac: HP regen
    if (unit.special === 'hp_regen') {
      unit.hp = Math.min(unit.maxHp, unit.hp + 20 * dt);
    }

    // Gilets Jaunes: slow aura — mark nearby enemies
    if (unit.special === 'slow_aura') {
      for (const other of state.units) {
        if (other.faction !== unit.faction && dist(unit.position, other.position) < 70) {
          other.speedMult = Math.min(other.speedMult, 0.35);
        }
      }
    }

    // Hollande (scooter crash): after 7s becomes totally confused (drastic speed loss)
    if (unit.special === 'scooter_crash') {
      const age = state.elapsedTime - unit.spawnTime;
      if (age > 7) {
        unit.speedMult = Math.min(unit.speedMult, 0.15);
      }
    }

    // ── Targeting & Movement ──────────────────────────────────────────────

    const effectiveSpeed = unit.baseSpeed * unit.speedMult;

    // 1. Find an enemy UNIT within aggro range (skip for building_target)
    const nearbyEnemy = unit.special !== 'building_target'
      ? findNearbyUnit(state, unit, UNIT_AGGRO_RANGE)
      : null;

    // 2. Find the target tower to walk toward
    const targetTower = findTargetTower(state, unit);

    if (nearbyEnemy) {
      const d = dist(unit.position, nearbyEnemy.position);
      if (d <= unit.range + nearbyEnemy.radius) {
        // In melee range — attack
        if (unit.lastAttackTime - state.timeRemaining >= unit.attackSpeed) {
          attackUnit(unit, nearbyEnemy, state);
          unit.lastAttackTime = state.timeRemaining;
        }
      } else {
        // Chase the nearby enemy
        moveToward(unit, nearbyEnemy.position, effectiveSpeed, dt);
      }
    } else if (targetTower) {
      const d = dist(unit.position, targetTower.position);
      if (d <= unit.range + 20) {
        // Attack the tower
        if (unit.lastAttackTime - state.timeRemaining >= unit.attackSpeed) {
          attackTower(unit, targetTower, state);
          unit.lastAttackTime = state.timeRemaining;
        }
      } else {
        // Navigate toward tower via bridge if river crossing needed
        const waypoint = getBridgeWaypoint(unit, targetTower.position);
        moveToward(unit, waypoint, effectiveSpeed, dt);
      }
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
        addFloatingText(state, `-${tower.damage}`, target.position, '#f87171');
      }
    }
  }

  // Cleanup dead units
  state.units = state.units.filter(u => u.hp > 0);

  // Expire floating texts
  state.floatingTexts = state.floatingTexts.filter(
    ft => state.elapsedTime - ft.createdAt < 1.2
  );

  // Check king towers
  const deadKing = state.towers.find(t => t.type === 'king' && t.hp <= 0);
  if (deadKing) checkWinCondition(state);
};

// ─── Card Play ───────────────────────────────────────────────────────────────

export const playCard = (state: GameState, cardIndex: number, pos: Position): boolean => {
  const card = state.hand[cardIndex];
  if (!card || state.elixir.player < card.cost) return false;

  state.elixir.player -= card.cost;

  // Clamp to player's half
  const spawnPos: Position = {
    x: Math.max(20, Math.min(ARENA_WIDTH - 20, pos.x)),
    y: Math.max(ARENA_HEIGHT / 2 + 15, Math.min(ARENA_HEIGHT - 20, pos.y)),
  };

  spawnUnit(state, card, 'player', spawnPos);

  // Macron "Réformes" — costs the player 2 extra elixir
  if (card.special === 'tax_allies') {
    state.elixir.player = Math.max(0, state.elixir.player - 2);
    addFloatingText(state, '-2 elixir (reforme)', spawnPos, '#fbbf24');
  }

  // Draw next card
  if (state.nextCard) {
    state.hand[cardIndex] = state.nextCard;
    const next = state.deck.length > 0
      ? state.deck.shift()!
      : DECK[Math.floor(Math.random() * DECK.length)];
    state.deck.push(card);
    state.nextCard = next;
  }

  return true;
};

// ─── Spawn ───────────────────────────────────────────────────────────────────

const spawnUnit = (state: GameState, card: CardDef, faction: Faction, pos: Position) => {
  // Steal elixir on spawn (Taxe/Impôt)
  if (card.special === 'steal_elixir' && faction === 'player') {
    const stolen = Math.min(2, state.elixir.enemy);
    state.elixir.enemy = Math.max(0, state.elixir.enemy - stolen);
    state.elixir.player = Math.min(MAX_ELIXIR, state.elixir.player + stolen);
    addFloatingText(state, `+${stolen} elixir vole !`, pos, '#4ade80');
  }

  for (let i = 0; i < card.spawnCount; i++) {
    const isMain = i === 0;
    const offsetX = i === 0 ? 0 : (i % 2 === 0 ? 1 : -1) * 22 * Math.ceil(i / 2);
    const offsetY = i > 0 ? 18 * Math.floor(i / 2) : 0;

    const hp = isMain ? card.baseHp : Math.round(card.baseHp * 0.45);
    const dmg = isMain ? card.baseDamage : Math.round(card.baseDamage * 0.45);

    state.units.push({
      id: Math.random().toString(36).slice(2, 10),
      type: card.id,
      name: card.fullName,
      faction,
      hp,
      maxHp: hp,
      damage: dmg,
      speed: card.speed,
      baseSpeed: card.speed,
      speedMult: 1,
      range: card.range,
      attackSpeed: card.attackSpeed,
      lastAttackTime: Infinity,
      position: { x: pos.x + offsetX, y: pos.y + offsetY },
      label: isMain ? card.label : (card.id === 'gilets' ? 'GJ' : 'MIN'),
      color: faction === 'player' ? '#2563eb' : '#dc2626',
      radius: isMain ? card.radius : Math.round(card.radius * 0.7),
      special: isMain ? card.special : undefined,
      imagePath: isMain ? card.imagePath : undefined,
      spawnTime: state.elapsedTime,
    });
  }
};

// ─── Pathfinding / Movement ──────────────────────────────────────────────────

const riverTop    = RIVER_Y - RIVER_HEIGHT / 2;
const riverBottom = RIVER_Y + RIVER_HEIGHT / 2;

/**
 * If the unit needs to cross the river, return a bridge waypoint instead of
 * heading straight for the target (which would walk through water).
 */
const getBridgeWaypoint = (unit: Unit, targetPos: Position): Position => {
  const uy = unit.position.y;
  const ty = targetPos.y;

  const needsCross = (uy <= riverTop && ty >= riverBottom) ||
                     (uy >= riverBottom && ty <= riverTop);

  if (!needsCross) return targetPos;

  // Choose nearest bridge
  const leftDist  = Math.abs(unit.position.x - LEFT_BRIDGE_X);
  const rightDist = Math.abs(unit.position.x - RIGHT_BRIDGE_X);
  const bridgeX   = leftDist <= rightDist ? LEFT_BRIDGE_X : RIGHT_BRIDGE_X;

  // Aim for the far edge of the bridge
  const bridgeY = uy >= riverBottom ? riverTop - 5 : riverBottom + 5;

  return { x: bridgeX, y: bridgeY };
};

const moveToward = (unit: Unit, target: Position, speed: number, dt: number) => {
  const dx = target.x - unit.position.x;
  const dy = target.y - unit.position.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  unit.position.x += (dx / len) * speed * dt;
  unit.position.y += (dy / len) * speed * dt;
};

// ─── Targeting ───────────────────────────────────────────────────────────────

/**
 * Find the nearest enemy unit within aggroRange, or null.
 */
const findNearbyUnit = (state: GameState, unit: Unit, aggroRange: number): Unit | null => {
  let closest: Unit | null = null;
  let minD = aggroRange;
  for (const u of state.units) {
    if (u.faction !== unit.faction && u.hp > 0) {
      const d = dist(unit.position, u.position);
      if (d < minD) { minD = d; closest = u; }
    }
  }
  return closest;
};

/**
 * Find the enemy tower this unit should march toward.
 * Princess towers are targeted first; King Tower is locked until a princess falls.
 * For building_target units, they head straight for a tower.
 */
const findTargetTower = (state: GameState, unit: Unit): Tower | null => {
  const enemy: Faction = unit.faction === 'player' ? 'enemy' : 'player';
  const enemyTowers = state.towers.filter(t => t.faction === enemy && t.hp > 0);

  const princesses = enemyTowers.filter(t => t.type === 'princess');
  if (princesses.length > 0) {
    // Target the nearest princess tower
    return princesses.reduce((a, b) =>
      dist(unit.position, a.position) <= dist(unit.position, b.position) ? a : b
    );
  }

  // All princesses dead → king tower is unlocked
  return enemyTowers.find(t => t.type === 'king') ?? null;
};

const findTargetForTower = (state: GameState, tower: Tower): Unit | null => {
  let closest: Unit | null = null;
  let minD = tower.range;
  for (const u of state.units) {
    if (u.faction !== tower.faction && u.hp > 0) {
      const d = dist(tower.position, u.position);
      if (d <= minD) { minD = d; closest = u; }
    }
  }
  return closest;
};

// ─── Combat ──────────────────────────────────────────────────────────────────

const attackUnit = (attacker: Unit, target: Unit, state: GameState) => {
  if (attacker.special === 'conversion' && !target.isConverted && Math.random() < 0.4) {
    target.faction     = attacker.faction;
    target.color       = attacker.faction === 'player' ? '#3b82f6' : '#ef4444';
    target.isConverted = true;
    addFloatingText(state, 'Converti !', target.position, '#a78bfa');
    return;
  }

  if (attacker.special === 'aoe' || attacker.special === 'friendly_fire') {
    const friendlyFire = attacker.special === 'friendly_fire';
    for (const u of state.units) {
      const isEnemy = u.faction !== attacker.faction;
      if ((isEnemy || friendlyFire) && dist(attacker.position, u.position) <= attacker.range + 40) {
        const dmg = isEnemy ? attacker.damage : Math.round(attacker.damage * 0.5);
        u.hp -= dmg;
        addFloatingText(state, `-${dmg}`, u.position, isEnemy ? '#f87171' : '#fb923c');
      }
    }
    return;
  }

  if (attacker.special === 'splash_pets') {
    target.hp -= attacker.damage;
    addFloatingText(state, `-${attacker.damage}`, target.position, '#f87171');
    for (const u of state.units) {
      if (u.faction !== attacker.faction && u.id !== target.id &&
          dist(target.position, u.position) <= 35) {
        const splash = Math.round(attacker.damage * 0.5);
        u.hp -= splash;
        addFloatingText(state, `-${splash}`, u.position, '#fda4af');
      }
    }
    return;
  }

  target.hp -= attacker.damage;
  addFloatingText(state, `-${attacker.damage}`, target.position, '#f87171');
};

const attackTower = (attacker: Unit, tower: Tower, state: GameState) => {
  if (attacker.special === 'friendly_fire') {
    // JM Le Pen also clips nearby allies
    for (const u of state.units) {
      if (u.faction === attacker.faction && dist(attacker.position, u.position) < 60) {
        const selfDmg = Math.round(attacker.damage * 0.3);
        u.hp -= selfDmg;
        addFloatingText(state, `-${selfDmg}`, u.position, '#fb923c');
      }
    }
  }
  tower.hp -= attacker.damage;
  addFloatingText(state, `-${attacker.damage}`, tower.position, '#fbbf24');
};

// ─── Win Condition ────────────────────────────────────────────────────────────

const checkWinCondition = (state: GameState) => {
  const pKing = state.towers.find(t => t.type === 'king' && t.faction === 'player');
  const eKing = state.towers.find(t => t.type === 'king' && t.faction === 'enemy');

  if (!pKing || pKing.hp <= 0) { state.status = 'gameover'; state.winner = 'enemy'; return; }
  if (!eKing || eKing.hp <= 0) { state.status = 'gameover'; state.winner = 'player'; return; }

  if (state.timeRemaining <= 0) {
    const pAlive = state.towers.filter(t => t.faction === 'player' && t.hp > 0).length;
    const eAlive = state.towers.filter(t => t.faction === 'enemy'  && t.hp > 0).length;
    state.status = 'gameover';
    if (pAlive > eAlive)      state.winner = 'player';
    else if (eAlive > pAlive) state.winner = 'enemy';
    else                       state.winner = 'draw';
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const dist = (a: Position, b: Position) =>
  Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

const addFloatingText = (
  state: GameState,
  text: string,
  pos: Position,
  color: string
) => {
  state.floatingTexts.push({
    id: Math.random().toString(36).slice(2),
    text,
    x: pos.x + (Math.random() - 0.5) * 20,
    y: pos.y - 10,
    color,
    createdAt: state.elapsedTime,
  });
};
