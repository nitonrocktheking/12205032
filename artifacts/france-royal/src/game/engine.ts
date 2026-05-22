import { GameState, CardDef, Faction, Position, Tower, Unit } from "./types";
import {
  ARENA_WIDTH, ARENA_HEIGHT, GAME_DURATION, MAX_ELIXIR, ELIXIR_RATE,
  TOWER_KING_HP, TOWER_PRINCESS_HP, TOWER_DAMAGE, TOWER_ATTACK_SPEED, TOWER_RANGE,
  LEFT_BRIDGE_X, RIGHT_BRIDGE_X, RIVER_Y, RIVER_HEIGHT, UNIT_AGGRO_RANGE,
  getTowerPositions
} from "./constants";
import { CARDS, DECK } from "./cards";

// ─── Seeded RNG (mulberry32) ─────────────────────────────────────────────────
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Initial State ────────────────────────────────────────────────────────────
export interface SoloOptions {
  playerLevel?: number;
  aiCardPool?: string[];
}

export const createInitialState = (
  seed?: number,
  playerDeckIds?: string[],
  enemyDeckIds?: string[],
  solo?: SoloOptions,
): GameState => {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random;
  // Same generator is stored on the state and reused for every later random
  // roll (combat conversion, spawn jitter, etc.) so both MP peers stay in sync.
  const stateRng: () => number = rng;

  const playerTowers = getTowerPositions('player');
  const enemyTowers  = getTowerPositions('enemy');

  const createTower = (id: string, faction: Faction, type: 'king' | 'princess', pos: Position): Tower => ({
    id, faction, type,
    hp:   type === 'king' ? TOWER_KING_HP    : TOWER_PRINCESS_HP,
    maxHp:type === 'king' ? TOWER_KING_HP    : TOWER_PRINCESS_HP,
    position: pos, range: TOWER_RANGE, damage: TOWER_DAMAGE,
    attackSpeed: TOWER_ATTACK_SPEED, lastAttackTime: Infinity,
  });

  const resolveDeck = (ids?: string[]) => {
    if (!ids || ids.length < 4) return DECK;
    const resolved = ids.map((id) => CARDS[id]).filter((c): c is CardDef => !!c);
    return resolved.length >= 4 ? resolved : DECK;
  };

  const playerShuffle = shuffleWithRng(resolveDeck(playerDeckIds), rng);
  const enemyShuffle  = shuffleWithRng(resolveDeck(enemyDeckIds),  rng);
  const isMultiplayer = seed !== undefined;

  // Difficulty ramps from level 1 (purely random AI) to level 15+ (full smart).
  const level = Math.max(1, solo?.playerLevel ?? 1);
  const aiDifficulty = Math.min(1, (level - 1) / 14);
  // AI is restricted to the cards the player owns. Defaults to the player's
  // current deck if no explicit pool was supplied — that way beginners never
  // see cards they haven't unlocked yet.
  const aiCardPool = (solo?.aiCardPool && solo.aiCardPool.length > 0)
    ? solo.aiCardPool.filter((id) => !!CARDS[id])
    : (playerDeckIds && playerDeckIds.length > 0 ? playerDeckIds.filter((id) => !!CARDS[id]) : Object.keys(CARDS));

  return {
    timeRemaining: GAME_DURATION,
    elapsedTime: 0,
    status: 'playing',
    isMultiplayer,
    elixir: { player: 5, enemy: isMultiplayer ? 5 : 2 },
    units: [],
    towers: [
      createTower('p_king',   'player', 'king',     playerTowers.king),
      createTower('p_l_prin', 'player', 'princess', playerTowers.leftPrincess),
      createTower('p_r_prin', 'player', 'princess', playerTowers.rightPrincess),
      createTower('e_king',   'enemy',  'king',     enemyTowers.king),
      createTower('e_l_prin', 'enemy',  'princess', enemyTowers.leftPrincess),
      createTower('e_r_prin', 'enemy',  'princess', enemyTowers.rightPrincess),
    ],
    deck:     playerShuffle.slice(5),
    hand:     playerShuffle.slice(0, 4),
    nextCard: playerShuffle[4],
    enemyDeck:     enemyShuffle.slice(5),
    enemyHand:     enemyShuffle.slice(0, 4),
    enemyNextCard: enemyShuffle[4],
    enemyNextSpawnTime: GAME_DURATION - 10,
    floatingTexts: [],
    taxZones: [],
    aiDifficulty,
    aiCardPool,
    rng: stateRng,
  };
};

// Visual + gameplay radius of "L'Impôt" perimeter (in arena coords)
const TAX_ZONE_RADIUS = 70;
const TAX_ZONE_DURATION = 10;
let taxZoneCounter = 0;

// ─── Main Update Loop ─────────────────────────────────────────────────────────
export const updateGame = (state: GameState, dt: number) => {
  if (state.status !== 'playing') return;

  state.timeRemaining -= dt;
  state.elapsedTime   += dt;

  if (state.timeRemaining <= 0) { checkWinCondition(state); return; }

  // Elixir — same rate for both players in solo and MP. No AI handicap or boost.
  state.elixir.player = Math.min(MAX_ELIXIR, state.elixir.player + ELIXIR_RATE * dt);
  state.elixir.enemy  = Math.min(MAX_ELIXIR, state.elixir.enemy  + ELIXIR_RATE * dt);

  // Solo AI (disabled in multiplayer). Cadence scales with difficulty: 7s
  // between plays at level 1, ~3s at level 15+.
  if (!state.isMultiplayer && state.timeRemaining <= state.enemyNextSpawnTime) {
    runEnemyAI(state);
    const baseCadence = 7 - 4 * state.aiDifficulty;
    state.enemyNextSpawnTime = state.timeRemaining - (baseCadence + Math.random() * 2);
  }

  // Reset speed mults
  for (const u of state.units) u.speedMult = 1;

  // Unit updates
  for (const unit of state.units) {
    if (unit.hp <= 0) continue;
    // Transformed invoices don't act — they just wait to die.
    if (unit.transformedAsInvoice) continue;

    // Passives
    if (unit.special === 'heal_boost') {
      for (const ally of state.units) {
        if (ally.id !== unit.id && ally.faction === unit.faction && dist(unit.position, ally.position) < 80)
          ally.hp = Math.min(ally.maxHp, ally.hp + 20 * dt);
      }
    }
    if (unit.special === 'hp_regen') {
      unit.hp = Math.min(unit.maxHp, unit.hp + 20 * dt);
    }
    if (unit.special === 'slow_aura') {
      for (const other of state.units) {
        if (other.faction !== unit.faction && dist(unit.position, other.position) < 70)
          other.speedMult = Math.min(other.speedMult, 0.35);
      }
    }
    if (unit.special === 'scooter_crash') {
      const age = state.elapsedTime - unit.spawnTime;
      if (age > 7) unit.speedMult = Math.min(unit.speedMult, 0.15);
    }

    const effectiveSpeed = unit.baseSpeed * unit.speedMult;
    const nearbyEnemy = unit.special !== 'building_target'
      ? findNearbyUnit(state, unit, UNIT_AGGRO_RANGE) : null;
    const targetTower = findTargetTower(state, unit);

    if (nearbyEnemy) {
      const d = dist(unit.position, nearbyEnemy.position);
      if (d <= unit.range + nearbyEnemy.radius) {
        if (unit.lastAttackTime - state.timeRemaining >= unit.attackSpeed) {
          attackUnit(unit, nearbyEnemy, state);
          unit.lastAttackTime = state.timeRemaining;
        }
      } else {
        moveToward(unit, nearbyEnemy.position, effectiveSpeed, dt);
      }
    } else if (targetTower) {
      const d = dist(unit.position, targetTower.position);
      if (d <= unit.range + 20) {
        if (unit.lastAttackTime - state.timeRemaining >= unit.attackSpeed) {
          attackTower(unit, targetTower, state);
          unit.lastAttackTime = state.timeRemaining;
        }
      } else {
        moveToward(unit, getBridgeWaypoint(unit, targetTower.position), effectiveSpeed, dt);
      }
    }
  }

  // Tower attacks
  for (const tower of state.towers) {
    if (tower.hp <= 0) continue;
    const target = findTargetForTower(state, tower);
    if (target && tower.lastAttackTime - state.timeRemaining >= tower.attackSpeed) {
      target.hp -= tower.damage;
      tower.lastAttackTime = state.timeRemaining;
      addFloat(state, `-${tower.damage}`, target.position, '#f87171');
    }
  }

  // ── Tax zones (L'Impôt) — continuous drain: 1 elixir per second per enemy
  // unit currently inside the zone. Sustained over time so the drain is clearly
  // visible on the victim's bar and survives small position desyncs between MP
  // peers (a one-frame difference no longer means a missed drain).
  if (state.taxZones.length > 0) {
    state.taxZones = state.taxZones.filter(z => state.elapsedTime - z.createdAt < z.duration);
    for (const zone of state.taxZones) {
      const victimFaction: Faction = zone.casterFaction === 'player' ? 'enemy' : 'player';
      let unitsInside = 0;
      for (const u of state.units) {
        if (u.faction !== victimFaction || u.hp <= 0) continue;
        if (dist(u.position, zone.position) <= zone.radius + u.radius) {
          unitsInside++;
          // Fire a one-shot "-1 elixir/s" tag the first time a given unit
          // enters the zone, so the victim sees they're being taxed.
          if (!zone.drainedIds.includes(u.id)) {
            zone.drainedIds.push(u.id);
            addFloat(state, '-1 elixir/s', u.position, '#fbbf24');
          }
        }
      }
      if (unitsInside > 0) {
        const drain = unitsInside * dt; // 1 elixir per second per unit inside
        state.elixir[victimFaction] = Math.max(0, state.elixir[victimFaction] - drain);
      }
    }
  }

  // ── URSSAF global effect: transform opponent units into invoices and DOT them + their towers.
  if (state.urssafEffect) {
    const caster = state.urssafEffect.casterFaction;
    const INVOICE_UNIT_DOT  = 40; // dmg per second to enemy units
    const INVOICE_TOWER_DOT = 18; // dmg per second to enemy towers
    for (const u of state.units) {
      if (u.faction !== caster && u.hp > 0) {
        u.transformedAsInvoice = true;
        u.speedMult = 0;
        u.damage = 0;
        u.hp -= INVOICE_UNIT_DOT * dt;
      }
    }
    for (const t of state.towers) {
      if (t.faction !== caster && t.hp > 0) {
        t.hp -= INVOICE_TOWER_DOT * dt;
      }
    }
  }

  state.units = state.units.filter(u => u.hp > 0);
  state.floatingTexts = state.floatingTexts.filter(ft => state.elapsedTime - ft.createdAt < 1.2);

  if (state.towers.find(t => t.type === 'king' && t.hp <= 0)) checkWinCondition(state);
};

// ─── Solo AI ──────────────────────────────────────────────────────────────────
// Behavior scales with `state.aiDifficulty` (0 = beginner, 1 = expert):
//   - card pool is restricted to `state.aiCardPool` (player-owned cards only)
//   - low difficulty: random pick, no threat reaction, no hoarding
//   - high difficulty: reacts to threats, hoards elixir, prefers heavy cards
const runEnemyAI = (state: GameState) => {
  const diff = state.aiDifficulty;
  const allowedIds = new Set(state.aiCardPool);
  const playable = Object.values(CARDS).filter(
    c => allowedIds.has(c.id)
      && c.special !== 'urssaf'
      && c.spawnCount > 0
      && state.elixir.enemy >= c.cost,
  );
  if (playable.length === 0) return;

  const elx = state.elixir.enemy;

  // Threat detection — only kicks in at mid+ difficulty.
  const reactsToThreats = diff >= 0.35;
  const threats = reactsToThreats
    ? state.units.filter(u => u.faction === 'player' && u.hp > 0 && u.position.y <= RIVER_Y + 40)
    : [];
  const biggestThreat = threats.length === 0
    ? null
    : threats.reduce((a, b) => (a.hp + a.damage * 2 > b.hp + b.damage * 2 ? a : b));

  // Elixir hoarding — only at higher difficulty, and only when not threatened.
  const hoards = diff >= 0.6;
  if (hoards && !biggestThreat && elx < MAX_ELIXIR - 0.5) {
    if (elx < 4) return;
    if (elx < 7 && Math.random() < 0.35) return;
  }

  // Card selection.
  let card: CardDef;
  if (biggestThreat) {
    const counters = playable
      .filter(c => c.cost <= Math.max(4, Math.floor(elx)))
      .sort((a, b) => (b.baseDamage * b.spawnCount) - (a.baseDamage * a.spawnCount));
    card = counters[0] ?? playable[Math.floor(Math.random() * playable.length)];
  } else if (diff < 0.5) {
    // Beginner AI: random affordable card.
    card = playable[Math.floor(Math.random() * playable.length)];
  } else {
    // Expert AI: favor expensive cards.
    const sorted = [...playable].sort((a, b) => b.cost - a.cost);
    const pickIdx = Math.floor(Math.pow(Math.random(), 2) * sorted.length);
    card = sorted[pickIdx];
  }

  // Lane choice.
  let spawnX: number;
  let spawnY: number;
  if (biggestThreat) {
    spawnX = clamp(biggestThreat.position.x, 30, ARENA_WIDTH - 30);
    spawnY = clamp(biggestThreat.position.y - 25, 50, RIVER_Y - 20);
  } else if (diff >= 0.5) {
    const playerPrincesses = state.towers.filter(
      t => t.faction === 'player' && t.type === 'princess' && t.hp > 0,
    );
    let target: Tower | undefined;
    if (playerPrincesses.length > 0) {
      target = playerPrincesses.reduce((a, b) => (a.hp <= b.hp ? a : b));
    } else {
      target = state.towers.find(t => t.faction === 'player' && t.type === 'king' && t.hp > 0);
    }
    spawnX = target ? clamp(target.position.x + (Math.random() - 0.5) * 30, 30, ARENA_WIDTH - 30)
                    : 80 + Math.random() * (ARENA_WIDTH - 160);
    spawnY = 120 + Math.random() * 40;
  } else {
    // Beginner: random placement on AI side.
    spawnX = 60 + Math.random() * (ARENA_WIDTH - 120);
    spawnY = 120 + Math.random() * 40;
  }

  state.elixir.enemy -= card.cost;
  spawnUnit(state, card, 'enemy', { x: spawnX, y: spawnY });
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ─── Play Card (player faction) ───────────────────────────────────────────────
export const playCard = (state: GameState, cardIndex: number, pos: Position): boolean => {
  const card = state.hand[cardIndex];
  if (!card || state.elixir.player < card.cost) return false;

  // URSSAF: spell — global effect, no unit spawned.
  if (card.id === 'urssaf') {
    if (state.urssafEffect) return false;
    state.elixir.player -= card.cost;
    state.urssafEffect = { casterFaction: 'player', startTime: state.elapsedTime };
    addFloat(state, 'AVIS DE REDRESSEMENT !', { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 }, '#fbbf24');
    drawNextCard(state, cardIndex, 'player');
    return true;
  }

  state.elixir.player -= card.cost;

  const spawnPos: Position = {
    x: Math.max(20, Math.min(ARENA_WIDTH - 20, pos.x)),
    y: Math.max(ARENA_HEIGHT / 2 + 15, Math.min(ARENA_HEIGHT - 20, pos.y)),
  };

  if (card.special === 'tax_zone') {
    state.taxZones.push({
      id: `tz${++taxZoneCounter}`,
      casterFaction: 'player',
      position: spawnPos,
      radius: TAX_ZONE_RADIUS,
      createdAt: state.elapsedTime,
      duration: TAX_ZONE_DURATION,
      drainedIds: [],
    });
    addFloat(state, 'CONTROLE FISCAL !', spawnPos, '#fbbf24');
    drawNextCard(state, cardIndex, 'player');
    return true;
  }

  spawnUnit(state, card, 'player', spawnPos);

  if (card.special === 'tax_allies') {
    state.elixir.player = Math.max(0, state.elixir.player - 2);
    addFloat(state, '-2 elixir (reforme)', spawnPos, '#fbbf24');
  }

  drawNextCard(state, cardIndex, 'player');
  return true;
};

// ─── Play Card (enemy faction — multiplayer Player 2) ────────────────────────
export const playEnemyCard = (state: GameState, cardIndex: number, pos: Position): boolean => {
  const card = state.enemyHand[cardIndex];
  if (!card || state.elixir.enemy < card.cost) return false;

  // URSSAF: spell — global effect, no unit spawned.
  if (card.id === 'urssaf') {
    if (state.urssafEffect) return false;
    state.elixir.enemy -= card.cost;
    state.urssafEffect = { casterFaction: 'enemy', startTime: state.elapsedTime };
    addFloat(state, 'AVIS DE REDRESSEMENT !', { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 }, '#fbbf24');
    drawNextCard(state, cardIndex, 'enemy');
    return true;
  }

  state.elixir.enemy -= card.cost;

  const spawnPos: Position = {
    x: Math.max(20, Math.min(ARENA_WIDTH - 20, pos.x)),
    y: Math.min(ARENA_HEIGHT / 2 - 15, Math.max(20, pos.y)),
  };

  if (card.special === 'tax_zone') {
    state.taxZones.push({
      id: `tz${++taxZoneCounter}`,
      casterFaction: 'enemy',
      position: spawnPos,
      radius: TAX_ZONE_RADIUS,
      createdAt: state.elapsedTime,
      duration: TAX_ZONE_DURATION,
      drainedIds: [],
    });
    addFloat(state, 'CONTROLE FISCAL !', spawnPos, '#fbbf24');
    drawNextCard(state, cardIndex, 'enemy');
    return true;
  }

  spawnUnit(state, card, 'enemy', spawnPos);

  if (card.special === 'tax_allies') {
    state.elixir.enemy = Math.max(0, state.elixir.enemy - 2);
    addFloat(state, '-2 elixir (reforme)', spawnPos, '#fbbf24');
  }

  drawNextCard(state, cardIndex, 'enemy');
  return true;
};

function drawNextCard(state: GameState, cardIndex: number, faction: Faction) {
  if (faction === 'player') {
    const next = state.nextCard;
    if (!next || state.deck.length === 0) return;
    // The card we just played goes to the back of the deck (Clash Royale rotation).
    const played = state.hand[cardIndex];
    state.hand[cardIndex] = next;
    state.nextCard = state.deck.shift()!;
    state.deck.push(played);
  } else {
    const next = state.enemyNextCard;
    if (!next || state.enemyDeck.length === 0) return;
    const played = state.enemyHand[cardIndex];
    state.enemyHand[cardIndex] = next;
    state.enemyNextCard = state.enemyDeck.shift()!;
    state.enemyDeck.push(played);
  }
}

// ─── Spawn ────────────────────────────────────────────────────────────────────
let unitCounter = 0;

const spawnUnit = (state: GameState, card: CardDef, faction: Faction, pos: Position) => {
  if (card.special === 'steal_elixir') {
    if (faction === 'player') {
      const stolen = Math.min(2, state.elixir.enemy);
      state.elixir.enemy  -= stolen;
      state.elixir.player = Math.min(MAX_ELIXIR, state.elixir.player + stolen);
      addFloat(state, `+${stolen} elixir vole !`, pos, '#4ade80');
    } else {
      const stolen = Math.min(2, state.elixir.player);
      state.elixir.player -= stolen;
      state.elixir.enemy  = Math.min(MAX_ELIXIR, state.elixir.enemy + stolen);
      addFloat(state, `+${stolen} elixir vole !`, pos, '#4ade80');
    }
  }

  for (let i = 0; i < card.spawnCount; i++) {
    const isMain = i === 0;
    const offsetX = i === 0 ? 0 : (i % 2 === 0 ? 1 : -1) * 22 * Math.ceil(i / 2);
    const offsetY = i > 0 ? 18 * Math.floor(i / 2) : 0;
    const hp  = isMain ? card.baseHp  : Math.round(card.baseHp  * 0.45);
    const dmg = isMain ? card.baseDamage : Math.round(card.baseDamage * 0.45);

    state.units.push({
      id: `u${++unitCounter}`,
      type: card.id,
      name: card.fullName,
      faction,
      hp, maxHp: hp, damage: dmg,
      speed: card.speed, baseSpeed: card.speed, speedMult: 1,
      range: card.range, attackSpeed: card.attackSpeed, lastAttackTime: Infinity,
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

// ─── Pathfinding ──────────────────────────────────────────────────────────────
const riverTop    = RIVER_Y - RIVER_HEIGHT / 2;
const riverBottom = RIVER_Y + RIVER_HEIGHT / 2;

const getBridgeWaypoint = (unit: Unit, targetPos: Position): Position => {
  const uy = unit.position.y;
  const ty = targetPos.y;
  const needsCross = (uy <= riverTop && ty >= riverBottom) || (uy >= riverBottom && ty <= riverTop);
  if (!needsCross) return targetPos;
  const leftD  = Math.abs(unit.position.x - LEFT_BRIDGE_X);
  const rightD = Math.abs(unit.position.x - RIGHT_BRIDGE_X);
  const bx = leftD <= rightD ? LEFT_BRIDGE_X : RIGHT_BRIDGE_X;
  return { x: bx, y: uy >= riverBottom ? riverTop - 5 : riverBottom + 5 };
};

const moveToward = (unit: Unit, target: Position, speed: number, dt: number) => {
  const dx = target.x - unit.position.x;
  const dy = target.y - unit.position.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  unit.position.x += (dx / len) * speed * dt;
  unit.position.y += (dy / len) * speed * dt;
};

// ─── Targeting ────────────────────────────────────────────────────────────────
const findNearbyUnit = (state: GameState, unit: Unit, range: number): Unit | null => {
  let closest: Unit | null = null;
  let minD = range;
  for (const u of state.units) {
    if (u.faction !== unit.faction && u.hp > 0) {
      const d = dist(unit.position, u.position);
      if (d < minD) { minD = d; closest = u; }
    }
  }
  return closest;
};

const findTargetTower = (state: GameState, unit: Unit): Tower | null => {
  const ef: Faction = unit.faction === 'player' ? 'enemy' : 'player';
  const towers = state.towers.filter(t => t.faction === ef && t.hp > 0);
  const princesses = towers.filter(t => t.type === 'princess');
  if (princesses.length > 0) {
    return princesses.reduce((a, b) => dist(unit.position, a.position) <= dist(unit.position, b.position) ? a : b);
  }
  return towers.find(t => t.type === 'king') ?? null;
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

// ─── Combat ───────────────────────────────────────────────────────────────────
const attackUnit = (attacker: Unit, target: Unit, state: GameState) => {
  if (attacker.special === 'conversion' && !target.isConverted && state.rng() < 0.4) {
    target.faction = attacker.faction;
    target.color = attacker.faction === 'player' ? '#3b82f6' : '#ef4444';
    target.isConverted = true;
    addFloat(state, 'Converti !', target.position, '#a78bfa');
    return;
  }
  if (attacker.special === 'aoe' || attacker.special === 'friendly_fire') {
    const ff = attacker.special === 'friendly_fire';
    for (const u of state.units) {
      const isEnemy = u.faction !== attacker.faction;
      if ((isEnemy || ff) && dist(attacker.position, u.position) <= attacker.range + 40) {
        const dmg = isEnemy ? attacker.damage : Math.round(attacker.damage * 0.5);
        u.hp -= dmg;
        addFloat(state, `-${dmg}`, u.position, isEnemy ? '#f87171' : '#fb923c');
      }
    }
    return;
  }
  if (attacker.special === 'splash_pets') {
    target.hp -= attacker.damage;
    addFloat(state, `-${attacker.damage}`, target.position, '#f87171');
    for (const u of state.units) {
      if (u.faction !== attacker.faction && u.id !== target.id && dist(target.position, u.position) <= 35) {
        const splash = Math.round(attacker.damage * 0.5);
        u.hp -= splash;
        addFloat(state, `-${splash}`, u.position, '#fda4af');
      }
    }
    return;
  }
  target.hp -= attacker.damage;
  addFloat(state, `-${attacker.damage}`, target.position, '#f87171');
};

const attackTower = (attacker: Unit, tower: Tower, state: GameState) => {
  if (attacker.special === 'friendly_fire') {
    for (const u of state.units) {
      if (u.faction === attacker.faction && dist(attacker.position, u.position) < 60) {
        const sd = Math.round(attacker.damage * 0.3);
        u.hp -= sd;
        addFloat(state, `-${sd}`, u.position, '#fb923c');
      }
    }
  }
  tower.hp -= attacker.damage;
  addFloat(state, `-${attacker.damage}`, tower.position, '#fbbf24');
};

// ─── Win ──────────────────────────────────────────────────────────────────────
const checkWinCondition = (state: GameState) => {
  const pK = state.towers.find(t => t.type === 'king' && t.faction === 'player');
  const eK = state.towers.find(t => t.type === 'king' && t.faction === 'enemy');
  if (!pK || pK.hp <= 0) { state.status = 'gameover'; state.winner = 'enemy'; return; }
  if (!eK || eK.hp <= 0) { state.status = 'gameover'; state.winner = 'player'; return; }
  if (state.timeRemaining <= 0) {
    const pa = state.towers.filter(t => t.faction === 'player' && t.hp > 0).length;
    const ea = state.towers.filter(t => t.faction === 'enemy'  && t.hp > 0).length;
    state.status = 'gameover';
    state.winner = pa > ea ? 'player' : ea > pa ? 'enemy' : 'draw';
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const dist = (a: Position, b: Position) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

const addFloat = (state: GameState, text: string, pos: Position, color: string) => {
  state.floatingTexts.push({
    id: `f${++unitCounter}`,
    text, color, createdAt: state.elapsedTime,
    x: pos.x + (state.rng() - 0.5) * 18,
    y: pos.y - 10,
  });
};
