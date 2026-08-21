import {
  BEAR_RADIUS,
  BRUTE_RADIUS,
  BRUTE_SPEED,
  CUB_RADIUS,
  INFECTION_TIME,
  MAP_H,
  MAP_W,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  PLAYER_SPRINT,
  TILE,
  tileSpeed,
  worldToGeo,
  ZOMBIE_RADIUS,
  ZOMBIE_SPEED,
  ZOMBIE_TOWN_SPEED,
} from "./constants";
import type { Actions } from "./input";
import { ITEMS, addItem, rollLoot, takeItem, type Slot } from "./items";
import { SAVE_VERSION } from "./save";
import {
  blockedAt,
  buildInterior,
  solidHit,
  tileAt,
  type Building,
  type Critter,
  type Interior,
  type World,
  type Zombie,
} from "./world";
import { mulberry32 } from "./rng";

export type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
  alive: boolean;
  paint: boolean;
  tint: string;
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  s: number;
};

export type Player = {
  x: number;
  y: number;
  facing: number;
  hp: number;
  maxHp: number;
  infection: number;
  weapon: string;
  armor: string;
  inv: Slot[];
  attackT: number;
  invuln: number;
  chopping: number;
  searching: number;
  searchTarget: string | null;
  walk: number;
  moving: boolean;
};

export type GameState = {
  world: World;
  player: Player;
  interior: Interior | null;
  returnX: number;
  returnY: number;
  bullets: Bullet[];
  particles: Particle[];
  chests: Record<string, Slot[]>;
  searched: Set<string>;
  claimed: Set<string>;
  shake: number;
  hitstop: number;
  turned: boolean;
  dead: boolean;
  time: number;
  rng: () => number;
  hint: string;
  toast: string;
  toastT: number;
  atBench: boolean;
};

const FACE_VEC = [
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
];

export function createState(world: World, rng = mulberry32(40)): GameState {
  return {
    world,
    player: {
      x: world.startX,
      y: world.startY,
      facing: 0,
      hp: 100,
      maxHp: 100,
      infection: 0,
      weapon: "fists",
      armor: "",
      inv: [],
      attackT: 0,
      invuln: 0,
      chopping: 0,
      searching: 0,
      searchTarget: null,
      walk: 0,
      moving: false,
    },
    interior: null,
    returnX: world.startX,
    returnY: world.startY,
    bullets: [],
    particles: [],
    chests: {},
    searched: new Set(),
    claimed: new Set(),
    shake: 0,
    hitstop: 0,
    turned: false,
    dead: false,
    time: 0,
    rng,
    hint: "Search the clinic. Claim a house. Stay quiet.",
    toast: "",
    toastT: 0,
    atBench: false,
  };
}

export function stepSim(s: GameState, a: Actions, dt: number) {
  if (s.dead || s.turned) return;
  if (s.hitstop > 0) {
    s.hitstop -= dt;
    return;
  }
  s.time += dt;
  s.shake = Math.max(0, s.shake - dt * 8);
  if (s.toastT > 0) s.toastT -= dt;
  else s.toast = "";

  const p = s.player;
  p.attackT = Math.max(0, p.attackT - dt);
  p.invuln = Math.max(0, p.invuln - dt);

  if (p.infection > 0) {
    p.infection -= dt;
    if (p.infection <= 0) {
      s.turned = true;
      p.infection = 0;
      toast(s, "The fever takes you.");
      return;
    }
  }

  const mapW = s.interior ? s.interior.w * TILE : MAP_W * TILE;
  const mapH = s.interior ? s.interior.h * TILE : MAP_H * TILE;
  const blocked = s.interior ? s.interior.blocked : s.world.blocked;
  const tiles = s.interior ? s.interior.tiles : s.world.tiles;
  const bw = s.interior ? s.interior.w : MAP_W;

  if (!s.atBench) {
    const ground = tileSpeed(tileAt(tiles, p.x, p.y, bw));
    const spd = (a.sprint ? PLAYER_SPRINT : PLAYER_SPEED) * ground;
    const mx = a.moveX * spd * dt;
    const my = a.moveY * spd * dt;
    const ox = p.x;
    const oy = p.y;
    if (mx || my) {
      if (Math.abs(mx) > Math.abs(my)) p.facing = mx < 0 ? 1 : 2;
      else p.facing = my < 0 ? 3 : 0;
    }
    tryMove(p, blocked, bw, mx, my, mapW, mapH, s.interior ? undefined : s.world, PLAYER_RADIUS);
    const dist = Math.hypot(p.x - ox, p.y - oy);
    p.moving = dist > 0.2;
    if (p.moving) p.walk += dist * 0.14;
  } else {
    p.moving = false;
  }

  s.atBench = false;
  s.hint = "";

  const nearB = !s.interior ? nearestBuilding(s, 46) : null;
  if (nearB && !s.interior) {
    s.hint = `Enter ${nearB.name}`;
    if (a.justUse) enterBuilding(s, nearB);
  }

  const nearTree = !s.interior ? nearestTree(s, 28) : null;
  if (nearTree && !nearB) {
    const wep = ITEMS[p.weapon];
    s.hint = wep?.tool === "chop" ? "Chop tree" : "Need a hatchet or axe";
    if (a.justUse && wep?.tool === "chop") {
      nearTree.hp -= wep.chop ?? 1;
      burst(s, nearTree.x, nearTree.y, "#6b4a2b", 8);
      if (nearTree.hp <= 0) {
        nearTree.chopped = true;
        addItem(p.inv, "wood", 3 + Math.floor(s.rng() * 4));
        toast(s, "Wood gathered.");
      }
    }
  }

  if (s.interior) {
    s.atBench = false;
    let closest: (typeof s.interior.furniture)[0] | null = null;
    let cd = 40;
    for (const f of s.interior.furniture) {
      const d = Math.hypot(f.x - p.x, f.y - p.y);
      if (d < cd) {
        cd = d;
        closest = f;
      }
    }
    if (closest && cd < closest.r + 8) {
      if (closest.kind === "bench") s.atBench = true;
      if (closest.kind === "claim" && s.claimed.has(s.interior.buildingId)) {
        s.hint = "Your home";
      } else s.hint = closest.label;
      if (a.justUse) useFurniture(s, closest);
    }
  }

  if (a.justAttack && p.attackT <= 0) doAttack(s);

  stepBullets(s, dt);
  stepWildlife(s, dt);
  if (!s.interior) stepZombies(s, dt);

  if (p.hp <= 0) {
    s.dead = true;
    toast(s, "You went down.");
  }
}

function tryMove(
  p: { x: number; y: number },
  blocked: Uint8Array,
  bw: number,
  mx: number,
  my: number,
  mapW: number,
  mapH: number,
  world: World | undefined,
  radius: number,
) {
  const nx = Math.max(12, Math.min(mapW - 12, p.x + mx));
  const ny = Math.max(12, Math.min(mapH - 12, p.y + my));
  const stuck = circleBlocked(blocked, bw, p.x, p.y, radius, world);
  if (stuck || !circleBlocked(blocked, bw, nx, p.y, radius, world)) p.x = nx;
  if (stuck || !circleBlocked(blocked, bw, p.x, ny, radius, world)) p.y = ny;
}

function circleBlocked(
  blocked: Uint8Array,
  bw: number,
  x: number,
  y: number,
  r: number,
  world?: World,
): boolean {
  const pts: [number, number][] = [
    [x - r, y],
    [x + r, y],
    [x, y - r],
    [x, y + r * 0.4],
  ];
  if (pts.some(([px, py]) => blockedAt(blocked, px, py, bw))) return true;
  if (world && solidHit(world, x, y, r)) return true;
  return false;
}

function nearestBuilding(s: GameState, r: number): Building | null {
  let best: Building | null = null;
  let d = r;
  for (const b of s.world.buildings) {
    const dist = Math.hypot(b.doorX - s.player.x, b.doorY - s.player.y);
    if (dist < d) {
      d = dist;
      best = b;
    }
  }
  return best;
}

function nearestTree(s: GameState, r: number) {
  let best = null as GameState["world"]["trees"][0] | null;
  let d = r;
  for (const t of s.world.trees) {
    if (t.chopped) continue;
    const dist = Math.hypot(t.x - s.player.x, t.y - s.player.y);
    if (dist < d) {
      d = dist;
      best = t;
    }
  }
  return best;
}

function enterBuilding(s: GameState, b: Building) {
  s.returnX = s.player.x;
  s.returnY = s.player.y;
  s.interior = buildInterior(b, s.rng);
  s.player.x = s.interior.spawnX;
  s.player.y = s.interior.spawnY;
  toast(s, b.name);
}

export function leaveBuilding(s: GameState) {
  if (!s.interior) return;
  s.player.x = s.returnX;
  s.player.y = s.returnY;
  s.interior = null;
  s.atBench = false;
}

function useFurniture(s: GameState, f: { id: string; kind: string; x: number; y: number; searched?: boolean }) {
  const p = s.player;
  const b = s.world.buildings.find((x) => x.id === s.interior?.buildingId);
  if (f.kind === "door") {
    leaveBuilding(s);
    return;
  }
  if (f.kind === "claim" && b) {
    s.claimed.add(b.id);
    b.claimed = true;
    toast(s, `Claimed ${b.address}`);
    return;
  }
  if (f.kind === "bed") {
    if (!b?.claimed && !(b && s.claimed.has(b.id))) {
      toast(s, "Claim this house first.");
      return;
    }
    p.hp = Math.min(p.maxHp, p.hp + 40);
    toast(s, "You rest until dusk.");
    burst(s, p.x, p.y, "#c9c3b0", 10);
    return;
  }
  if (f.kind === "bench") {
    s.atBench = true;
    return;
  }
  if (f.kind === "chest") {
    toast(s, "Storage — items stay in this house.");
    return;
  }
  if (f.kind === "loot") {
    if (s.searched.has(f.id)) {
      toast(s, "Already searched.");
      return;
    }
    s.searched.add(f.id);
    const table = b?.lootTable ?? "house";
    const loot = rollLoot(table, s.rng, 2 + Math.floor(s.rng() * 2));
    const names: string[] = [];
    for (const l of loot) {
      addItem(p.inv, l.id, l.n);
      names.push(`${ITEMS[l.id]?.name ?? l.id} x${l.n}`);
    }
    toast(s, names.join(", ") || "Nothing useful.");
  }
}

function doAttack(s: GameState) {
  const p = s.player;
  const wep = ITEMS[p.weapon] ?? ITEMS.fists!;
  p.attackT = wep.rate ?? 0.45;
  const dir = FACE_VEC[p.facing] ?? FACE_VEC[0]!;

  if (wep.kind === "ranged") {
    if (wep.nonlethal && wep.contact && !s.interior) {
      let jammed = false;
      const reach = PLAYER_RADIUS + ZOMBIE_RADIUS + 4;
      for (const z of s.world.zombies) {
        if (!z.alive) continue;
        if (Math.hypot(z.x - p.x, z.y - p.y) <= reach) {
          hurtZombie(s, z, wep.contact);
          jammed = true;
        }
      }
      for (const c of s.world.critters) {
        if (!c.alive) continue;
        if (Math.hypot(c.x - p.x, c.y - p.y) <= reach + 4) {
          hurtCritter(s, c, wep.contact);
          jammed = true;
        }
      }
      if (jammed) {
        s.shake = 0.14;
        s.hitstop = 0.03;
        toast(s, "Jammed the marker into them.");
        return;
      }
    }
    const ammo = wep.ammo ?? "ammo9";
    if (!takeItem(p.inv, ammo, 1)) {
      toast(s, "No ammo.");
      p.attackT = 0.2;
      return;
    }
    const n = wep.spread ?? 1;
    const spd = wep.speed ?? 320;
    const spreadStep = wep.spreadRad ?? 0.12;
    const tint = wep.nonlethal ? "#e85ad0" : wep.silent ? "#c4a574" : n > 1 ? "#d9c27a" : "#e6e1d0";
    for (let i = 0; i < n; i++) {
      const spread = n > 1 ? (i - (n - 1) / 2) * spreadStep : 0;
      const ca = Math.cos(spread);
      const sa = Math.sin(spread);
      const vx = dir.x * ca - dir.y * sa;
      const vy = dir.x * sa + dir.y * ca;
      s.bullets.push({
        x: p.x + vx * 14,
        y: p.y + vy * 14,
        vx: vx * spd,
        vy: vy * spd,
        dmg: wep.nonlethal ? 0 : (wep.dmg ?? 20),
        life: (wep.range ?? 200) / spd,
        alive: true,
        paint: !!wep.nonlethal,
        tint,
      });
    }
    s.shake = wep.silent ? 0.04 : wep.nonlethal ? 0.06 : 0.12;
    return;
  }

  const range = wep.range ?? 28;
  let hit = false;
  if (!s.interior) {
    for (const z of s.world.zombies) {
      if (!z.alive) continue;
      const zR = z.brute ? BRUTE_RADIUS : ZOMBIE_RADIUS;
      const dx = z.x - p.x;
      const dy = z.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > range + zR) continue;
      const ndx = d ? dx / d : 0;
      const ndy = d ? dy / d : 0;
      if (ndx * dir.x + ndy * dir.y < 0.25 && d > 16) continue;
      hurtZombie(s, z, wep.dmg ?? 8);
      hit = true;
    }
    for (const c of s.world.critters) {
      if (!c.alive) continue;
      const r = critterRadius(c);
      const dx = c.x - p.x;
      const dy = c.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > range + r) continue;
      const ndx = d ? dx / d : 0;
      const ndy = d ? dy / d : 0;
      if (ndx * dir.x + ndy * dir.y < 0.25 && d > 16) continue;
      hurtCritter(s, c, wep.dmg ?? 8);
      hit = true;
    }
  }
  if (hit) {
    s.shake = 0.16;
    s.hitstop = 0.04;
  }
}

function hurtZombie(s: GameState, z: Zombie, dmg: number) {
  if (dmg <= 0) return;
  z.hp -= dmg;
  z.hitT = 0.12;
  const dx = z.x - s.player.x;
  const dy = z.y - s.player.y;
  const d = Math.hypot(dx, dy) || 1;
  z.x += (dx / d) * (z.brute ? 6 : 10);
  z.y += (dy / d) * (z.brute ? 6 : 10);
  burst(s, z.x, z.y, "#6a2a24", 6);
  if (z.hp <= 0) {
    z.alive = false;
    if (s.rng() < 0.25) addItem(s.player.inv, "cloth", 1);
    if (s.rng() < 0.12) addItem(s.player.inv, "scrap", 1);
  }
}

function paintZombie(s: GameState, z: Zombie) {
  z.paintT = 3.2;
  z.hitT = 0.08;
  burst(s, z.x, z.y, "#e85ad0", 8);
}

function critterRadius(c: Critter): number {
  if (c.kind === "bear") return BEAR_RADIUS;
  if (c.kind === "cub") return CUB_RADIUS;
  if (c.kind === "buck") return 14;
  if (c.kind === "doe") return 13;
  if (c.kind === "fawn") return 9;
  if (c.kind === "turkey") return 8;
  return 5;
}

function hurtCritter(s: GameState, c: Critter, dmg: number) {
  if (dmg <= 0) return;
  c.hp -= dmg;
  const dx = c.x - s.player.x;
  const dy = c.y - s.player.y;
  const d = Math.hypot(dx, dy) || 1;
  const knock = c.kind === "bear" || c.kind === "cub" ? 4 : 12;
  c.x += (dx / d) * knock;
  c.y += (dy / d) * knock;
  burst(s, c.x, c.y, "#7a3a2a", 5);
  if (c.hp <= 0) {
    c.alive = false;
    if (c.kind === "doe" || c.kind === "buck") addItem(s.player.inv, "meat", 1 + Math.floor(s.rng() * 2));
    else if (c.kind === "turkey") addItem(s.player.inv, "meat", 1);
    else if (c.kind === "bear" || c.kind === "cub") addItem(s.player.inv, "meat", 2 + Math.floor(s.rng() * 2));
  }
}

function stepBullets(s: GameState, dt: number) {
  const blocked = s.interior ? s.interior.blocked : s.world.blocked;
  const bw = s.interior ? s.interior.w : MAP_W;
  for (const b of s.bullets) {
    if (!b.alive) continue;
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0 || blockedAt(blocked, b.x, b.y, bw)) {
      b.alive = false;
      continue;
    }
    if (s.interior) continue;
    for (const z of s.world.zombies) {
      if (!z.alive) continue;
      const zR = z.brute ? BRUTE_RADIUS : ZOMBIE_RADIUS;
      if (Math.hypot(z.x - b.x, z.y - b.y) < zR + 4) {
        if (b.paint) paintZombie(s, z);
        else hurtZombie(s, z, b.dmg);
        b.alive = false;
        break;
      }
    }
    if (!b.alive) continue;
    for (const c of s.world.critters) {
      if (!c.alive) continue;
      if (Math.hypot(c.x - b.x, c.y - b.y) < critterRadius(c) + 4) {
        if (!b.paint) hurtCritter(s, c, b.dmg);
        else burst(s, c.x, c.y, "#e85ad0", 4);
        b.alive = false;
        break;
      }
    }
  }
}

function zombieRadius(z: Zombie) {
  return z.brute ? BRUTE_RADIUS : ZOMBIE_RADIUS;
}

function stepZombies(s: GameState, dt: number) {
  const p = s.player;
  const blocked = s.world.blocked;
  const tiles = s.world.tiles;
  const world = s.world;
  const mapW = MAP_W * TILE;
  const mapH = MAP_H * TILE;
  let nearby = 0;
  for (const z of s.world.zombies) {
    if (!z.alive) continue;
    z.hitT = Math.max(0, z.hitT - dt);
    z.attackCd = Math.max(0, z.attackCd - dt);
    if (z.paintT > 0) z.paintT = Math.max(0, z.paintT - dt);
    const dx = p.x - z.x;
    const dy = p.y - z.y;
    const d = Math.hypot(dx, dy);
    if (d > 1400) continue;
    nearby++;
    if (nearby > 90) continue;

    const town = inTown(z.x, z.y);
    const detect = z.paintT > 0 ? 40 : town ? 220 : 130;
    const zR = zombieRadius(z);
    const biteR = PLAYER_RADIUS + zR + 5;
    const ground = tileSpeed(tileAt(tiles, z.x, z.y));
    const painted = z.paintT > 0;
    const base =
      (z.brute ? BRUTE_SPEED : town ? ZOMBIE_TOWN_SPEED : ZOMBIE_SPEED) * ground * (painted ? 0.45 : 1);
    let vx = 0;
    let vy = 0;
    const seeking = d < detect && !painted;

    if (d < biteR) {
      vx = 0;
      vy = 0;
      if (z.attackCd <= 0) {
        bite(s, z);
        z.attackCd = z.brute ? 2.0 : 1.7;
      }
    } else if (seeking) {
      vx = (dx / (d || 1)) * base;
      vy = (dy / (d || 1)) * base;
    } else {
      z.wanderT -= dt;
      if (z.wanderT <= 0) {
        z.wanderT = 2 + s.rng() * 4;
        z.wx = z.x + (s.rng() - 0.5) * 80;
        z.wy = z.y + (s.rng() - 0.5) * 80;
      }
      const wx = z.wx - z.x;
      const wy = z.wy - z.y;
      const wd = Math.hypot(wx, wy) || 1;
      vx = (wx / wd) * base * 0.35;
      vy = (wy / wd) * base * 0.35;
    }

    if (d > biteR) {
      for (const o of s.world.zombies) {
        if (o === z || !o.alive) continue;
        const ox = z.x - o.x;
        const oy = z.y - o.y;
        const od = Math.hypot(ox, oy);
        const sep = z.brute || o.brute ? 22 : 16;
        if (od > 0 && od < sep) {
          vx += (ox / od) * 8;
          vy += (oy / od) * 8;
        }
      }
    }

    const ox = z.x;
    const oy = z.y;
    tryMove(z, blocked, MAP_W, vx * dt, vy * dt, mapW, mapH, world, zR);
    const mx = z.x - ox;
    const my = z.y - oy;
    const moved = Math.hypot(mx, my);
    if (moved > 0.25) {
      z.walk += moved * 0.11;
      if (Math.abs(mx) > Math.abs(my)) z.facing = mx < 0 ? 1 : 2;
      else z.facing = my < 0 ? 3 : 0;
    }
    z.vx = mx / dt;
    z.vy = my / dt;
  }
}

function inTown(x: number, y: number): boolean {
  const t = worldToGeo(x, y);
  return t.lng > -79.92 || (t.lng > -79.95 && t.lat > 36.985);
}

function bite(s: GameState, z: Zombie) {
  const p = s.player;
  if (p.invuln > 0) return;
  const armor = p.armor ? ITEMS[p.armor] : null;
  const def = armor?.def ?? 0;
  const inf = armor?.infect ?? 0;
  const raw = z.brute ? 50 : 14.3;
  const dmg = raw * (1 - def);
  p.hp -= dmg;
  p.invuln = z.brute ? 0.55 : 0.45;
  s.shake = z.brute ? 0.34 : 0.22;
  burst(s, p.x, p.y, "#a33b34", z.brute ? 12 : 8);
  const chance = (z.brute ? 0.55 : 0.3) * (1 - inf);
  if (s.rng() < chance && p.infection <= 0) {
    p.infection = INFECTION_TIME;
    toast(s, "Bitten. Find antibiotics.");
  }
}

function stepWildlife(s: GameState, dt: number) {
  const p = s.player;
  const blocked = s.world.blocked;
  const tiles = s.world.tiles;
  const world = s.world;
  const mapW = MAP_W * TILE;
  const mapH = MAP_H * TILE;
  const inside = !!s.interior;
  let bearWarned = false;

  for (const c of s.world.critters) {
    if (!c.alive) continue;
    c.dashT = Math.max(0, c.dashT - dt);
    const r = critterRadius(c);
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const pd = Math.hypot(dx, dy);

    if (!inside && (c.kind === "bear" || c.kind === "cub")) {
      if (pd < 420 && !bearWarned && c.kind === "bear") {
        bearWarned = true;
        if (pd < 260 && s.toastT <= 0) toast(s, "A bear. Don't.");
      }
      if (pd < r + PLAYER_RADIUS) {
        p.hp = 0;
        toast(s, "The bear.");
        burst(s, p.x, p.y, "#4a2018", 16);
      }
      for (const z of s.world.zombies) {
        if (!z.alive) continue;
        if (Math.hypot(z.x - c.x, z.y - c.y) < r + zombieRadius(z)) {
          z.alive = false;
          burst(s, z.x, z.y, "#4a2018", 8);
        }
      }
      for (const o of s.world.critters) {
        if (o === c || !o.alive) continue;
        if (o.kind === "bear" || o.kind === "cub") continue;
        if (o.kind === "doe" || o.kind === "buck" || o.kind === "fawn") {
          if (Math.hypot(o.x - c.x, o.y - c.y) < r + critterRadius(o)) {
            o.alive = false;
            burst(s, o.x, o.y, "#4a2018", 6);
          }
        }
      }
    }

    let vx = 0;
    let vy = 0;
    const ground = tileSpeed(tileAt(tiles, c.x, c.y));
    const mom = c.follow ? s.world.critters.find((o) => o.id === c.follow && o.alive) : null;

    if (c.kind === "bear" || c.kind === "cub") {
      const speed = (c.kind === "bear" ? 22 : 26) * ground;
      if (mom) {
        const mx = mom.x - c.x;
        const my = mom.y - c.y;
        const md = Math.hypot(mx, my) || 1;
        if (md > 36) {
          vx = (mx / md) * speed;
          vy = (my / md) * speed;
        }
      } else {
        c.dashT -= dt;
        if (c.dashT <= 0) {
          c.dashT = 3 + s.rng() * 4;
          c.pack = Math.floor(s.rng() * 8);
        }
        const ang = (c.pack / 8) * Math.PI * 2;
        vx = Math.cos(ang) * speed * 0.55;
        vy = Math.sin(ang) * speed * 0.55;
      }
    } else if (c.kind === "squirrel") {
      const speed = (pd < 90 || c.dashT > 0 ? 170 : 48) * ground;
      if (pd < 90 && c.dashT <= 0) c.dashT = 0.55;
      const ang = pd > 1 ? Math.atan2(-dy, -dx) + (s.rng() - 0.5) * 0.6 : s.rng() * Math.PI * 2;
      vx = Math.cos(ang) * speed;
      vy = Math.sin(ang) * speed;
    } else {
      const threat = nearestThreat(s, c.x, c.y, c.kind === "turkey" ? 140 : 180);
      const flee = threat && (!inside || threat.kind !== "player");
      const speed =
        (c.kind === "turkey" ? (flee ? 70 : 28) : flee ? 88 : 34) * ground;
      if (mom) {
        const mx = mom.x - c.x;
        const my = mom.y - c.y;
        const md = Math.hypot(mx, my) || 1;
        const space = c.kind === "fawn" ? 22 : 30;
        if (md > space) {
          vx = (mx / md) * speed;
          vy = (my / md) * speed;
        } else if (flee && threat) {
          const fx = c.x - threat.x;
          const fy = c.y - threat.y;
          const fd = Math.hypot(fx, fy) || 1;
          vx = (fx / fd) * speed;
          vy = (fy / fd) * speed;
        }
      } else if (flee && threat) {
        const fx = c.x - threat.x;
        const fy = c.y - threat.y;
        const fd = Math.hypot(fx, fy) || 1;
        vx = (fx / fd) * speed;
        vy = (fy / fd) * speed;
      } else {
        if (c.dashT <= 0) {
          c.dashT = 2 + s.rng() * 5;
          c.pack = Math.floor(s.rng() * 8);
        }
        const ang = (c.pack / 8) * Math.PI * 2;
        vx = Math.cos(ang) * speed * 0.4;
        vy = Math.sin(ang) * speed * 0.4;
      }
    }

    const ox = c.x;
    const oy = c.y;
    tryMove(c, blocked, MAP_W, vx * dt, vy * dt, mapW, mapH, world, Math.max(5, r * 0.45));
    const mx = c.x - ox;
    const my = c.y - oy;
    const moved = Math.hypot(mx, my);
    if (moved > 0.2) {
      c.walk += moved * (c.kind === "squirrel" ? 0.22 : 0.12);
      if (Math.abs(mx) > Math.abs(my)) c.facing = mx < 0 ? 1 : 2;
      else c.facing = my < 0 ? 3 : 0;
    }
    c.vx = mx / dt;
    c.vy = my / dt;
  }
}

function nearestThreat(s: GameState, x: number, y: number, r: number): { x: number; y: number; kind: string } | null {
  let best: { x: number; y: number; kind: string } | null = null;
  let d = r;
  if (!s.interior) {
    const pd = Math.hypot(s.player.x - x, s.player.y - y);
    if (pd < d) {
      d = pd;
      best = { x: s.player.x, y: s.player.y, kind: "player" };
    }
  }
  for (const z of s.world.zombies) {
    if (!z.alive) continue;
    const zd = Math.hypot(z.x - x, z.y - y);
    if (zd < d) {
      d = zd;
      best = { x: z.x, y: z.y, kind: "zombie" };
    }
  }
  for (const c of s.world.critters) {
    if (!c.alive) continue;
    if (c.kind !== "bear" && c.kind !== "cub") continue;
    const bd = Math.hypot(c.x - x, c.y - y);
    if (bd < d + 40) {
      d = bd;
      best = { x: c.x, y: c.y, kind: "bear" };
    }
  }
  return best;
}

export function useItem(s: GameState, slotIndex: number) {
  const slot = s.player.inv[slotIndex];
  if (!slot) return;
  const def = ITEMS[slot.id];
  if (!def) return;
  if (def.kind === "weapon" || def.kind === "ranged" || def.kind === "tool") {
    s.player.weapon = def.id;
    toast(s, `Equipped ${def.name}`);
    return;
  }
  if (def.kind === "armor") {
    s.player.armor = def.id;
    toast(s, `Wearing ${def.name}`);
    return;
  }
  if (def.kind === "consumable") {
    if (!takeItem(s.player.inv, def.id, 1)) return;
    if (def.heal) s.player.hp = Math.min(s.player.maxHp, s.player.hp + def.heal);
    if (def.cure) {
      s.player.infection = 0;
      toast(s, "The fever breaks.");
    } else toast(s, def.name);
  }
}

export function toast(s: GameState, msg: string) {
  s.toast = msg;
  s.toastT = 2.4;
}

function burst(s: GameState, x: number, y: number, color: string, n: number) {
  for (let i = 0; i < n; i++) {
    const a = s.rng() * Math.PI * 2;
    const sp = 20 + s.rng() * 50;
    s.particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.35 + s.rng() * 0.25,
      max: 0.5,
      color,
      s: 2 + s.rng() * 3,
    });
  }
}

export function stepParticles(s: GameState, dt: number) {
  for (const p of s.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 40 * dt;
  }
  if (s.particles.length > 180) s.particles.splice(0, s.particles.length - 180);
  s.particles = s.particles.filter((p) => p.life > 0);
}

export function snapshotSave(s: GameState) {
  return {
    version: SAVE_VERSION,
    x: s.interior ? s.returnX : s.player.x,
    y: s.interior ? s.returnY : s.player.y,
    hp: s.player.hp,
    infection: s.player.infection,
    weapon: s.player.weapon,
    armor: s.player.armor,
    inv: s.player.inv,
    claimed: [...s.claimed],
    chests: s.chests,
    searched: [...s.searched],
    chopped: s.world.trees.filter((t) => t.chopped).map((t) => t.id),
    deadZ: s.world.zombies.filter((z) => !z.alive).map((z) => z.id),
    deadC: s.world.critters.filter((c) => !c.alive).map((c) => c.id),
    interior: s.interior?.buildingId ?? null,
  };
}

export function applySave(
  s: GameState,
  data: {
    x: number;
    y: number;
    hp: number;
    infection: number;
    weapon: string;
    armor: string;
    inv: Slot[];
    claimed: string[];
    chests: Record<string, Slot[]>;
    searched: string[];
    chopped: number[];
    deadZ: number[];
    deadC?: number[];
  },
) {
  s.player.x = data.x;
  s.player.y = data.y;
  s.player.hp = data.hp;
  s.player.infection = data.infection;
  s.player.weapon =
    data.weapon === "pistol" ? "pistol9" : data.weapon === "shotgun" ? "pump12" : data.weapon;
  s.player.armor = data.armor;
  s.player.inv = (data.inv ?? []).map((s) => ({
    ...s,
    id: ({ bullets: "ammo9", shells: "ammo12", pistol: "pistol9", shotgun: "pump12" } as Record<string, string>)[s.id] ?? s.id,
  }));
  s.claimed = new Set(data.claimed);
  s.chests = data.chests ?? {};
  s.searched = new Set(data.searched);
  const chopped = new Set(data.chopped);
  for (const t of s.world.trees) if (chopped.has(t.id)) t.chopped = true;
  const dead = new Set(data.deadZ);
  for (const z of s.world.zombies) if (dead.has(z.id)) z.alive = false;
  const deadC = new Set(data.deadC ?? []);
  for (const c of s.world.critters) if (deadC.has(c.id)) c.alive = false;
  for (const b of s.world.buildings) b.claimed = s.claimed.has(b.id);
}
