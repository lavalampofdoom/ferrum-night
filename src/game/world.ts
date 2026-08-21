import {
  geoToTile,
  geoToWorld,
  MAP_H,
  MAP_W,
  SOLID_CELL,
  T,
  TILE,
  TREE_RADIUS,
  type TileId,
} from "./constants";
import { HOUSES, LANDMARKS, ROADS, STREETS, WATERWAYS, type GeoPlace, type GeoRoad } from "./geo-data";
import { fbm, hash2, mulberry32 } from "./rng";

export type BldKind =
  | "house"
  | "ranch"
  | "clinic"
  | "kfc"
  | "lowes"
  | "courthouse"
  | "college"
  | "church"
  | "gas";

export type Building = {
  id: string;
  kind: BldKind;
  name: string;
  address: string;
  x: number;
  y: number;
  w: number;
  h: number;
  doorX: number;
  doorY: number;
  claimable: boolean;
  claimed: boolean;
  lootTable: string;
  zone: "rural" | "ferrum" | "town";
};

export type Tree = {
  id: number;
  x: number;
  y: number;
  kind: "pine" | "oak";
  hp: number;
  chopped: boolean;
};

export type Prop = {
  id: number;
  x: number;
  y: number;
  kind: string;
  solid: boolean;
};

export type Zombie = {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  facing: number;
  vx: number;
  vy: number;
  walk: number;
  attackCd: number;
  wanderT: number;
  wx: number;
  wy: number;
  hitT: number;
  alive: boolean;
  brute: boolean;
  paintT: number;
};

export type CritterKind = "doe" | "buck" | "fawn" | "bear" | "cub" | "turkey" | "squirrel";

export type Critter = {
  id: number;
  kind: CritterKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  walk: number;
  hp: number;
  alive: boolean;
  pack: number;
  follow: number;
  dashT: number;
};

export type Interact = {
  id: string;
  kind: "loot" | "bed" | "chest" | "bench" | "door" | "claim";
  x: number;
  y: number;
  r: number;
  searched?: boolean;
  label: string;
};

export type Interior = {
  buildingId: string;
  w: number;
  h: number;
  tiles: Uint8Array;
  blocked: Uint8Array;
  furniture: Interact[];
  spawnX: number;
  spawnY: number;
};

export type World = {
  tiles: Uint8Array;
  blocked: Uint8Array;
  buildings: Building[];
  trees: Tree[];
  props: Prop[];
  zombies: Zombie[];
  critters: Critter[];
  startX: number;
  startY: number;
  gridW: number;
  treeGrid: number[][];
};

const W = MAP_W;
const H = MAP_H;

function idx(tx: number, ty: number) {
  return ty * W + tx;
}

function inMap(tx: number, ty: number) {
  return tx >= 0 && ty >= 0 && tx < W && ty < H;
}

function stamp(tiles: Uint8Array, tx: number, ty: number, t: TileId, r = 0) {
  for (let y = ty - r; y <= ty + r; y++) {
    for (let x = tx - r; x <= tx + r; x++) {
      if (inMap(x, y)) tiles[idx(x, y)] = t;
    }
  }
}

function paintRoad(tiles: Uint8Array, ax: number, ay: number, bx: number, by: number, width = 2) {
  const dx = bx - ax;
  const dy = by - ay;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 3));
  const asphaltW = Math.max(0, width);
  const shoulder = asphaltW + 1;
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(ax + (dx * i) / steps);
    const y = Math.round(ay + (dy * i) / steps);
    for (let oy = y - shoulder; oy <= y + shoulder; oy++) {
      for (let ox = x - shoulder; ox <= x + shoulder; ox++) {
        if (!inMap(ox, oy)) continue;
        const t = tiles[idx(ox, oy)]!;
        if (t === T.GRASS || t === T.TALL || t === T.FOREST || t === T.CROP) {
          tiles[idx(ox, oy)] = T.DIRT;
        }
      }
    }
    stamp(tiles, x, y, T.ASPHALT, asphaltW);
    if (asphaltW >= 1 && i % 2 === 0) stamp(tiles, x, y, T.LINE, 0);
  }
}

function paintPoly(tiles: Uint8Array, road: GeoRoad, asWater = false) {
  const p = road.pts;
  for (let i = 0; i + 3 < p.length; i += 2) {
    const a = geoToTile(p[i]!, p[i + 1]!);
    const b = geoToTile(p[i + 2]!, p[i + 3]!);
    if (asWater) {
      const dx = b.tx - a.tx;
      const dy = b.ty - a.ty;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 2));
      for (let s = 0; s <= steps; s++) {
        stamp(
          tiles,
          Math.round(a.tx + (dx * s) / steps),
          Math.round(a.ty + (dy * s) / steps),
          T.WATER,
          1,
        );
      }
    } else {
      paintRoad(tiles, a.tx, a.ty, b.tx, b.ty, Math.max(1, road.w));
    }
  }
}

function parking(tiles: Uint8Array, tx: number, ty: number, w: number, h: number) {
  for (let y = ty; y < ty + h; y++) {
    for (let x = tx; x < tx + w; x++) {
      if (inMap(x, y)) tiles[idx(x, y)] = T.PARKING;
    }
  }
}

function clampSize(kind: BldKind, tw: number, th: number): { tw: number; th: number } {
  const max: Record<BldKind, [number, number]> = {
    house: [2, 2],
    ranch: [3, 2],
    clinic: [4, 3],
    kfc: [3, 3],
    lowes: [5, 4],
    courthouse: [4, 4],
    college: [3, 3],
    church: [3, 4],
    gas: [3, 2],
  };
  const [mw, mh] = max[kind];
  return { tw: Math.min(Math.max(tw, 2), mw), th: Math.min(Math.max(th, 2), mh) };
}

function overlaps(buildings: Building[], x: number, y: number, w: number, h: number): boolean {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const minD = Math.max(58, (w + h) / 2);
  for (const b of buildings) {
    const d = Math.hypot(cx - (b.x + b.w / 2), cy - (b.y + b.h / 2));
    if (d < minD) return true;
  }
  return false;
}

function placeFrom(lm: GeoPlace, buildings: Building[], tiles: Uint8Array, blocked: Uint8Array, force: boolean) {
  const p = geoToWorld(lm.lat, lm.lng);
  const { tw, th } = clampSize(lm.kind, lm.tw, lm.th);
  const w = tw * TILE;
  const h = th * TILE;
  const x = p.x - w / 2;
  const y = p.y - h / 2;
  if (x < 16 || y < 16 || x + w > W * TILE - 16 || y + h > H * TILE - 16) return;
  if (!force && overlaps(buildings, x, y, w, h)) return;
  const b: Building = {
    id: lm.id,
    kind: lm.kind,
    name: lm.name,
    address: lm.address,
    x,
    y,
    w,
    h,
    doorX: x + w / 2,
    doorY: y + h + 6,
    claimable: lm.claimable,
    claimed: false,
    lootTable: lm.loot,
    zone: lm.zone,
  };
  buildings.push(b);
  footprint(tiles, blocked, b);
  if (lm.kind === "kfc" || lm.kind === "lowes" || lm.kind === "gas" || lm.kind === "clinic") {
    const t0 = Math.floor((b.x - 8) / TILE);
    const t1 = Math.floor((b.y + b.h) / TILE);
    parking(tiles, t0, t1, Math.ceil(b.w / TILE) + 1, 3);
  }
}

export function generateWorld(seed = 40): World {
  const rng = mulberry32(seed);
  const tiles = new Uint8Array(W * H);
  const blocked = new Uint8Array(W * H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = fbm(x / 28, y / 28, seed);
      const west = x / W;
      const forestBias = 0.62 - west * 0.35;
      let t: TileId = T.GRASS;
      if (n > forestBias) t = T.FOREST;
      else if (n > forestBias - 0.08) t = T.TALL;
      else if (n < 0.22 && west < 0.55) t = T.CROP;
      tiles[idx(x, y)] = t;
    }
  }

  for (const creek of WATERWAYS) paintPoly(tiles, creek, true);
  for (const road of ROADS) paintPoly(tiles, road, false);
  for (const road of STREETS) paintPoly(tiles, road, false);

  const buildings: Building[] = [];
  for (const lm of LANDMARKS) placeFrom(lm, buildings, tiles, blocked, true);
  for (const h of HOUSES) placeFrom(h, buildings, tiles, blocked, false);

  const trees: Tree[] = [];
  let tid = 0;
  for (let y = 2; y < H - 2; y += 2) {
    for (let x = 2; x < W - 2; x += 2) {
      const t = tiles[idx(x, y)]!;
      if (t !== T.FOREST && t !== T.TALL) continue;
      if (hash2(x, y, seed + 9) > (t === T.FOREST ? 0.38 : 0.18)) continue;
      if (blocked[idx(x, y)]) continue;
      tid++;
      trees.push({
        id: tid,
        x: x * TILE + 16 + (hash2(x, y, 3) - 0.5) * 10,
        y: y * TILE + 16 + (hash2(x, y, 7) - 0.5) * 10,
        kind: hash2(x, y, 11) > 0.55 ? "pine" : "oak",
        hp: 3 + (hash2(x, y, 13) > 0.5 ? 2 : 0),
        chopped: false,
      });
    }
  }

  const props: Prop[] = [];
  let pid = 0;
  const propKinds = ["mailbox", "crate", "barrel", "bush", "dumpster", "tires", "fence", "hydrant", "truck"];
  for (const b of buildings) {
    if (rng() > 0.5) continue;
    pid++;
    const k = propKinds[Math.floor(rng() * propKinds.length)]!;
    props.push({
      id: pid,
      x: b.doorX + (rng() - 0.5) * 36,
      y: b.doorY + 16 + rng() * 10,
      kind: k,
      solid: k === "truck" || k === "dumpster" || k === "barrel" || k === "hydrant",
    });
  }

  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === T.WATER) blocked[i] = 1;
  }

  const gridW = Math.ceil((W * TILE) / SOLID_CELL);
  const gridH = Math.ceil((H * TILE) / SOLID_CELL);
  const treeGrid: number[][] = Array.from({ length: gridW * gridH }, () => []);
  for (let i = 0; i < trees.length; i++) {
    const t = trees[i]!;
    const cx = Math.max(0, Math.min(gridW - 1, Math.floor(t.x / SOLID_CELL)));
    const cy = Math.max(0, Math.min(gridH - 1, Math.floor(t.y / SOLID_CELL)));
    treeGrid[cy * gridW + cx]!.push(i);
  }

  const zombies: Zombie[] = [];
  let zid = 0;
  for (let y = 4; y < H - 4; y += 4) {
    for (let x = 4; x < W - 4; x += 4) {
      const dens = densityAt(x, y);
      if (rng() > dens) continue;
      const wx = x * TILE + rng() * TILE * 3;
      const wy = y * TILE + rng() * TILE * 3;
      if (blockedAt(blocked, wx, wy)) continue;
      zid++;
      const town = densityAt(x, y) > 0.2;
      const brute = rng() < (town ? 0.055 : 0.028);
      const hp = brute ? 150 + Math.floor(rng() * 40) : 56 + Math.floor(rng() * 44);
      zombies.push({
        id: zid,
        x: wx,
        y: wy,
        hp,
        maxHp: hp,
        facing: Math.floor(rng() * 4),
        vx: 0,
        vy: 0,
        walk: rng() * 4,
        attackCd: 0,
        wanderT: rng() * 4,
        wx,
        wy,
        hitT: 0,
        alive: true,
        brute,
        paintT: 0,
      });
    }
  }

  const clinic = buildings.find((b) => b.id === "clinic");
  const startX = clinic?.doorX ?? geoToWorld(36.92611, -80.01912).x;
  const startY = (clinic?.doorY ?? geoToWorld(36.92611, -80.01912).y) + 40;
  const critters = spawnWildlife(rng, blocked, tiles, seed);
  return {
    tiles,
    blocked,
    buildings,
    trees,
    props,
    zombies,
    critters,
    startX,
    startY,
    gridW,
    treeGrid,
  };
}

function footprint(tiles: Uint8Array, blocked: Uint8Array, b: Building) {
  const x0 = Math.floor(b.x / TILE);
  const y0 = Math.floor(b.y / TILE);
  const x1 = Math.ceil((b.x + b.w) / TILE);
  const y1 = Math.ceil((b.y + b.h) / TILE);
  const doorTx = Math.floor(b.doorX / TILE);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (!inMap(x, y)) continue;
      const isDoor = Math.abs(x - doorTx) <= 1 && y >= y1 - 1;
      if (!isDoor) blocked[idx(x, y)] = 1;
      const cur = tiles[idx(x, y)];
      if (cur !== T.ASPHALT && cur !== T.PARKING && cur !== T.LINE) {
        tiles[idx(x, y)] = T.DIRT;
      }
    }
  }
}

function densityAt(tx: number, ty: number): number {
  const rm = geoToTile(36.997, -79.890);
  const fe = geoToTile(36.9215, -80.0115);
  const campus = geoToTile(36.9275, -80.0215);
  const strip = geoToTile(37.014, -79.865);
  const dRm = Math.hypot(tx - rm.tx, ty - rm.ty);
  const dFe = Math.hypot(tx - fe.tx, ty - fe.ty);
  const dCa = Math.hypot(tx - campus.tx, ty - campus.ty);
  const dSt = Math.hypot(tx - strip.tx, ty - strip.ty);
  if (dRm < 16) return 0.58;
  if (dRm < 32) return 0.3;
  if (dSt < 14) return 0.42;
  if (dFe < 10 || dCa < 10) return 0.2;
  if (tx < 90) return 0.014;
  return 0.038;
}

const CRITTER_HP: Record<CritterKind, number> = {
  doe: 28,
  buck: 36,
  fawn: 14,
  bear: 480,
  cub: 220,
  turkey: 12,
  squirrel: 4,
};

function critterWalkable(blocked: Uint8Array, tiles: Uint8Array, x: number, y: number): boolean {
  if (blockedAt(blocked, x, y)) return false;
  const t = tileAt(tiles, x, y);
  return t !== T.WATER && t !== T.ASPHALT && t !== T.LINE && t !== T.PARKING && t !== T.WALL;
}

function scatterPoint(
  rng: () => number,
  blocked: Uint8Array,
  tiles: Uint8Array,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  preferCover: boolean,
): { x: number; y: number } | null {
  for (let i = 0; i < 55; i++) {
    const x = x0 + rng() * (x1 - x0);
    const y = y0 + rng() * (y1 - y0);
    if (!critterWalkable(blocked, tiles, x, y)) continue;
    if (preferCover) {
      const t = tileAt(tiles, x, y);
      if (t !== T.FOREST && t !== T.TALL && rng() > 0.4) continue;
    }
    return { x, y };
  }
  return null;
}

function spawnWildlife(rng: () => number, blocked: Uint8Array, tiles: Uint8Array, _seed: number): Critter[] {
  const out: Critter[] = [];
  let id = 0;
  const mapW = W * TILE;
  const mapH = H * TILE;
  const west = geoToWorld(36.908, -80.086);
  const ferrum = geoToWorld(36.922, -80.012);

  const add = (kind: CritterKind, x: number, y: number, pack = 0, follow = 0) => {
    id += 1;
    out.push({
      id,
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      facing: 0,
      walk: 0,
      hp: CRITTER_HP[kind],
      alive: true,
      pack,
      follow,
      dashT: 0,
    });
    return id;
  };

  const sowAt =
    scatterPoint(rng, blocked, tiles, west.x - 180, west.y - 180, west.x + 260, west.y + 260, true) ??
    scatterPoint(rng, blocked, tiles, 180, mapH * 0.55, mapW * 0.28, mapH * 0.92, true);
  if (sowAt) {
    const sowId = add("bear", sowAt.x, sowAt.y, 1, 0);
    for (let i = 0; i < 2; i++) {
      const cx = sowAt.x + (rng() - 0.5) * 40;
      const cy = sowAt.y + 16 + rng() * 18;
      const ok = critterWalkable(blocked, tiles, cx, cy);
      add("cub", ok ? cx : sowAt.x + 8 * (i + 1), ok ? cy : sowAt.y + 12, 1, sowId);
    }
  }

  for (let g = 0; g < 7; g++) {
    const at = scatterPoint(rng, blocked, tiles, 80, 80, mapW * 0.58, mapH - 80, true);
    if (!at) continue;
    const doeId = add("doe", at.x, at.y, 10 + g, 0);
    const fawns = rng() > 0.4 ? 2 : 1;
    for (let f = 0; f < fawns; f++) {
      add("fawn", at.x + (rng() - 0.5) * 22, at.y + 12 + rng() * 14, 10 + g, doeId);
    }
  }

  for (let g = 0; g < 6; g++) {
    const at = scatterPoint(rng, blocked, tiles, 80, 80, mapW * 0.72, mapH - 80, true);
    if (at) add("buck", at.x, at.y);
  }

  for (let g = 0; g < 4; g++) {
    const at = scatterPoint(
      rng,
      blocked,
      tiles,
      ferrum.x - 500,
      ferrum.y - 280,
      ferrum.x + 900,
      ferrum.y + 700,
      false,
    );
    if (!at) continue;
    const n = 4 + Math.floor(rng() * 3);
    const lead = add("turkey", at.x, at.y, 20 + g, 0);
    for (let i = 1; i < n; i++) {
      add("turkey", at.x + (rng() - 0.5) * 44, at.y + (rng() - 0.5) * 44, 20 + g, lead);
    }
  }

  for (let g = 0; g < 28; g++) {
    const at = scatterPoint(rng, blocked, tiles, 60, 60, mapW - 60, mapH - 60, true);
    if (at) add("squirrel", at.x, at.y);
  }

  return out;
}

export function blockedAt(blocked: Uint8Array, x: number, y: number, w = W): boolean {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= w || ty >= MAP_H) return true;
  return blocked[ty * w + tx] === 1;
}

export function tileAt(tiles: Uint8Array, x: number, y: number, w = W): number {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= w || ty >= MAP_H) return T.FOREST;
  return tiles[ty * w + tx]!;
}

export function solidHit(world: World, x: number, y: number, r: number): boolean {
  const gw = world.gridW;
  const gh = Math.floor(world.treeGrid.length / gw);
  const x0 = Math.max(0, Math.floor((x - r - TREE_RADIUS) / SOLID_CELL));
  const x1 = Math.min(gw - 1, Math.floor((x + r + TREE_RADIUS) / SOLID_CELL));
  const y0 = Math.max(0, Math.floor((y - r - TREE_RADIUS) / SOLID_CELL));
  const y1 = Math.min(gh - 1, Math.floor((y + r + TREE_RADIUS) / SOLID_CELL));
  const r2 = (r + TREE_RADIUS) * (r + TREE_RADIUS);
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      const cell = world.treeGrid[cy * gw + cx];
      if (!cell) continue;
      for (const i of cell) {
        const t = world.trees[i];
        if (!t || t.chopped) continue;
        const dx = t.x - x;
        const dy = t.y - y;
        if (dx * dx + dy * dy < r2) return true;
      }
    }
  }
  for (const p of world.props) {
    if (!p.solid) continue;
    const pr = p.kind === "truck" ? 14 : 8;
    const dx = p.x - x;
    const dy = p.y - y;
    if (dx * dx + dy * dy < (r + pr) * (r + pr)) return true;
  }
  return false;
}

export function locationName(world: World, x: number, y: number): string {
  let best = world.buildings[0];
  let bd = Infinity;
  for (const b of world.buildings) {
    const d = Math.hypot(b.doorX - x, b.doorY - y);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  if (best && bd < 120) return `${best.name} — ${best.address}`;
  const fe = geoToWorld(36.9215, -80.0115);
  const campus = geoToWorld(36.9275, -80.0215);
  const rm = geoToWorld(36.9965, -79.8915);
  const oftp = geoToWorld(37.0135, -79.8645);
  const fs = geoToWorld(36.905, -80.09);
  const main = geoToWorld(37.01, -79.889);
  if (Math.hypot(campus.x - x, campus.y - y) < 280) return "Ferrum College";
  if (Math.hypot(fe.x - x, fe.y - y) < 260) return "Ferrum, VA";
  if (Math.hypot(rm.x - x, rm.y - y) < 300) return "Downtown Rocky Mount";
  if (Math.hypot(oftp.x - x, oftp.y - y) < 280) return "Old Franklin Turnpike";
  if (Math.hypot(main.x - x, main.y - y) < 260) return "N Main Street, Rocky Mount";
  if (Math.hypot(fs.x - x, fs.y - y) < 420) return "Fairy Stone Park Rd";
  const geoY = geoToWorld(36.95, -80.03);
  if (x < geoY.x && y > geoToWorld(36.94, -80.02).y) return "Ferrum Mountain Rd";
  return "Franklin County backroads";
}

export type InteriorLayout =
  | "house"
  | "ranch"
  | "shop"
  | "clinic"
  | "church"
  | "civic"
  | "warehouse"
  | "college"
  | "hall"
  | "school";

export function interiorSpec(b: Building): { w: number; h: number; layout: InteriorLayout } {
  switch (b.id) {
    case "college":
    case "college-lib":
      return { w: 42, h: 30, layout: "college" };
    case "lowes":
    case "walmart":
      return { w: 32, h: 22, layout: "warehouse" };
    case "courthouse":
      return { w: 24, h: 16, layout: "civic" };
    case "clinic":
      return { w: 20, h: 14, layout: "clinic" };
    case "hospital":
      return { w: 22, h: 16, layout: "clinic" };
    case "fchs":
    case "ferrum-elem":
      return { w: 28, h: 18, layout: "school" };
    case "foodlion":
      return { w: 22, h: 16, layout: "warehouse" };
    case "harvester":
      return { w: 18, h: 14, layout: "civic" };
    default:
      break;
  }
  switch (b.kind) {
    case "house":
      return { w: 10, h: 8, layout: "house" };
    case "ranch":
      return { w: 14, h: 10, layout: "ranch" };
    case "gas":
      return { w: 12, h: 9, layout: "shop" };
    case "kfc":
      return { w: 14, h: 10, layout: "shop" };
    case "church":
      return { w: 14, h: 18, layout: "church" };
    case "clinic":
      return { w: 18, h: 12, layout: "clinic" };
    case "courthouse":
      return { w: 20, h: 14, layout: "civic" };
    case "lowes":
      return { w: 28, h: 18, layout: "warehouse" };
    case "college":
      return b.zone === "ferrum" ? { w: 22, h: 16, layout: "hall" } : { w: 18, h: 14, layout: "school" };
    default:
      return { w: 12, h: 10, layout: "house" };
  }
}

function setWall(tiles: Uint8Array, blocked: Uint8Array, w: number, h: number, x: number, y: number) {
  if (x <= 0 || y <= 0 || x >= w - 1 || y >= h - 1) return;
  tiles[y * w + x] = T.WALL;
  blocked[y * w + x] = 1;
}

function setOpen(tiles: Uint8Array, blocked: Uint8Array, w: number, x: number, y: number) {
  tiles[y * w + x] = T.WOOD;
  blocked[y * w + x] = 0;
}

function vWall(
  tiles: Uint8Array,
  blocked: Uint8Array,
  w: number,
  h: number,
  x: number,
  y0: number,
  y1: number,
  doors: number[],
) {
  for (let y = y0; y <= y1; y++) {
    if (doors.includes(y) || doors.includes(y - 1)) setOpen(tiles, blocked, w, x, y);
    else setWall(tiles, blocked, w, h, x, y);
  }
}

function hWall(
  tiles: Uint8Array,
  blocked: Uint8Array,
  w: number,
  h: number,
  y: number,
  x0: number,
  x1: number,
  doors: number[],
) {
  for (let x = x0; x <= x1; x++) {
    if (doors.includes(x) || doors.includes(x - 1)) setOpen(tiles, blocked, w, x, y);
    else setWall(tiles, blocked, w, h, x, y);
  }
}

function placeLayout(
  tiles: Uint8Array,
  blocked: Uint8Array,
  w: number,
  h: number,
  layout: InteriorLayout,
) {
  const mid = Math.floor(w / 2);
  if (layout === "house") {
    vWall(tiles, blocked, w, h, 5, 1, h - 2, [4]);
  } else if (layout === "ranch") {
    vWall(tiles, blocked, w, h, 4, 1, h - 2, [h - 4]);
    vWall(tiles, blocked, w, h, 9, 1, h - 2, [h - 4]);
  } else if (layout === "shop") {
    hWall(tiles, blocked, w, h, 5, 1, w - 2, [mid]);
  } else if (layout === "clinic") {
    hWall(tiles, blocked, w, h, 5, 1, w - 2, [3, mid, w - 4]);
    hWall(tiles, blocked, w, h, 9, 1, w - 2, [4, mid, w - 5]);
    vWall(tiles, blocked, w, h, 7, 1, 5, [5]);
    vWall(tiles, blocked, w, h, 13, 1, 5, [5]);
  } else if (layout === "church") {
    hWall(tiles, blocked, w, h, 5, 1, w - 2, [mid]);
    vWall(tiles, blocked, w, h, 3, 6, h - 3, []);
    vWall(tiles, blocked, w, h, w - 4, 6, h - 3, []);
  } else if (layout === "civic") {
    vWall(tiles, blocked, w, h, 7, 1, h - 2, [h - 5]);
    vWall(tiles, blocked, w, h, w - 8, 1, h - 2, [h - 5]);
    hWall(tiles, blocked, w, h, 7, 8, w - 9, [mid]);
  } else if (layout === "warehouse") {
    for (let x = 5; x < w - 4; x += 5) {
      if (Math.abs(x - mid) <= 1) continue;
      vWall(tiles, blocked, w, h, x, 2, h - 3, [4, Math.floor(h / 2), h - 5]);
    }
  } else if (layout === "hall") {
    hWall(tiles, blocked, w, h, 8, 1, w - 2, [4, mid, w - 5]);
    vWall(tiles, blocked, w, h, 7, 1, 8, [8]);
    vWall(tiles, blocked, w, h, 15, 1, 8, [8]);
    vWall(tiles, blocked, w, h, 7, 8, h - 2, [h - 4]);
    vWall(tiles, blocked, w, h, 15, 8, h - 2, [h - 4]);
  } else if (layout === "school") {
    hWall(tiles, blocked, w, h, 8, 1, w - 2, [5, mid, w - 5]);
    for (let x = 6; x < w - 4; x += 8) {
      if (Math.abs(x - mid) <= 1) continue;
      vWall(tiles, blocked, w, h, x, 1, 8, [8]);
    }
    for (let x = 6; x < w - 4; x += 8) {
      if (Math.abs(x - mid) <= 1) continue;
      vWall(tiles, blocked, w, h, x, 8, h - 2, [h - 4]);
    }
  } else if (layout === "college") {
    hWall(tiles, blocked, w, h, 13, 1, w - 2, [6, 15, mid, 28, 36]);
    hWall(tiles, blocked, w, h, 17, 1, w - 2, [6, 16, mid, 26, 36]);
    for (const x of [8, 16, 26, 34]) {
      vWall(tiles, blocked, w, h, x, 1, 13, [12]);
    }
    for (const x of [8, 16, 26, 34]) {
      vWall(tiles, blocked, w, h, x, 17, h - 2, [18]);
    }
  }
}

function layoutSpots(b: Building, w: number, h: number, layout: InteriorLayout): Interact[] {
  const doorX = Math.floor(w / 2);
  const doorY = h - 1;
  const spots: Interact[] = [
    {
      id: `${b.id}-door`,
      kind: "door",
      x: doorX * TILE + 16,
      y: doorY * TILE + 8,
      r: 28,
      label: "Leave",
    },
  ];
  const add = (kind: Interact["kind"], label: string, tx: number, ty: number) => {
    const x = Math.max(2, Math.min(w - 3, tx));
    const y = Math.max(2, Math.min(h - 4, ty));
    spots.push({
      id: `${b.id}-${kind}-${spots.length}`,
      kind,
      x: x * TILE + 16,
      y: y * TILE + 16,
      r: 22,
      searched: false,
      label,
    });
  };

  if (layout === "house") {
    add("loot", "Search cabinet", 2, 3);
    add("chest", "Storage", 3, 5);
    add("bench", "Crafting bench", 2, 6);
    if (b.claimable) {
      add("bed", "Bed", 7, 3);
      add("claim", b.claimed ? "Home" : "Claim as home", 8, 5);
    }
  } else if (layout === "ranch") {
    add("loot", "Search kitchen", 2, 3);
    add("loot", "Search closet", 7, 3);
    add("chest", "Storage", 11, 3);
    add("bench", "Crafting bench", 2, 7);
    if (b.claimable) {
      add("bed", "Bed", 12, 7);
      add("claim", b.claimed ? "Home" : "Claim as home", 11, 5);
    }
  } else if (layout === "shop") {
    add("loot", "Search counter", 3, 3);
    add("loot", "Search shelves", 8, 3);
    add("loot", "Search back room", 4, 7);
    add("chest", "Storage", w - 4, 7);
    add("bench", "Crafting bench", w - 4, 3);
  } else if (layout === "clinic") {
    add("loot", "Search cabinet", 3, 3);
    add("loot", "Exam room", 10, 3);
    add("loot", "Pharmacy shelf", w - 4, 3);
    add("loot", "Supply closet", 4, 11);
    add("chest", "Storage", w - 5, 11);
    add("bench", "Crafting bench", 10, 7);
    if (b.claimable) {
      add("bed", "Gurney", 15, 11);
      add("claim", b.claimed ? "Home" : "Claim as home", 16, 7);
    }
  } else if (layout === "church") {
    add("loot", "Search pews", 7, 10);
    add("loot", "Vestry cabinet", 4, 3);
    add("chest", "Storage", 10, 3);
    add("bench", "Crafting bench", 7, 14);
  } else if (layout === "civic") {
    add("loot", "Search desk", 3, 4);
    add("loot", "Records cabinet", w - 4, 4);
    add("loot", "Office drawer", 12, 4);
    add("loot", "Back office", 4, 11);
    add("chest", "Evidence locker", w - 5, 11);
    add("bench", "Crafting bench", Math.floor(w / 2), 10);
  } else if (layout === "warehouse") {
    add("loot", "Aisle 1", 3, 4);
    add("loot", "Aisle 2", 9, 4);
    add("loot", "Aisle 3", 15, 8);
    add("loot", "Aisle 4", 21, 4);
    add("loot", "Back stock", 4, h - 5);
    add("loot", "Tool bay", w - 5, h - 5);
    add("chest", "Cage", w - 5, 4);
    add("bench", "Crafting bench", 8, h - 5);
  } else if (layout === "hall") {
    add("loot", "Search desk", 3, 4);
    add("loot", "Dorm closet", 10, 4);
    add("loot", "Lounge", 17, 4);
    add("chest", "Storage", 4, 12);
    add("bench", "Crafting bench", 16, 12);
  } else if (layout === "school") {
    add("loot", "Classroom 1", 3, 4);
    add("loot", "Classroom 2", 12, 4);
    add("loot", "Classroom 3", w - 5, 4);
    add("loot", "Locker bank", 6, 12);
    add("chest", "Supply closet", w - 5, 12);
    add("bench", "Shop bench", 14, 12);
  } else if (layout === "college") {
    add("loot", "Lecture hall desk", 5, 6);
    add("loot", "Classroom 2", 14, 6);
    add("loot", "Classroom 3", 22, 6);
    add("loot", "Lab cabinet", 30, 6);
    add("loot", "Faculty office", 38, 6);
    add("loot", "Dorm A", 5, 22);
    add("loot", "Dorm B", 16, 22);
    add("loot", "Dorm C", 27, 22);
    add("loot", "Dorm D", 36, 22);
    add("loot", "Vending alcove", 20, 15);
    add("chest", "Lost and found", 8, 15);
    add("bench", "Shop bench", 33, 15);
  }
  return spots;
}

export function buildInterior(b: Building, rng: () => number): Interior {
  const { w, h, layout } = interiorSpec(b);
  const tiles = new Uint8Array(w * h);
  const blocked = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      tiles[i] = edge ? T.WALL : T.WOOD;
      if (edge) blocked[i] = 1;
    }
  }
  const doorX = Math.floor(w / 2);
  const doorY = h - 1;
  blocked[doorY * w + doorX] = 0;
  blocked[doorY * w + doorX - 1] = 0;
  if (w > 16) blocked[doorY * w + doorX + 1] = 0;
  tiles[doorY * w + doorX] = T.DIRT;
  tiles[doorY * w + doorX - 1] = T.DIRT;
  if (w > 16) tiles[doorY * w + doorX + 1] = T.DIRT;

  placeLayout(tiles, blocked, w, h, layout);
  const furniture = layoutSpots(b, w, h, layout).filter((f) => {
    if (f.kind === "door") return true;
    const tx = Math.floor(f.x / TILE);
    const ty = Math.floor(f.y / TILE);
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return false;
    return blocked[ty * w + tx] !== 1;
  });
  void rng;
  return {
    buildingId: b.id,
    w,
    h,
    tiles,
    blocked,
    furniture,
    spawnX: doorX * TILE + 16,
    spawnY: (doorY - 1.2) * TILE,
  };
}

export { BLOCKED } from "./constants";
