import { BLOCKED, geoToTile, geoToWorld, MAP_H, MAP_W, T, TILE, type TileId } from "./constants";
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
  attackCd: number;
  wanderT: number;
  wx: number;
  wy: number;
  hitT: number;
  alive: boolean;
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
  startX: number;
  startY: number;
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

function paintRoad(tiles: Uint8Array, blocked: Uint8Array, ax: number, ay: number, bx: number, by: number, width = 2) {
  const dx = bx - ax;
  const dy = by - ay;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) * 2));
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(ax + (dx * i) / steps);
    const y = Math.round(ay + (dy * i) / steps);
    stamp(tiles, x, y, T.ASPHALT, width);
    if (width >= 2 && i % 3 === 0) stamp(tiles, x, y, T.LINE, 0);
  }
  void blocked;
}

function parking(tiles: Uint8Array, tx: number, ty: number, w: number, h: number) {
  for (let y = ty; y < ty + h; y++) {
    for (let x = tx; x < tx + w; x++) {
      if (inMap(x, y)) tiles[idx(x, y)] = T.PARKING;
    }
  }
}

type Landmark = {
  id: string;
  kind: BldKind;
  name: string;
  address: string;
  lat: number;
  lng: number;
  claimable: boolean;
  lootTable: string;
  zone: Building["zone"];
  tw: number;
  th: number;
};

const LANDMARKS: Landmark[] = [
  {
    id: "clinic",
    kind: "clinic",
    name: "Tri-Area Community Health",
    address: "180 Ferrum Mountain Rd",
    lat: 36.9255,
    lng: -80.018,
    claimable: true,
    lootTable: "clinic",
    zone: "ferrum",
    tw: 6,
    th: 5,
  },
  {
    id: "college",
    kind: "college",
    name: "Ferrum College — Main Hall",
    address: "445 Ferrum Mountain Rd",
    lat: 36.9228,
    lng: -80.0215,
    claimable: false,
    lootTable: "college",
    zone: "ferrum",
    tw: 9,
    th: 5,
  },
  {
    id: "college2",
    kind: "college",
    name: "Vaughn Chapel",
    address: "Ferrum College",
    lat: 36.924,
    lng: -80.0235,
    claimable: false,
    lootTable: "college",
    zone: "ferrum",
    tw: 7,
    th: 4,
  },
  {
    id: "church-ferrum",
    kind: "church",
    name: "Fairview Church",
    address: "Franklin St, Ferrum",
    lat: 36.9272,
    lng: -80.0145,
    claimable: false,
    lootTable: "church",
    zone: "ferrum",
    tw: 4,
    th: 6,
  },
  {
    id: "ferrum-store",
    kind: "gas",
    name: "Ferrum General",
    address: "Franklin St (VA-40)",
    lat: 36.9266,
    lng: -80.0112,
    claimable: false,
    lootTable: "store",
    zone: "ferrum",
    tw: 5,
    th: 4,
  },
  {
    id: "fairy-1576",
    kind: "house",
    name: "Farmhouse",
    address: "1576 Fairy Stone Park Rd",
    lat: 36.912,
    lng: -80.085,
    claimable: true,
    lootTable: "house",
    zone: "rural",
    tw: 4,
    th: 4,
  },
  {
    id: "lowes",
    kind: "lowes",
    name: "Lowe's Home Improvement",
    address: "800 Old Franklin Tpke",
    lat: 36.9945,
    lng: -79.918,
    claimable: false,
    lootTable: "lowes",
    zone: "town",
    tw: 10,
    th: 6,
  },
  {
    id: "courthouse",
    kind: "courthouse",
    name: "Franklin County Courthouse",
    address: "Main St, Rocky Mount",
    lat: 36.9978,
    lng: -79.8918,
    claimable: false,
    lootTable: "civic",
    zone: "town",
    tw: 6,
    th: 7,
  },
  {
    id: "kfc",
    kind: "kfc",
    name: "KFC",
    address: "1775 N Main St",
    lat: 37.0105,
    lng: -79.888,
    claimable: false,
    lootTable: "kfc",
    zone: "town",
    tw: 6,
    th: 5,
  },
  {
    id: "gas-rm",
    kind: "gas",
    name: "Goode Hwy Fuel",
    address: "N Main St, Rocky Mount",
    lat: 37.004,
    lng: -79.8895,
    claimable: false,
    lootTable: "gas",
    zone: "town",
    tw: 5,
    th: 4,
  },
  {
    id: "grocery",
    kind: "college",
    name: "Franklin Marketplace",
    address: "Franklin St, Rocky Mount",
    lat: 36.9962,
    lng: -79.905,
    claimable: false,
    lootTable: "store",
    zone: "town",
    tw: 7,
    th: 5,
  },
];

/** Simplified real-road polylines in lat/lng. */
const ROADS: { pts: [number, number][]; w: number }[] = [
  // VA-40 / Franklin St / Old Franklin Tpke: Ferrum → Rocky Mount
  {
    w: 2,
    pts: [
      [36.922, -80.04],
      [36.9248, -80.024],
      [36.9262, -80.018],
      [36.9268, -80.012],
      [36.93, -79.995],
      [36.938, -79.978],
      [36.952, -79.96],
      [36.968, -79.942],
      [36.982, -79.93],
      [36.9945, -79.918],
      [36.9968, -79.905],
      [36.9975, -79.892],
    ],
  },
  // Fairy Stone Park Rd (VA-57) west of Ferrum
  {
    w: 1,
    pts: [
      [36.926, -80.02],
      [36.921, -80.045],
      [36.916, -80.065],
      [36.912, -80.085],
      [36.906, -80.11],
    ],
  },
  // Ferrum Mountain Rd
  {
    w: 1,
    pts: [
      [36.908, -80.014],
      [36.918, -80.016],
      [36.9255, -80.018],
      [36.932, -80.02],
      [36.942, -80.022],
    ],
  },
  // US-220 / N Main St Rocky Mount
  {
    w: 2,
    pts: [
      [36.972, -79.892],
      [36.986, -79.8915],
      [36.9978, -79.8918],
      [37.0105, -79.888],
      [37.028, -79.885],
    ],
  },
  // Secondary: Tanyard / Pell area
  {
    w: 1,
    pts: [
      [36.9975, -79.892],
      [37.002, -79.9],
      [37.006, -79.91],
    ],
  },
  // Grassy Hill Rd-ish
  {
    w: 1,
    pts: [
      [36.9945, -79.918],
      [37.002, -79.92],
      [37.012, -79.922],
    ],
  },
];

export function generateWorld(seed = 40): World {
  const rng = mulberry32(seed);
  const tiles = new Uint8Array(W * H);
  const blocked = new Uint8Array(W * H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = fbm(x / 28, y / 28, seed);
      const west = x / W;
      // West (Fairy Stone) is deep forest; east (Rocky Mount) opens up
      const forestBias = 0.62 - west * 0.35;
      let t: TileId = T.GRASS;
      if (n > forestBias) t = T.FOREST;
      else if (n > forestBias - 0.08) t = T.TALL;
      else if (n < 0.22 && west < 0.55) t = T.CROP;
      tiles[idx(x, y)] = t;
    }
  }

  // Maggodee / Pigg creek near Ferrum
  for (let i = 0; i < 220; i++) {
    const t = i / 220;
    const lng = -80.09 + t * 0.09;
    const lat = 36.91 + Math.sin(t * 6) * 0.008 + t * 0.012;
    const p = geoToTile(lat, lng);
    stamp(tiles, p.tx, p.ty, T.WATER, 1);
  }

  for (const road of ROADS) {
    for (let i = 0; i < road.pts.length - 1; i++) {
      const a = geoToTile(road.pts[i]![0], road.pts[i]![1]);
      const b = geoToTile(road.pts[i + 1]![0], road.pts[i + 1]![1]);
      paintRoad(tiles, blocked, a.tx, a.ty, b.tx, b.ty, road.w);
    }
  }

  // Rocky Mount street grid
  const rm0 = geoToTile(36.988, -79.905);
  const rm1 = geoToTile(37.018, -79.878);
  for (let y = Math.min(rm0.ty, rm1.ty); y <= Math.max(rm0.ty, rm1.ty); y += 5) {
    for (let x = Math.min(rm0.tx, rm1.tx); x <= Math.max(rm0.tx, rm1.tx); x++) {
      if (inMap(x, y)) tiles[idx(x, y)] = T.ASPHALT;
    }
  }
  for (let x = Math.min(rm0.tx, rm1.tx); x <= Math.max(rm0.tx, rm1.tx); x += 6) {
    for (let y = Math.min(rm0.ty, rm1.ty); y <= Math.max(rm0.ty, rm1.ty); y++) {
      if (inMap(x, y)) tiles[idx(x, y)] = T.WALK;
    }
  }

  const buildings: Building[] = [];

  const placeB = (lm: Landmark, jitter = 0) => {
    const p = geoToWorld(lm.lat, lm.lng);
    const x = p.x + (rng() - 0.5) * jitter;
    const y = p.y + (rng() - 0.5) * jitter;
    const w = lm.tw * TILE;
    const h = lm.th * TILE;
    const b: Building = {
      id: lm.id,
      kind: lm.kind,
      name: lm.name,
      address: lm.address,
      x: x - w / 2,
      y: y - h / 2,
      w,
      h,
      doorX: x,
      doorY: y + h / 2 + 6,
      claimable: lm.claimable,
      claimed: false,
      lootTable: lm.lootTable,
      zone: lm.zone,
    };
    buildings.push(b);
    footprint(tiles, blocked, b);
    if (lm.kind === "kfc" || lm.kind === "lowes" || lm.kind === "gas") {
      const t0 = Math.floor((b.x - 20) / TILE);
      const t1 = Math.floor((b.y + b.h) / TILE);
      parking(tiles, t0, t1, Math.ceil(b.w / TILE) + 2, 4);
    }
  };

  for (const lm of LANDMARKS) placeB(lm);

  // Houses along Ferrum Mountain Rd and rural VA-40
  const houseRoads: [number, number][][] = [
    ROADS[2]!.pts,
    ROADS[1]!.pts,
    ROADS[0]!.pts.slice(0, 8),
  ];
  let hid = 0;
  for (const pts of houseRoads) {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      for (let s = 0.15; s < 0.9; s += 0.22) {
        const lat = a[0] + (b[0] - a[0]) * s;
        const lng = a[1] + (b[1] - a[1]) * s;
        const p = geoToWorld(lat, lng);
        const side = rng() < 0.5 ? -1 : 1;
        const dx = b[1] - a[1];
        const dy = a[0] - b[0];
        const len = Math.hypot(dx, dy) || 1;
        const ox = (dx / len) * 48 * side;
        const oy = (dy / len) * 900 * side; // lat offset scaled roughly
        void oy;
        const kind: BldKind = rng() < 0.35 ? "ranch" : "house";
        const tw = kind === "ranch" ? 5 : 4;
        const th = 4;
        const bx = p.x + ox - (tw * TILE) / 2;
        const by = p.y + side * 56 - (th * TILE) / 2;
        if (bx < 40 || by < 40 || bx > W * TILE - 80 || by > H * TILE - 80) continue;
        if (buildings.some((b0) => Math.hypot(b0.x - bx, b0.y - by) < 70)) continue;
        hid++;
        const house: Building = {
          id: `house-${hid}`,
          kind,
          name: kind === "ranch" ? "Brick Ranch" : "Farmhouse",
          address: ruralAddress(lat, lng, hid),
          x: bx,
          y: by,
          w: tw * TILE,
          h: th * TILE,
          doorX: bx + (tw * TILE) / 2,
          doorY: by + th * TILE + 4,
          claimable: true,
          claimed: false,
          lootTable: "house",
          zone: lng < -80.03 ? "rural" : "ferrum",
        };
        buildings.push(house);
        footprint(tiles, blocked, house);
        const drive = geoToTile(lat, lng);
        stamp(tiles, drive.tx + side * 2, drive.ty, T.DIRT, 1);
      }
    }
  }

  // Rocky Mount residential grid
  let rid = 0;
  for (let gy = Math.min(rm0.ty, rm1.ty) + 2; gy < Math.max(rm0.ty, rm1.ty) - 2; gy += 5) {
    for (let gx = Math.min(rm0.tx, rm1.tx) + 2; gx < Math.max(rm0.tx, rm1.tx) - 2; gx += 6) {
      if (rng() > 0.55) continue;
      const kind: BldKind = rng() < 0.5 ? "ranch" : "house";
      const bx = gx * TILE + 8;
      const by = gy * TILE + 6;
      if (buildings.some((b0) => Math.abs(b0.x - bx) < 50 && Math.abs(b0.y - by) < 50)) continue;
      rid++;
      const house: Building = {
        id: `rm-${rid}`,
        kind,
        name: "Town House",
        address: `${1700 + rid} N Main St area`,
        x: bx,
        y: by,
        w: 4 * TILE,
        h: 3 * TILE,
        doorX: bx + 2 * TILE,
        doorY: by + 3 * TILE + 4,
        claimable: true,
        claimed: false,
        lootTable: "house",
        zone: "town",
      };
      buildings.push(house);
      footprint(tiles, blocked, house);
    }
  }

  // Trees
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
    if (rng() > 0.55) continue;
    pid++;
    const k = propKinds[Math.floor(rng() * propKinds.length)]!;
    props.push({
      id: pid,
      x: b.doorX + (rng() - 0.5) * 40,
      y: b.doorY + 18 + rng() * 10,
      kind: k,
      solid: k === "truck" || k === "dumpster" || k === "barrel",
    });
  }

  // Block water
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === T.WATER) blocked[i] = 1;
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
      const hp = 28 + Math.floor(rng() * 18);
      zombies.push({
        id: zid,
        x: wx,
        y: wy,
        hp,
        maxHp: hp,
        facing: Math.floor(rng() * 4),
        vx: 0,
        vy: 0,
        attackCd: 0,
        wanderT: rng() * 4,
        wx,
        wy,
        hitT: 0,
        alive: true,
      });
    }
  }

  const clinic = buildings.find((b) => b.id === "clinic");
  const startX = clinic?.doorX ?? 4670;
  const startY = (clinic?.doorY ?? 5780) + 48;
  return {
    tiles,
    blocked,
    buildings,
    trees,
    props,
    zombies,
    startX,
    startY,
  };
}

function ruralAddress(lat: number, lng: number, n: number): string {
  if (lng < -80.05) return `${1400 + n} Fairy Stone Park Rd`;
  if (lng < -80.01) return `${100 + n} Ferrum Mountain Rd`;
  return `Franklin St near ${n}`;
}

function footprint(tiles: Uint8Array, blocked: Uint8Array, b: Building) {
  const x0 = Math.floor(b.x / TILE);
  const y0 = Math.floor(b.y / TILE);
  const x1 = Math.ceil((b.x + b.w) / TILE);
  const y1 = Math.ceil((b.y + b.h) / TILE);
  const doorTx = Math.floor(b.doorX / TILE);
  const doorTy = Math.floor(b.doorY / TILE);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (!inMap(x, y)) continue;
      const isDoor = Math.abs(x - doorTx) <= 1 && y >= y1 - 1;
      if (!isDoor) blocked[idx(x, y)] = 1;
      if (tiles[idx(x, y)] !== T.ASPHALT && tiles[idx(x, y)] !== T.PARKING) {
        tiles[idx(x, y)] = T.DIRT;
      }
    }
  }
  void doorTy;
}

function densityAt(tx: number, ty: number): number {
  const rm = geoToTile(36.998, -79.892);
  const fe = geoToTile(36.926, -80.016);
  const dRm = Math.hypot(tx - rm.tx, ty - rm.ty);
  const dFe = Math.hypot(tx - fe.tx, ty - fe.ty);
  if (dRm < 18) return 0.55;
  if (dRm < 36) return 0.28;
  if (dFe < 14) return 0.18;
  if (tx < 90) return 0.015;
  return 0.04;
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
  if (best && bd < 140) return `${best.name} — ${best.address}`;
  const fe = geoToWorld(36.926, -80.016);
  const rm = geoToWorld(36.998, -79.892);
  const fs = geoToWorld(36.912, -80.085);
  const dFe = Math.hypot(fe.x - x, fe.y - y);
  const dRm = Math.hypot(rm.x - x, rm.y - y);
  const dFs = Math.hypot(fs.x - x, fs.y - y);
  if (dFs < 420) return "Fairy Stone Park Rd";
  if (dFe < 380) return "Ferrum, VA";
  if (dRm < 520) return "Rocky Mount, VA";
  return "Franklin County backroads";
}

export function buildInterior(b: Building, rng: () => number): Interior {
  const w = b.kind === "lowes" ? 28 : b.kind === "college" ? 22 : 18;
  const h = b.kind === "lowes" ? 20 : 14;
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
  tiles[doorY * w + doorX] = T.DIRT;
  tiles[doorY * w + doorX - 1] = T.DIRT;

  const furniture: Interact[] = [
    {
      id: `${b.id}-door`,
      kind: "door",
      x: doorX * TILE + 16,
      y: doorY * TILE + 8,
      r: 28,
      label: "Leave",
    },
  ];
  const spots: { kind: Interact["kind"]; label: string }[] = [
    { kind: "loot", label: "Search cabinet" },
    { kind: "loot", label: "Search crate" },
    { kind: "chest", label: "Storage" },
    { kind: "bench", label: "Crafting bench" },
  ];
  if (b.claimable) {
    spots.push({ kind: "bed", label: "Bed" });
    spots.push({ kind: "claim", label: b.claimed ? "Home" : "Claim as home" });
  }
  if (b.kind === "lowes" || b.kind === "clinic" || b.kind === "kfc") {
    spots.push({ kind: "loot", label: "Search shelves" });
    spots.push({ kind: "loot", label: "Search back room" });
  }
  let n = 0;
  for (const s of spots) {
    n++;
    const fx = 2 + Math.floor(rng() * (w - 4));
    const fy = 2 + Math.floor(rng() * (h - 5));
    furniture.push({
      id: `${b.id}-${s.kind}-${n}`,
      kind: s.kind,
      x: fx * TILE + 16,
      y: fy * TILE + 16,
      r: 22,
      searched: false,
      label: s.label,
    });
  }
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

export { BLOCKED };
