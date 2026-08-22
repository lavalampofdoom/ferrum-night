import {
  BEAR_RADIUS,
  BRUTE_RADIUS,
  BRUTE_SPEED,
  CAR_GAS,
  CAR_RADIUS,
  CAR_SPEED,
  CONTAINER_CAP,
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
import { ITEMS, addItem, moveSlot, rollLoot, takeItem, type Slot } from "./items";
import { SAVE_VERSION } from "./save";
import {
  blockedAt,
  buildInterior,
  solidHit,
  tileAt,
  type Building,
  type Car,
  type Critter,
  type Interact,
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

export type GroundDrop = {
  id: number;
  x: number;
  y: number;
  slot: Slot;
  inside: string | null;
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
  carId: number | null;
  placedBenches: Record<string, { x: number; y: number }[]>;
  openChest: string | null;
  chestLabel: string;
  drops: GroundDrop[];
  dropSeq: number;
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
    carId: null,
    placedBenches: {},
    openChest: null,
    chestLabel: "",
    drops: [],
    dropSeq: 1,
  };
}

export function currentCar(s: GameState): Car | null {
  if (s.carId == null) return null;
  return s.world.cars.find((c) => c.id === s.carId) ?? null;
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

  const inCar = s.carId != null;
  const mapW = s.interior ? s.interior.w * TILE : MAP_W * TILE;
  const mapH = s.interior ? s.interior.h * TILE : MAP_H * TILE;
  const blocked = s.interior ? s.interior.blocked : s.world.blocked;
  const tiles = s.interior ? s.interior.tiles : s.world.tiles;
  const bw = s.interior ? s.interior.w : MAP_W;

  if (inCar && !s.interior) {
    driveCar(s, a, dt);
  } else {
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
    tryMove(p, blocked, bw, mx, my, mapW, mapH, s.interior ? undefined : s.world, PLAYER_RADIUS, s.carId);
    const dist = Math.hypot(p.x - ox, p.y - oy);
    p.moving = dist > 0.2;
    if (p.moving) p.walk += dist * 0.14;
    if (a.aimOn) {
      const adx = a.aimX - p.x;
      const ady = a.aimY - p.y;
      if (Math.hypot(adx, ady) > 10) {
        if (Math.abs(adx) > Math.abs(ady)) p.facing = adx < 0 ? 1 : 2;
        else p.facing = ady < 0 ? 3 : 0;
      }
    }
  }

  s.atBench = false;
  s.hint = "";

  if (!s.interior && inCar) {
    const car = currentCar(s);
    s.hint = !car || car.gas <= 1 ? "Out of gas · E exit" : "W/S drive · A/D steer · E exit";
    if (a.justUse) exitCar(s);
  } else if (!s.interior && !inCar) {
    const nearCar = nearestCar(s, 30);
    const nearB = nearestBuilding(s, 46);
    const carCloser =
      nearCar && (!nearB || Math.hypot(nearCar.x - p.x, nearCar.y - p.y) <= Math.hypot(nearB.doorX - p.x, nearB.doorY - p.y));
    if (nearCar && carCloser) {
      s.hint = nearCar.gas <= 1 ? "Empty car — needs gas" : "Enter car";
      if (a.justUse) {
        s.carId = nearCar.id;
        p.x = nearCar.x;
        p.y = nearCar.y;
        toast(s, "Engine turns.");
      }
    } else if (nearB) {
      if (nearB.locked && !nearB.doorBroken) {
        s.hint = "Door locked — bash it";
        if (a.justAttack && p.attackT <= 0) bashDoor(s, nearB);
      } else {
        s.hint = nearB.doorBroken ? `Enter ${nearB.name} (door gone)` : `Enter ${nearB.name}`;
        if (a.justUse) enterBuilding(s, nearB);
      }
    }

    const nearTree = nearestTree(s, 28);
    if (nearTree && !nearB && !nearCar) {
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
    } else if (!nearB && !nearCar) {
      const drop = nearestDrop(s, 22);
      if (drop) {
        s.hint = `Pick up ${ITEMS[drop.slot.id]?.name ?? "item"}`;
        if (a.justUse) pickupDrop(s, drop);
      }
    }
  }

  if (s.interior) {
    let closest: Interact | null = null;
    let cd = 40;
    for (const f of s.interior.furniture) {
      if (f.kind === "lock") {
        const bld = s.world.buildings.find((x) => x.id === s.interior?.buildingId);
        if (!bld || bld.doorBroken) continue;
        f.label = bld.locked ? "Unlock door" : "Lock door";
      }
      const d = Math.hypot(f.x - p.x, f.y - p.y);
      if (d < cd) {
        cd = d;
        closest = f;
      }
    }
    if (closest && cd < closest.r + 8) {
      if (closest.kind === "bench") s.atBench = true;
      if (closest.kind === "claim" && s.claimed.has(s.interior.buildingId)) s.hint = "Your home";
      else s.hint = closest.label;
      if (a.justUse) useFurniture(s, closest);
    } else {
      const drop = nearestDrop(s, 22);
      if (drop) {
        s.hint = `Pick up ${ITEMS[drop.slot.id]?.name ?? "item"}`;
        if (a.justUse) pickupDrop(s, drop);
      }
    }
  }

  const bashingLocked =
    !s.interior &&
    !inCar &&
    !!nearestBuilding(s, 46)?.locked &&
    !nearestBuilding(s, 46)?.doorBroken;
  if (a.justAttack && p.attackT <= 0 && !bashingLocked && !inCar) doAttack(s, a);

  stepBullets(s, dt);
  stepWildlife(s, dt);
  stepZombies(s, dt);

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
  skipCar: number | null = null,
) {
  const nx = Math.max(12, Math.min(mapW - 12, p.x + mx));
  const ny = Math.max(12, Math.min(mapH - 12, p.y + my));
  const stuck = circleBlocked(blocked, bw, p.x, p.y, radius, world, skipCar);
  if (stuck || !circleBlocked(blocked, bw, nx, p.y, radius, world, skipCar)) p.x = nx;
  if (stuck || !circleBlocked(blocked, bw, p.x, ny, radius, world, skipCar)) p.y = ny;
}

function circleBlocked(
  blocked: Uint8Array,
  bw: number,
  x: number,
  y: number,
  r: number,
  world?: World,
  skipCar: number | null = null,
): boolean {
  const pts: [number, number][] = [
    [x - r, y],
    [x + r, y],
    [x, y - r],
    [x, y + r * 0.4],
  ];
  if (pts.some(([px, py]) => blockedAt(blocked, px, py, bw))) return true;
  if (world && solidHit(world, x, y, r)) return true;
  if (world) {
    for (const c of world.cars) {
      if (c.id === skipCar) continue;
      if (Math.hypot(c.x - x, c.y - y) < r + CAR_RADIUS) return true;
    }
  }
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

function nearestCar(s: GameState, r: number): Car | null {
  let best: Car | null = null;
  let d = r;
  for (const c of s.world.cars) {
    const dist = Math.hypot(c.x - s.player.x, c.y - s.player.y);
    if (dist < d) {
      d = dist;
      best = c;
    }
  }
  return best;
}

function driveCar(s: GameState, a: Actions, dt: number) {
  const car = currentCar(s);
  const p = s.player;
  if (!car) {
    s.carId = null;
    return;
  }
  car.ang -= a.moveX * 2.6 * dt;
  const thrust = -a.moveY;
  const empty = car.gas <= 0;
  const t = empty ? 0 : thrust;
  if (Math.abs(t) > 0.08) car.gas = Math.max(0, car.gas - dt);
  const ground = tileSpeed(tileAt(s.world.tiles, car.x, car.y));
  const spd = CAR_SPEED * Math.max(0.55, ground) * t;
  const mx = Math.sin(car.ang) * spd * dt;
  const my = Math.cos(car.ang) * spd * dt;
  const ox = car.x;
  const oy = car.y;
  tryMove(car, s.world.blocked, MAP_W, mx, my, MAP_W * TILE, MAP_H * TILE, s.world, CAR_RADIUS, car.id);
  p.x = car.x;
  p.y = car.y;
  p.moving = Math.hypot(car.x - ox, car.y - oy) > 0.4;
  if (p.moving) {
    p.walk += 0.2;
    const ax = car.x - ox;
    const ay = car.y - oy;
    if (Math.abs(ax) > Math.abs(ay)) p.facing = ax < 0 ? 1 : 2;
    else p.facing = ay < 0 ? 3 : 0;
  }
  if (empty && Math.abs(thrust) > 0.2 && s.toastT <= 0) toast(s, "Out of gas.");
  ramZombies(s, car, Math.hypot(car.x - ox, car.y - oy) / dt);
}

function ramZombies(s: GameState, car: Car, speed: number) {
  if (speed < 70) return;
  for (const z of s.world.zombies) {
    if (!z.alive || z.inside) continue;
    if (Math.hypot(z.x - car.x, z.y - car.y) < CAR_RADIUS + zombieRadius(z) + 6) {
      hurtZombie(s, z, z.brute ? 55 : 120);
      z.x += Math.sin(car.ang) * 18;
      z.y += Math.cos(car.ang) * 18;
      s.shake = 0.18;
    }
  }
}

function exitCar(s: GameState) {
  const car = currentCar(s);
  s.carId = null;
  if (car) {
    s.player.x = car.x + Math.cos(car.ang) * 22;
    s.player.y = car.y - Math.sin(car.ang) * 22;
  }
  toast(s, "You step out.");
}

function bashDoor(s: GameState, b: Building) {
  const p = s.player;
  const wep = ITEMS[p.weapon] ?? ITEMS.fists!;
  p.attackT = wep.rate ?? 0.45;
  const pry = wep.tool === "pry" ? 1.8 : 1;
  const dmg = (wep.dmg ?? 6) * pry;
  b.doorHp -= dmg;
  burst(s, b.doorX, b.doorY, "#6b5344", 8);
  s.shake = 0.12;
  if (b.doorHp <= 0) {
    b.doorHp = 0;
    b.doorBroken = true;
    b.locked = false;
    toast(s, "The door gives.");
  } else {
    toast(s, "The lock holds.");
  }
}

function attachBenches(s: GameState, interior: Interior) {
  const extra = s.placedBenches[interior.buildingId];
  if (!extra) return;
  for (let i = 0; i < extra.length; i++) {
    const e = extra[i]!;
    interior.furniture.push({
      id: `${interior.buildingId}-placed-bench-${i}`,
      kind: "bench",
      x: e.x,
      y: e.y,
      r: 24,
      label: "Crafting bench",
      look: "bench",
    });
  }
}

function enterBuilding(s: GameState, b: Building) {
  if (b.locked && !b.doorBroken) return;
  s.returnX = s.player.x;
  s.returnY = s.player.y;
  s.interior = buildInterior(b, s.rng);
  attachBenches(s, s.interior);
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
  s.openChest = null;
  s.chestLabel = "";
}

function lootTableFor(b: Building | undefined): string {
  if (!b) return "house";
  if (b.zone === "rural" && (b.kind === "house" || b.kind === "ranch")) return "farm";
  return b.lootTable ?? "house";
}

function useFurniture(s: GameState, f: Interact) {
  const p = s.player;
  const b = s.world.buildings.find((x) => x.id === s.interior?.buildingId);
  if (f.kind === "door") {
    leaveBuilding(s);
    return;
  }
  if (f.kind === "lock") {
    if (!b || b.doorBroken) {
      toast(s, "The door is gone.");
      return;
    }
    b.locked = !b.locked;
    toast(s, b.locked ? "Door locked." : "Door unlocked.");
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
    toast(s, "Workbench — open the pack to craft.");
    return;
  }
  if (f.kind === "chest" || f.kind === "loot") {
    openContainer(s, f, b);
    return;
  }
}

function placeWorkbench(s: GameState) {
  if (!s.interior) {
    toast(s, "Place it inside a building.");
    return;
  }
  if (!takeItem(s.player.inv, "workbench", 1)) return;
  const x = s.player.x;
  const y = s.player.y - 12;
  const list = s.placedBenches[s.interior.buildingId] ?? [];
  list.push({ x, y });
  s.placedBenches[s.interior.buildingId] = list;
  s.interior.furniture.push({
    id: `${s.interior.buildingId}-placed-bench-${list.length - 1}`,
    kind: "bench",
    x,
    y,
    r: 24,
    label: "Crafting bench",
  });
  toast(s, "Crafting table set.");
}

function refillCar(s: GameState, amount: number) {
  const car =
    currentCar(s) ??
    nearestCar(s, 36);
  if (!car) {
    toast(s, "No car close enough.");
    return false;
  }
  car.gas = Math.min(CAR_GAS, car.gas + amount);
  toast(s, "Tank topped off.");
  return true;
}

function openContainer(s: GameState, f: Interact, b: Building | undefined) {
  if (!s.chests[f.id]) {
    if (f.kind === "loot") {
      const table = lootTableFor(b);
      const loot = rollLoot(table, s.rng, 2 + Math.floor(s.rng() * 2));
      if (table === "farm" && /crate/i.test(f.label) && s.rng() < 0.42) {
        const existing = loot.find((l) => l.id === "hatchet");
        if (existing) existing.n += 1;
        else loot.push({ id: "hatchet", n: 1 });
      }
      const slots: Slot[] = [];
      for (const l of loot) addItem(slots, l.id, l.n, CONTAINER_CAP);
      s.chests[f.id] = slots;
    } else {
      s.chests[f.id] = [];
    }
  }
  s.searched.add(f.id);
  s.openChest = f.id;
  s.chestLabel = f.label.replace(/^Search /i, "") || "Container";
}

function nearestDrop(s: GameState, r: number): GroundDrop | null {
  const inside = s.interior?.buildingId ?? null;
  let best: GroundDrop | null = null;
  let d = r;
  for (const drop of s.drops) {
    if ((drop.inside ?? null) !== inside) continue;
    const dist = Math.hypot(drop.x - s.player.x, drop.y - s.player.y);
    if (dist < d) {
      d = dist;
      best = drop;
    }
  }
  return best;
}

function pickupDrop(s: GameState, drop: GroundDrop) {
  if (!addItem(s.player.inv, drop.slot.id, drop.slot.n)) {
    toast(s, "Pack is full.");
    return;
  }
  s.drops = s.drops.filter((d) => d.id !== drop.id);
  toast(s, `${ITEMS[drop.slot.id]?.name ?? "Item"} taken.`);
}

export function closeContainer(s: GameState) {
  s.openChest = null;
  s.chestLabel = "";
}

export function takeFromChest(s: GameState, index: number) {
  if (!s.openChest) return;
  const box = s.chests[s.openChest];
  if (!box) return;
  if (!moveSlot(box, s.player.inv, index, 24)) toast(s, "Pack is full.");
}

export function storeInChest(s: GameState, index: number) {
  if (!s.openChest) return;
  const box = s.chests[s.openChest] ?? (s.chests[s.openChest] = []);
  if (!moveSlot(s.player.inv, box, index, CONTAINER_CAP)) toast(s, "No room in there.");
}

export function dropItem(s: GameState, index: number) {
  const slot = s.player.inv[index];
  if (!slot) return;
  s.player.inv.splice(index, 1);
  s.dropSeq += 1;
  s.drops.push({
    id: s.dropSeq,
    x: s.player.x + (s.rng() - 0.5) * 8,
    y: s.player.y + 6,
    slot: { ...slot },
    inside: s.interior?.buildingId ?? null,
  });
  toast(s, `Dropped ${ITEMS[slot.id]?.name ?? "item"}.`);
}

function aimDir(s: GameState, a: Actions): { x: number; y: number } {
  if (a.aimOn) {
    const dx = a.aimX - s.player.x;
    const dy = a.aimY - s.player.y;
    const d = Math.hypot(dx, dy);
    if (d > 8) return { x: dx / d, y: dy / d };
  }
  return FACE_VEC[s.player.facing] ?? FACE_VEC[0]!;
}

function doAttack(s: GameState, a: Actions) {
  const p = s.player;
  const wep = ITEMS[p.weapon] ?? ITEMS.fists!;
  p.attackT = wep.rate ?? 0.45;
  const dir = aimDir(s, a);
  const zeds = activeZombies(s);

  if (wep.kind === "ranged") {
    if (wep.nonlethal && wep.contact) {
      let jammed = false;
      const reach = PLAYER_RADIUS + ZOMBIE_RADIUS + 4;
      for (const z of zeds) {
        if (Math.hypot(z.x - p.x, z.y - p.y) <= reach) {
          hurtZombie(s, z, wep.contact);
          jammed = true;
        }
      }
      if (!s.interior) {
        for (const c of s.world.critters) {
          if (!c.alive) continue;
          if (Math.hypot(c.x - p.x, c.y - p.y) <= reach + 4) {
            hurtCritter(s, c, wep.contact);
            jammed = true;
          }
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
  for (const z of zeds) {
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
  if (!s.interior) {
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

function activeZombies(s: GameState): Zombie[] {
  const id = s.interior?.buildingId ?? null;
  return s.world.zombies.filter((z) => z.alive && (id ? z.inside === id : !z.inside));
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
  const zeds = activeZombies(s);
  for (const b of s.bullets) {
    if (!b.alive) continue;
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0 || blockedAt(blocked, b.x, b.y, bw)) {
      b.alive = false;
      continue;
    }
    for (const z of zeds) {
      const zR = z.brute ? BRUTE_RADIUS : ZOMBIE_RADIUS;
      if (Math.hypot(z.x - b.x, z.y - b.y) < zR + 4) {
        if (b.paint) paintZombie(s, z);
        else hurtZombie(s, z, b.dmg);
        b.alive = false;
        break;
      }
    }
    if (!b.alive || s.interior) continue;
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
  if (s.interior) {
    stepZombiesOn(
      s,
      dt,
      s.world.zombies.filter((z) => z.alive && z.inside === s.interior!.buildingId),
      s.interior.blocked,
      s.interior.tiles,
      s.interior.w,
      s.interior.w * TILE,
      s.interior.h * TILE,
      undefined,
      s.player.x,
      s.player.y,
      true,
    );
    breachInto(s, dt);
  } else {
    stepZombiesOn(
      s,
      dt,
      s.world.zombies.filter((z) => z.alive && !z.inside),
      s.world.blocked,
      s.world.tiles,
      MAP_W,
      MAP_W * TILE,
      MAP_H * TILE,
      s.world,
      s.player.x,
      s.player.y,
      false,
    );
  }
}

function stepZombiesOn(
  s: GameState,
  dt: number,
  list: Zombie[],
  blocked: Uint8Array,
  tiles: Uint8Array,
  bw: number,
  mapW: number,
  mapH: number,
  world: World | undefined,
  tx: number,
  ty: number,
  indoor: boolean,
) {
  const p = s.player;
  const invulnCar = s.carId != null && !indoor;
  let nearby = 0;
  for (const z of list) {
    z.hitT = Math.max(0, z.hitT - dt);
    z.attackCd = Math.max(0, z.attackCd - dt);
    if (z.paintT > 0) z.paintT = Math.max(0, z.paintT - dt);
    const dx = tx - z.x;
    const dy = ty - z.y;
    const d = Math.hypot(dx, dy);
    if (!indoor && d > 1400) continue;
    nearby++;
    if (nearby > 90) continue;

    const town = indoor ? false : inTown(z.x, z.y);
    const detect = z.paintT > 0 ? 40 : indoor ? 280 : town ? 220 : 130;
    const zR = zombieRadius(z);
    const biteR = PLAYER_RADIUS + zR + 1;
    const ground = tileSpeed(tileAt(tiles, z.x, z.y, bw));
    const painted = z.paintT > 0;
    const base =
      (z.brute ? BRUTE_SPEED : town ? ZOMBIE_TOWN_SPEED : ZOMBIE_SPEED) * ground * (painted ? 0.45 : 1);
    let vx = 0;
    let vy = 0;
    const seeking = d < detect && !painted;

    if (d < biteR) {
      vx = 0;
      vy = 0;
      if (z.attackCd <= 0 && !invulnCar) {
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
      for (const o of list) {
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
    tryMove(z, blocked, bw, vx * dt, vy * dt, mapW, mapH, world, zR);
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
  void p;
}

function breachInto(s: GameState, dt: number) {
  const interior = s.interior;
  if (!interior) return;
  const b = s.world.buildings.find((x) => x.id === interior.buildingId);
  if (!b || b.locked) return;
  const need = b.doorBroken ? 1.15 : 3.6;
  for (const z of s.world.zombies) {
    if (!z.alive || z.inside) continue;
    const d = Math.hypot(z.x - b.doorX, z.y - b.doorY);
    if (d > 70) {
      z.enterT = Math.max(0, z.enterT - dt);
      continue;
    }
    z.enterT += dt;
    if (z.enterT >= need) {
      z.enterT = 0;
      z.inside = b.id;
      z.x = interior.spawnX + (s.rng() - 0.5) * 18;
      z.y = interior.spawnY - 10;
      toast(s, b.doorBroken ? "They're in." : "A walker slipped in.");
    }
  }
}

function inTown(x: number, y: number): boolean {
  const t = worldToGeo(x, y);
  return t.lng > -79.92 || (t.lng > -79.95 && t.lat > 36.985);
}

function bite(s: GameState, z: Zombie) {
  const p = s.player;
  if (p.invuln > 0) return;
  if (s.carId != null && !s.interior) return;
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
  const inCar = s.carId != null;
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
      if (pd < r + PLAYER_RADIUS && !inCar) {
        p.hp = 0;
        toast(s, "The bear.");
        burst(s, p.x, p.y, "#4a2018", 16);
      }
      for (const z of s.world.zombies) {
        if (!z.alive || z.inside) continue;
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
      const speed = (c.kind === "turkey" ? (flee ? 70 : 28) : flee ? 88 : 34) * ground;
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
    if (!z.alive || z.inside) continue;
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
  if (def.kind === "place") {
    if (def.id === "workbench") placeWorkbench(s);
    return;
  }
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
    if (def.gas) {
      if (!refillCar(s, def.gas)) return;
      takeItem(s.player.inv, def.id, 1);
      return;
    }
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
    doors: Object.fromEntries(
      s.world.buildings.map((b) => [b.id, { locked: b.locked, broken: b.doorBroken, hp: b.doorHp }]),
    ),
    benches: s.placedBenches,
    cars: s.world.cars.map((c) => ({ id: c.id, x: c.x, y: c.y, ang: c.ang, gas: c.gas })),
    carId: s.carId,
    drops: s.drops,
    zeds: s.world.zombies.map((z) => ({
      id: z.id,
      x: z.x,
      y: z.y,
      hp: z.hp,
      alive: z.alive,
      inside: z.inside,
    })),
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
    doors?: Record<string, { locked: boolean; broken: boolean; hp: number }>;
    benches?: Record<string, { x: number; y: number }[]>;
    cars?: { id: number; x: number; y: number; ang: number; gas: number }[];
    carId?: number | null;
    zeds?: { id: number; x: number; y: number; hp: number; alive: boolean; inside: string | null }[];
    drops?: { id: number; x: number; y: number; slot: Slot; inside: string | null }[];
  },
) {
  s.player.x = data.x;
  s.player.y = data.y;
  s.player.hp = data.hp;
  s.player.infection = data.infection;
  s.player.weapon =
    data.weapon === "pistol" ? "pistol9" : data.weapon === "shotgun" ? "pump12" : data.weapon;
  s.player.armor = data.armor;
  s.player.inv = (data.inv ?? []).map((slot) => ({
    ...slot,
    id:
      ({ bullets: "ammo9", shells: "ammo12", pistol: "pistol9", shotgun: "pump12" } as Record<string, string>)[
        slot.id
      ] ?? slot.id,
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
  if (data.doors) {
    for (const b of s.world.buildings) {
      const d = data.doors[b.id];
      if (!d) continue;
      b.locked = d.locked;
      b.doorBroken = d.broken;
      b.doorHp = d.hp;
    }
  }
  s.placedBenches = data.benches ?? {};
  if (data.cars) {
    for (const c of s.world.cars) {
      const saved = data.cars.find((x) => x.id === c.id);
      if (!saved) continue;
      c.x = saved.x;
      c.y = saved.y;
      c.ang = saved.ang;
      c.gas = saved.gas;
    }
  }
  s.carId = data.carId ?? null;
  if (data.zeds) {
    for (const z of s.world.zombies) {
      const saved = data.zeds.find((x) => x.id === z.id);
      if (!saved) continue;
      z.x = saved.x;
      z.y = saved.y;
      z.hp = saved.hp;
      z.alive = saved.alive;
      z.inside = saved.inside;
    }
  }
  s.drops = (data.drops ?? []).map((d) => ({ ...d, slot: { ...d.slot } }));
  s.dropSeq = s.drops.reduce((m, d) => Math.max(m, d.id), 1);
}
