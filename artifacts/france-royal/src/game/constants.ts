import { Faction, Position } from "./types";

export const ARENA_WIDTH = 400;
export const ARENA_HEIGHT = 600;

export const RIVER_Y = 300;
export const RIVER_HEIGHT = 40;

export const BRIDGE_WIDTH = 60;
export const LEFT_BRIDGE_X = 100;
export const RIGHT_BRIDGE_X = 300;

export const TICK_RATE = 1000 / 60;
export const RENDER_RATE = 50; // ms — ~20 renders/sec for smooth motion

export const MAX_ELIXIR = 10;
export const ELIXIR_RATE = 1; // per second

export const GAME_DURATION = 120; // seconds
// Last 30 seconds of regulation (and the whole overtime period): elixir
// regenerates twice as fast.
export const DOUBLE_ELIXIR_THRESHOLD = 30;
// Sudden-death overtime length when regulation ends in a tower-tie. First
// crown destroyed wins; if it expires still tied, the match is a draw.
export const OVERTIME_DURATION = 120;

export const TOWER_KING_HP = 3000;
export const TOWER_PRINCESS_HP = 1500;
export const TOWER_DAMAGE = 60;
export const TOWER_ATTACK_SPEED = 0.8;
export const TOWER_RANGE = 110;

// How close an enemy unit must be before a unit stops chasing the tower and fights it
export const UNIT_AGGRO_RANGE = 75;

export const getTowerPositions = (faction: Faction): Record<string, Position> => {
  const isPlayer = faction === 'player';
  const baseY = isPlayer ? ARENA_HEIGHT - 55 : 55;
  const princessY = isPlayer ? ARENA_HEIGHT - 140 : 140;

  return {
    king: { x: ARENA_WIDTH / 2, y: baseY },
    leftPrincess: { x: 80, y: princessY },
    rightPrincess: { x: ARENA_WIDTH - 80, y: princessY },
  };
};
