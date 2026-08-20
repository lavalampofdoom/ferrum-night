import { INFECTION_TIME, PLAYER_RADIUS, PLAYER_SPEED, PLAYER_SPRINT, TILE, ZOMBIE_RADIUS, ZOMBIE_SPEED, ZOMBIE_TOWN_SPEED } from "./constants";
import type { Actions } from "./input";
import { ITEMS, addItem, rollLoot, takeItem, type Slot } from "./items";
import { blockedAt, buildInterior, type Building, type Interior, type World, type Zombie } from "./world";
import { mulberry32 } from "./rng";

export type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  life: number;
  alive: boolean;
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

  const mapW = s.interior ? s.interior.w * TILE : 400 * TILE;
  const mapH = s.interior ? s.interior.h * TILE : 260 * TILE;
  const blocked = s.interior ? s.interior.blocked : s.world.blocked;
  const bw = s.interior ? s.interior.w : 400;

  if (!s.atBench) {
    const spd = a.sprint ? PLAYER_SPRINT : PLAYER_SPEED;
    const mx = a.moveX * spd * dt;
    const my = a.moveY * spd * dt;
    if (mx || my) {
      if (Math.abs(mx) > Math.abs(my)) p.facing = mx < 0 ? 1 : 2;
      else p.facing = my < 0 ? 3 : 0;
    }
    tryMove(p, blocked, bw, mx, my, mapW, mapH);
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
  if (!s.interior) stepZombies(s, dt);
  else {
    // a few interior biters in town buildings
    if (s.world.buildings.find((b) => b.id === s.interior?.buildingId)?.zone === "town") {
      /* interiors stay clear for readability; zombies wait outside */
    }
  }

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
) {
  const nx = Math.max(12, Math.min(mapW - 12, p.x + mx));
  const ny = Math.max(12, Math.min(mapH - 12, p.y + my));
  const stuck = circleBlocked(blocked, bw, p.x, p.y, PLAYER_RADIUS);
  if (stuck || !circleBlocked(blocked, bw, nx, p.y, PLAYER_RADIUS)) p.x = nx;
  if (stuck || !circleBlocked(blocked, bw, p.x, ny, PLAYER_RADIUS)) p.y = ny;
}

function circleBlocked(blocked: Uint8Array, bw: number, x: number, y: number, r: number): boolean {
  const pts = [
    [x - r, y],
    [x + r, y],
    [x, y - r],
    [x, y + r * 0.4],
  ];
  return pts.some(([px, py]) => blockedAt(blocked, px!, py!, bw));
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
    const ammo = wep.ammo ?? "bullets";
    if (!takeItem(p.inv, ammo, 1)) {
      toast(s, "No ammo.");
      p.attackT = 0.2;
      return;
    }
    const n = wep.spread ?? 1;
    for (let i = 0; i < n; i++) {
      const spread = n > 1 ? (i - (n - 1) / 2) * 0.12 : 0;
      const ca = Math.cos(spread);
      const sa = Math.sin(spread);
      const vx = dir.x * ca - dir.y * sa;
      const vy = dir.x * sa + dir.y * ca;
      s.bullets.push({
        x: p.x + vx * 14,
        y: p.y + vy * 14,
        vx: vx * 320,
        vy: vy * 320,
        dmg: wep.dmg ?? 20,
        life: (wep.range ?? 200) / 320,
        alive: true,
      });
    }
    s.shake = 0.12;
    return;
  }

  const range = wep.range ?? 28;
  let hit = false;
  for (const z of s.world.zombies) {
    if (!z.alive) continue;
    if (s.interior) continue;
    const dx = z.x - p.x;
    const dy = z.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > range + ZOMBIE_RADIUS) continue;
    const ndx = d ? dx / d : 0;
    const ndy = d ? dy / d : 0;
    if (ndx * dir.x + ndy * dir.y < 0.25 && d > 16) continue;
    hurtZombie(s, z, wep.dmg ?? 8);
    hit = true;
  }
  if (hit) {
    s.shake = 0.16;
    s.hitstop = 0.04;
  }
}

function hurtZombie(s: GameState, z: Zombie, dmg: number) {
  z.hp -= dmg;
  z.hitT = 0.12;
  const dx = z.x - s.player.x;
  const dy = z.y - s.player.y;
  const d = Math.hypot(dx, dy) || 1;
  z.x += (dx / d) * 10;
  z.y += (dy / d) * 10;
  burst(s, z.x, z.y, "#6a2a24", 6);
  if (z.hp <= 0) {
    z.alive = false;
    if (s.rng() < 0.25) addItem(s.player.inv, "cloth", 1);
    if (s.rng() < 0.12) addItem(s.player.inv, "scrap", 1);
  }
}

function stepBullets(s: GameState, dt: number) {
  const blocked = s.interior ? s.interior.blocked : s.world.blocked;
  const bw = s.interior ? s.interior.w : 400;
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
      if (Math.hypot(z.x - b.x, z.y - b.y) < ZOMBIE_RADIUS + 4) {
        hurtZombie(s, z, b.dmg);
        b.alive = false;
        break;
      }
    }
  }
}

function stepZombies(s: GameState, dt: number) {
  const p = s.player;
  const blocked = s.world.blocked;
  let nearby = 0;
  for (const z of s.world.zombies) {
    if (!z.alive) continue;
    z.hitT = Math.max(0, z.hitT - dt);
    z.attackCd = Math.max(0, z.attackCd - dt);
    const dx = p.x - z.x;
    const dy = p.y - z.y;
    const d = Math.hypot(dx, dy);
    if (d > 1400) continue;
    nearby++;
    if (nearby > 90) continue;

    const town = z.x > 270 * TILE;
    const detect = town ? 220 : 130;
    let vx = 0;
    let vy = 0;
    if (d < detect) {
      vx = (dx / (d || 1)) * (town ? ZOMBIE_TOWN_SPEED : ZOMBIE_SPEED);
      vy = (dy / (d || 1)) * (town ? ZOMBIE_TOWN_SPEED : ZOMBIE_SPEED);
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
      vx = (wx / wd) * ZOMBIE_SPEED * 0.35;
      vy = (wy / wd) * ZOMBIE_SPEED * 0.35;
    }

    // light separation
    for (const o of s.world.zombies) {
      if (o === z || !o.alive) continue;
      const ox = z.x - o.x;
      const oy = z.y - o.y;
      const od = Math.hypot(ox, oy);
      if (od > 0 && od < 22) {
        vx += (ox / od) * 18;
        vy += (oy / od) * 18;
      }
    }

    const nx = z.x + vx * dt;
    const ny = z.y + vy * dt;
    if (!blockedAt(blocked, nx, z.y)) z.x = nx;
    if (!blockedAt(blocked, z.x, ny)) z.y = ny;
    if (Math.abs(vx) > Math.abs(vy)) z.facing = vx < 0 ? 1 : 2;
    else if (vy) z.facing = vy < 0 ? 3 : 0;

    if (d < PLAYER_RADIUS + ZOMBIE_RADIUS + 4 && z.attackCd <= 0) {
      bite(s, z);
      z.attackCd = 1.05;
    }
  }
}

function bite(s: GameState, z: Zombie) {
  const p = s.player;
  if (p.invuln > 0) return;
  const armor = p.armor ? ITEMS[p.armor] : null;
  const def = armor?.def ?? 0;
  const inf = armor?.infect ?? 0;
  const dmg = (8 + s.rng() * 5) * (1 - def);
  p.hp -= dmg;
  p.invuln = 0.45;
  s.shake = 0.22;
  burst(s, p.x, p.y, "#a33b34", 8);
  const chance = 0.3 * (1 - inf);
  if (s.rng() < chance && p.infection <= 0) {
    p.infection = INFECTION_TIME;
    toast(s, "Bitten. Find antibiotics.");
  }
  void z;
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
    version: 1 as const,
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
    interior: s.interior?.buildingId ?? null,
  };
}

export function applySave(s: GameState, data: {
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
}) {
  s.player.x = data.x;
  s.player.y = data.y;
  s.player.hp = data.hp;
  s.player.infection = data.infection;
  s.player.weapon = data.weapon;
  s.player.armor = data.armor;
  s.player.inv = data.inv ?? [];
  s.claimed = new Set(data.claimed);
  s.chests = data.chests ?? {};
  s.searched = new Set(data.searched);
  const chopped = new Set(data.chopped);
  for (const t of s.world.trees) if (chopped.has(t.id)) t.chopped = true;
  const dead = new Set(data.deadZ);
  for (const z of s.world.zombies) if (dead.has(z.id)) z.alive = false;
  for (const b of s.world.buildings) b.claimed = s.claimed.has(b.id);
}
