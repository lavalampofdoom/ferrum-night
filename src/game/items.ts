export type ItemKind = "mat" | "consumable" | "weapon" | "ranged" | "tool" | "armor" | "ammo";

export type ItemDef = {
  id: string;
  name: string;
  kind: ItemKind;
  stack: number;
  dmg?: number;
  rate?: number;
  range?: number;
  tool?: "chop" | "pry";
  chop?: number;
  ammo?: string;
  spread?: number;
  spreadRad?: number;
  speed?: number;
  silent?: boolean;
  nonlethal?: boolean;
  contact?: number;
  def?: number;
  infect?: number;
  heal?: number;
  cure?: boolean;
};

export const ITEMS: Record<string, ItemDef> = {
  wood: { id: "wood", name: "Wood", kind: "mat", stack: 50 },
  stone: { id: "stone", name: "Stone", kind: "mat", stack: 50 },
  scrap: { id: "scrap", name: "Scrap Metal", kind: "mat", stack: 40 },
  cloth: { id: "cloth", name: "Cloth", kind: "mat", stack: 30 },
  plastic: { id: "plastic", name: "Plastic", kind: "mat", stack: 30 },
  electronics: { id: "electronics", name: "Electronics", kind: "mat", stack: 20 },
  food: { id: "food", name: "Canned Food", kind: "consumable", stack: 20, heal: 20 },
  meat: { id: "meat", name: "Fresh Meat", kind: "consumable", stack: 12, heal: 16 },
  water: { id: "water", name: "Water Bottle", kind: "consumable", stack: 20, heal: 8 },
  medkit: { id: "medkit", name: "Medkit", kind: "consumable", stack: 6, heal: 55 },
  antibiotics: { id: "antibiotics", name: "Antibiotics", kind: "consumable", stack: 6, cure: true },
  ammo9: { id: "ammo9", name: "9mm", kind: "ammo", stack: 48 },
  ammo45: { id: "ammo45", name: ".45 ACP", kind: "ammo", stack: 32 },
  ammo12: { id: "ammo12", name: "12 Gauge", kind: "ammo", stack: 16 },
  ammo20: { id: "ammo20", name: "20 Gauge", kind: "ammo", stack: 16 },
  ammo556: { id: "ammo556", name: "5.56 NATO", kind: "ammo", stack: 60 },
  ammo762: { id: "ammo762", name: "7.62", kind: "ammo", stack: 20 },
  arrows: { id: "arrows", name: "Arrows", kind: "ammo", stack: 24 },
  paint: { id: "paint", name: "Paintballs", kind: "ammo", stack: 40 },
  bullets: { id: "bullets", name: "9mm", kind: "ammo", stack: 48 },
  shells: { id: "shells", name: "12 Gauge", kind: "ammo", stack: 16 },
  fists: { id: "fists", name: "Bare Hands", kind: "weapon", stack: 1, dmg: 6, rate: 0.4, range: 26 },
  knife: { id: "knife", name: "Kitchen Knife", kind: "weapon", stack: 1, dmg: 12, rate: 0.32, range: 28 },
  bat: { id: "bat", name: "Baseball Bat", kind: "weapon", stack: 1, dmg: 28, rate: 0.5, range: 40 },
  machete: { id: "machete", name: "Machete", kind: "weapon", stack: 1, dmg: 32, rate: 0.46, range: 36 },
  crowbar: {
    id: "crowbar",
    name: "Crowbar",
    kind: "weapon",
    stack: 1,
    dmg: 22,
    rate: 0.52,
    range: 34,
    tool: "pry",
  },
  hatchet: {
    id: "hatchet",
    name: "Hatchet",
    kind: "tool",
    stack: 1,
    dmg: 14,
    rate: 0.5,
    range: 32,
    tool: "chop",
    chop: 1,
  },
  axe: {
    id: "axe",
    name: "Wood Axe",
    kind: "tool",
    stack: 1,
    dmg: 16,
    rate: 0.62,
    range: 36,
    tool: "chop",
    chop: 2,
  },
  pistol9: {
    id: "pistol9",
    name: "9mm Pistol",
    kind: "ranged",
    stack: 1,
    dmg: 28,
    rate: 0.28,
    range: 280,
    ammo: "ammo9",
    speed: 420,
  },
  pistol45: {
    id: "pistol45",
    name: "1911 .45",
    kind: "ranged",
    stack: 1,
    dmg: 40,
    rate: 0.42,
    range: 250,
    ammo: "ammo45",
    speed: 400,
  },
  pump12: {
    id: "pump12",
    name: "12ga Pump",
    kind: "ranged",
    stack: 1,
    dmg: 14,
    rate: 0.9,
    range: 140,
    ammo: "ammo12",
    spread: 6,
    spreadRad: 0.16,
    speed: 340,
  },
  sawn20: {
    id: "sawn20",
    name: "20ga Sawed-Off",
    kind: "ranged",
    stack: 1,
    dmg: 10,
    rate: 0.7,
    range: 78,
    ammo: "ammo20",
    spread: 8,
    spreadRad: 0.3,
    speed: 300,
  },
  ar15: {
    id: "ar15",
    name: "AR-15 5.56",
    kind: "ranged",
    stack: 1,
    dmg: 34,
    rate: 0.12,
    range: 400,
    ammo: "ammo556",
    speed: 520,
  },
  bolt762: {
    id: "bolt762",
    name: "7.62 Bolt Rifle",
    kind: "ranged",
    stack: 1,
    dmg: 78,
    rate: 1.55,
    range: 560,
    ammo: "ammo762",
    speed: 560,
  },
  bow: {
    id: "bow",
    name: "Modern Bow",
    kind: "ranged",
    stack: 1,
    dmg: 42,
    rate: 0.88,
    range: 300,
    ammo: "arrows",
    speed: 220,
    silent: true,
  },
  paintball: {
    id: "paintball",
    name: "Paintball Marker",
    kind: "ranged",
    stack: 1,
    dmg: 0,
    rate: 0.2,
    range: 170,
    ammo: "paint",
    speed: 240,
    nonlethal: true,
    contact: 12,
  },
  pistol: {
    id: "pistol",
    name: "9mm Pistol",
    kind: "ranged",
    stack: 1,
    dmg: 28,
    rate: 0.28,
    range: 280,
    ammo: "ammo9",
    speed: 420,
  },
  shotgun: {
    id: "shotgun",
    name: "12ga Pump",
    kind: "ranged",
    stack: 1,
    dmg: 14,
    rate: 0.9,
    range: 140,
    ammo: "ammo12",
    spread: 6,
    spreadRad: 0.16,
    speed: 340,
  },
  hoodie: { id: "hoodie", name: "Hoodie", kind: "armor", stack: 1, def: 0.12, infect: 0.15 },
  jacket: { id: "jacket", name: "Work Jacket", kind: "armor", stack: 1, def: 0.28, infect: 0.32 },
  moto: { id: "moto", name: "Motorcycle Jacket", kind: "armor", stack: 1, def: 0.45, infect: 0.55 },
  riot: { id: "riot", name: "Riot Vest", kind: "armor", stack: 1, def: 0.6, infect: 0.72 },
};

export type Recipe = {
  id: string;
  out: string;
  count: number;
  station: "hand" | "bench";
  needs: Record<string, number>;
};

export const RECIPES: Recipe[] = [
  { id: "hatchet", out: "hatchet", count: 1, station: "hand", needs: { wood: 3, stone: 2 } },
  { id: "bat", out: "bat", count: 1, station: "hand", needs: { wood: 5 } },
  { id: "hoodie", out: "hoodie", count: 1, station: "hand", needs: { cloth: 4 } },
  { id: "arrows", out: "arrows", count: 4, station: "hand", needs: { wood: 2, stone: 1 } },
  { id: "knife", out: "knife", count: 1, station: "bench", needs: { scrap: 2 } },
  { id: "axe", out: "axe", count: 1, station: "bench", needs: { wood: 4, scrap: 3 } },
  { id: "crowbar", out: "crowbar", count: 1, station: "bench", needs: { scrap: 4 } },
  { id: "machete", out: "machete", count: 1, station: "bench", needs: { wood: 2, scrap: 4 } },
  { id: "jacket", out: "jacket", count: 1, station: "bench", needs: { cloth: 5, scrap: 1 } },
  { id: "moto", out: "moto", count: 1, station: "bench", needs: { cloth: 4, scrap: 5 } },
  { id: "riot", out: "riot", count: 1, station: "bench", needs: { scrap: 6, cloth: 4, plastic: 2 } },
  { id: "bow", out: "bow", count: 1, station: "bench", needs: { wood: 6, cloth: 2 } },
  { id: "ammo9", out: "ammo9", count: 8, station: "bench", needs: { scrap: 1, stone: 1 } },
  { id: "ammo12", out: "ammo12", count: 2, station: "bench", needs: { scrap: 2, plastic: 1 } },
  { id: "ammo20", out: "ammo20", count: 2, station: "bench", needs: { scrap: 2, plastic: 1 } },
  { id: "ammo45", out: "ammo45", count: 6, station: "bench", needs: { scrap: 1, stone: 1 } },
  { id: "ammo556", out: "ammo556", count: 8, station: "bench", needs: { scrap: 2, stone: 1 } },
  { id: "ammo762", out: "ammo762", count: 3, station: "bench", needs: { scrap: 2, stone: 2 } },
  { id: "paint", out: "paint", count: 12, station: "bench", needs: { plastic: 1 } },
  { id: "medkit", out: "medkit", count: 1, station: "bench", needs: { cloth: 2, plastic: 1 } },
];

export type Slot = { id: string; n: number };

export function addItem(inv: Slot[], id: string, n: number, cap = 24): boolean {
  const def = ITEMS[id];
  if (!def) return false;
  let left = n;
  for (const s of inv) {
    if (s.id === id && s.n < def.stack) {
      const take = Math.min(def.stack - s.n, left);
      s.n += take;
      left -= take;
      if (left <= 0) return true;
    }
  }
  while (left > 0 && inv.length < cap) {
    const take = Math.min(def.stack, left);
    inv.push({ id, n: take });
    left -= take;
  }
  return left <= 0;
}

export function countItem(inv: Slot[], id: string): number {
  return inv.reduce((a, s) => a + (s.id === id ? s.n : 0), 0);
}

export function takeItem(inv: Slot[], id: string, n: number): boolean {
  if (countItem(inv, id) < n) return false;
  let left = n;
  for (let i = inv.length - 1; i >= 0 && left > 0; i--) {
    const s = inv[i]!;
    if (s.id !== id) continue;
    const take = Math.min(s.n, left);
    s.n -= take;
    left -= take;
    if (s.n <= 0) inv.splice(i, 1);
  }
  return true;
}

export function canCraft(inv: Slot[], r: Recipe): boolean {
  return Object.entries(r.needs).every(([id, n]) => countItem(inv, id) >= n);
}

export function craft(inv: Slot[], r: Recipe): boolean {
  if (!canCraft(inv, r)) return false;
  for (const [id, n] of Object.entries(r.needs)) takeItem(inv, id, n);
  return addItem(inv, r.out, r.count);
}

export const LOOT: Record<string, { id: string; w: number; n: [number, number] }[]> = {
  house: [
    { id: "food", w: 8, n: [1, 2] },
    { id: "water", w: 7, n: [1, 2] },
    { id: "cloth", w: 6, n: [1, 3] },
    { id: "scrap", w: 4, n: [1, 2] },
    { id: "knife", w: 2, n: [1, 1] },
    { id: "hoodie", w: 2, n: [1, 1] },
    { id: "medkit", w: 1, n: [1, 1] },
    { id: "antibiotics", w: 1, n: [1, 1] },
    { id: "bat", w: 2, n: [1, 1] },
    { id: "ammo9", w: 2, n: [4, 10] },
    { id: "pistol9", w: 1, n: [1, 1] },
    { id: "paintball", w: 1, n: [1, 1] },
    { id: "paint", w: 2, n: [8, 16] },
    { id: "bow", w: 1, n: [1, 1] },
    { id: "arrows", w: 2, n: [3, 8] },
  ],
  clinic: [
    { id: "medkit", w: 8, n: [1, 2] },
    { id: "antibiotics", w: 7, n: [1, 2] },
    { id: "cloth", w: 6, n: [2, 4] },
    { id: "water", w: 5, n: [1, 3] },
    { id: "food", w: 3, n: [1, 2] },
    { id: "plastic", w: 3, n: [1, 2] },
    { id: "hoodie", w: 2, n: [1, 1] },
  ],
  store: [
    { id: "food", w: 10, n: [2, 4] },
    { id: "water", w: 8, n: [2, 4] },
    { id: "plastic", w: 5, n: [1, 3] },
    { id: "cloth", w: 4, n: [1, 3] },
    { id: "scrap", w: 3, n: [1, 2] },
    { id: "bat", w: 2, n: [1, 1] },
    { id: "ammo9", w: 2, n: [6, 12] },
    { id: "paint", w: 2, n: [8, 20] },
    { id: "pistol9", w: 1, n: [1, 1] },
  ],
  kfc: [
    { id: "food", w: 12, n: [2, 5] },
    { id: "water", w: 6, n: [1, 3] },
    { id: "plastic", w: 5, n: [1, 3] },
    { id: "scrap", w: 3, n: [1, 2] },
    { id: "knife", w: 3, n: [1, 1] },
  ],
  lowes: [
    { id: "wood", w: 10, n: [3, 8] },
    { id: "scrap", w: 10, n: [3, 6] },
    { id: "stone", w: 6, n: [2, 5] },
    { id: "plastic", w: 5, n: [1, 4] },
    { id: "hatchet", w: 3, n: [1, 1] },
    { id: "crowbar", w: 3, n: [1, 1] },
    { id: "electronics", w: 3, n: [1, 2] },
    { id: "axe", w: 2, n: [1, 1] },
    { id: "jacket", w: 2, n: [1, 1] },
    { id: "pump12", w: 1, n: [1, 1] },
    { id: "sawn20", w: 1, n: [1, 1] },
    { id: "ammo12", w: 2, n: [2, 6] },
    { id: "ammo20", w: 2, n: [2, 6] },
  ],
  gas: [
    { id: "food", w: 6, n: [1, 2] },
    { id: "water", w: 6, n: [1, 3] },
    { id: "scrap", w: 5, n: [1, 3] },
    { id: "plastic", w: 4, n: [1, 2] },
    { id: "electronics", w: 2, n: [1, 1] },
    { id: "ammo9", w: 2, n: [4, 10] },
    { id: "pistol9", w: 1, n: [1, 1] },
  ],
  college: [
    { id: "cloth", w: 6, n: [1, 3] },
    { id: "food", w: 5, n: [1, 2] },
    { id: "electronics", w: 5, n: [1, 2] },
    { id: "water", w: 4, n: [1, 2] },
    { id: "bat", w: 3, n: [1, 1] },
    { id: "hoodie", w: 3, n: [1, 1] },
    { id: "paintball", w: 3, n: [1, 1] },
    { id: "paint", w: 4, n: [10, 24] },
    { id: "pistol9", w: 1, n: [1, 1] },
    { id: "ammo9", w: 2, n: [6, 14] },
    { id: "ar15", w: 1, n: [1, 1] },
    { id: "ammo556", w: 1, n: [10, 24] },
  ],
  civic: [
    { id: "scrap", w: 5, n: [1, 3] },
    { id: "electronics", w: 4, n: [1, 2] },
    { id: "cloth", w: 3, n: [1, 2] },
    { id: "pistol9", w: 2, n: [1, 1] },
    { id: "pistol45", w: 2, n: [1, 1] },
    { id: "ammo9", w: 3, n: [8, 18] },
    { id: "ammo45", w: 2, n: [6, 12] },
    { id: "ar15", w: 1, n: [1, 1] },
    { id: "ammo556", w: 2, n: [12, 30] },
    { id: "bolt762", w: 1, n: [1, 1] },
    { id: "ammo762", w: 1, n: [4, 10] },
    { id: "riot", w: 1, n: [1, 1] },
  ],
  church: [
    { id: "cloth", w: 6, n: [1, 3] },
    { id: "food", w: 4, n: [1, 2] },
    { id: "water", w: 4, n: [1, 2] },
    { id: "medkit", w: 2, n: [1, 1] },
  ],
};

export function rollLoot(
  table: string,
  rng: () => number,
  rolls = 3,
): { id: string; n: number }[] {
  const pool = LOOT[table] ?? LOOT.house!;
  const total = pool.reduce((a, p) => a + p.w, 0);
  const out: { id: string; n: number }[] = [];
  for (let i = 0; i < rolls; i++) {
    let r = rng() * total;
    let pick = pool[0]!;
    for (const p of pool) {
      r -= p.w;
      if (r <= 0) {
        pick = p;
        break;
      }
    }
    const n = pick.n[0]! + Math.floor(rng() * (pick.n[1]! - pick.n[0]! + 1));
    const existing = out.find((o) => o.id === pick.id);
    if (existing) existing.n += n;
    else out.push({ id: pick.id, n });
  }
  return out;
}
