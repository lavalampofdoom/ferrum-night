export const TILE = 32;
export const MAP_W = 400;
export const MAP_H = 260;

/** Geographic bounds covering Fairy Stone Park Rd through Rocky Mount. */
export const WEST = -80.12;
export const EAST = -79.84;
export const SOUTH = 36.875;
export const NORTH = 37.035;

export const VIEW_TILES_X = 17;
export const FIXED_DT = 1 / 60;
export const MAX_FRAME_DT = 0.1;

export const PLAYER_SPEED = 92;
export const PLAYER_SPRINT = 138;
export const ZOMBIE_SPEED = 22;
export const ZOMBIE_TOWN_SPEED = 26;
export const PLAYER_RADIUS = 9;
export const ZOMBIE_RADIUS = 11;

export const INFECTION_TIME = 180;

export const T = {
  GRASS: 0,
  TALL: 1,
  FOREST: 2,
  DIRT: 3,
  ASPHALT: 4,
  LINE: 5,
  PARKING: 6,
  WALK: 7,
  WATER: 8,
  CROP: 9,
  WOOD: 10,
  WALL: 11,
} as const;

export type TileId = (typeof T)[keyof typeof T];

export const BLOCKED: Record<number, boolean> = {
  [T.WATER]: true,
  [T.WALL]: true,
};

export function geoToWorld(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng - WEST) / (EAST - WEST)) * MAP_W * TILE,
    y: ((NORTH - lat) / (NORTH - SOUTH)) * MAP_H * TILE,
  };
}

export function geoToTile(lat: number, lng: number): { tx: number; ty: number } {
  const w = geoToWorld(lat, lng);
  return { tx: Math.round(w.x / TILE), ty: Math.round(w.y / TILE) };
}
