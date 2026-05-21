import { Faction, CardDef, Position } from "./types";

export const ARENA_WIDTH = 400;
export const ARENA_HEIGHT = 600;

export const RIVER_Y = 300;
export const RIVER_HEIGHT = 40;

export const BRIDGE_WIDTH = 60;
export const LEFT_BRIDGE_X = 100;
export const RIGHT_BRIDGE_X = 300;

export const TICK_RATE = 1000 / 60; // 60fps
export const RENDER_RATE = 100; // ms

export const MAX_ELIXIR = 10;
export const ELIXIR_RATE = 1; // per second

export const GAME_DURATION = 120; // 2 minutes in seconds

export const TOWER_KING_HP = 3000;
export const TOWER_PRINCESS_HP = 1500;
export const TOWER_DAMAGE = 50;
export const TOWER_ATTACK_SPEED = 1; // attacks per second
export const TOWER_RANGE = 120;

export const getTowerPositions = (faction: Faction): Record<string, Position> => {
  const isPlayer = faction === 'player';
  const baseY = isPlayer ? ARENA_HEIGHT - 60 : 60;
  const princessY = isPlayer ? ARENA_HEIGHT - 140 : 140;

  return {
    king: { x: ARENA_WIDTH / 2, y: baseY },
    leftPrincess: { x: 70, y: princessY },
    rightPrincess: { x: ARENA_WIDTH - 70, y: princessY },
  };
};
