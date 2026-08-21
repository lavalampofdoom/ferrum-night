import { ITEMS, RECIPES } from "./items";

export type Place = {
  id: string;
  name: string;
  address: string;
  zone: "rural" | "ferrum" | "town";
  loot: string;
  blurb: string;
  tags: string[];
};

export const PLACES: Place[] = [
  {
    id: "clinic",
    name: "Tri-Area Community Health",
    address: "180 Ferrum Mountain Rd, Ferrum VA",
    zone: "ferrum",
    loot: "Medkits, antibiotics, cloth",
    blurb:
      "Spawn and first claim. Search cabinets for antibiotics before the fever sets in, then walk VA-40 east.",
    tags: ["spawn", "ferrum", "clinic", "hospital", "medicine", "tri-area", "ferrum mountain"],
  },
  {
    id: "college",
    name: "Ferrum College — Main Hall",
    address: "445 Ferrum Mountain Rd",
    zone: "ferrum",
    loot: "Food, electronics, cloth",
    blurb: "Campus hall on the ridge. Huge interior — classrooms, a lab, and dorm wings. Quiet at first.",
    tags: ["ferrum college", "campus", "school", "panthers"],
  },
  {
    id: "college2",
    name: "Vaughn Chapel",
    address: "Ferrum College",
    zone: "ferrum",
    loot: "Cloth, food",
    blurb: "Stone chapel on the Ferrum College green. Good cloth, bad sightlines after dark.",
    tags: ["chapel", "ferrum college", "church"],
  },
  {
    id: "church-ferrum",
    name: "Saint James Methodist Church",
    address: "Franklin St, Ferrum",
    zone: "ferrum",
    loot: "Cloth, canned food",
    blurb: "White clapboard on the Ferrum strip, a short walk from the Minute Market.",
    tags: ["church", "franklin street", "ferrum", "saint james"],
  },
  {
    id: "ferrum-store",
    name: "Ferrum Minute Market",
    address: "9711 Franklin St, Ferrum",
    zone: "ferrum",
    loot: "Food, water, plastic",
    blurb: "The real counter on VA-40 through Ferrum. Stock water before the walk to Rocky Mount.",
    tags: ["store", "va-40", "franklin street", "shop", "minute market"],
  },
  {
    id: "fairy-1576",
    name: "Farmhouse",
    address: "1576 Fairy Stone Park Rd",
    zone: "rural",
    loot: "Food, cloth, wood",
    blurb: "West on VA-57 toward Fairy Stone. Claimable. Farm crates sometimes hide a hatchet.",
    tags: ["fairy stone", "va-57", "farm", "house", "rural"],
  },
  {
    id: "lowes",
    name: "Lowe's Home Improvement",
    address: "800 Old Franklin Tpke, Rocky Mount",
    zone: "town",
    loot: "Scrap, wood, tools, plastic",
    blurb: "Tool run on Old Franklin Turnpike. Scrap, axes, crowbars. Craft a table if you need a bench.",
    tags: ["lowes", "hardware", "tools", "rocky mount", "old franklin"],
  },
  {
    id: "walmart",
    name: "Walmart Supercenter",
    address: "550 Old Franklin Tpke, Rocky Mount",
    zone: "town",
    loot: "Food, scrap, plastic, cloth",
    blurb: "Next door to Lowe's on Old Franklin. Loud lot, dense walkers, bulk canned food.",
    tags: ["walmart", "grocery", "rocky mount", "old franklin"],
  },
  {
    id: "courthouse",
    name: "Franklin County Courthouse",
    address: "Main St, Rocky Mount VA",
    zone: "town",
    loot: "Electronics, scrap",
    blurb: "Brick civic pile on Main. Crowded streets. Search offices, then get off the square.",
    tags: ["courthouse", "downtown", "rocky mount", "franklin county", "main street"],
  },
  {
    id: "kfc",
    name: "KFC",
    address: "1775 N Main St, Rocky Mount",
    zone: "town",
    loot: "Food",
    blurb: "North Main under the bucket. Fast calories, loud parking lot, walkers on US-220.",
    tags: ["kfc", "chicken", "us-220", "north main", "food"],
  },
  {
    id: "gas-rm",
    name: "Shell",
    address: "N Main St, Rocky Mount",
    zone: "town",
    loot: "Plastic, scrap, snacks",
    blurb: "Fuel canopy on North Main near KFC. Plastic jugs and scrap from the bays.",
    tags: ["gas", "fuel", "station", "us-220", "shell"],
  },
  {
    id: "grocery",
    name: "Food Lion",
    address: "Tanyard Rd, Rocky Mount",
    zone: "town",
    loot: "Food, water, plastic",
    blurb: "Tanyard Road grocery. Best bulk food once you reach Rocky Mount.",
    tags: ["grocery", "market", "store", "rocky mount", "food lion", "tanyard"],
  },
  {
    id: "va40",
    name: "VA-40 / Franklin Street",
    address: "Ferrum → Rocky Mount",
    zone: "ferrum",
    loot: "Road",
    blurb: "The spine of the map. Follow VA-40 / Franklin Street east from Ferrum until the courthouse square.",
    tags: ["va-40", "franklin street", "old franklin turnpike", "highway", "road"],
  },
  {
    id: "fairy-stone-rd",
    name: "Fairy Stone Park Road",
    address: "VA-57 west of Ferrum",
    zone: "rural",
    loot: "Wood, rural houses",
    blurb: "West into pine and Maggodee Creek. Quiet farms, long distances, easy to get lost after dark.",
    tags: ["fairy stone", "va-57", "park", "forest"],
  },
  {
    id: "us220",
    name: "US-220 / N Main Street",
    address: "Rocky Mount",
    zone: "town",
    loot: "Town traffic",
    blurb: "North–south through Rocky Mount. KFC and the fuel canopy sit on this strip.",
    tags: ["us-220", "main street", "rocky mount"],
  },
];

export type SearchHit = {
  id: string;
  kind: "place" | "item" | "craft" | "help" | "page";
  title: string;
  blurb: string;
  href: string;
  tags: string[];
};

const HELP: SearchHit[] = [
  {
    id: "help-move",
    kind: "help",
    title: "Move — WASD",
    blurb: "Walk with WASD. Hold Shift to sprint. On a phone, drag the left pad.",
    href: "/guide?q=move",
    tags: ["wasd", "controls", "keyboard", "sprint", "touch"],
  },
  {
    id: "help-ground",
    kind: "help",
    title: "Ground — roads, woods, water",
    blurb: "Asphalt is fast. Grass is normal. Woods, tall grass, and crops slow you. Water and walls stop you. Tree trunks are solid — weave through the pines.",
    href: "/guide?q=ground",
    tags: ["forest", "road", "water", "collision", "terrain", "woods", "asphalt"],
  },
  {
    id: "help-use",
    kind: "help",
    title: "Search / enter — E",
    blurb: "Press E (or the hand) on a door, cabinet, bed, crate, lock, car, or workbench.",
    href: "/guide?q=search",
    tags: ["e", "use", "door", "loot", "enter"],
  },
  {
    id: "help-attack",
    kind: "help",
    title: "Attack — Space",
    blurb: "Space swings or fires. A bat drops a walker in 2–4 hits. Guns need matching ammo. Paintball stuns; jam it into them at contact to hurt.",
    href: "/guide?q=attack",
    tags: ["space", "combat", "gun", "melee", "bat", "paintball"],
  },
  {
    id: "help-guns",
    kind: "help",
    title: "Guns and ammo",
    blurb: "9mm, 1911 .45, 12ga pump, 20ga sawed-off, AR-15 5.56, 7.62 bolt rifle, modern bow. Guns are rare in furniture. Craft ammo and the bow at a bench.",
    href: "/guide?q=gun",
    tags: ["pistol", "shotgun", "ar-15", "rifle", "bow", "9mm", "1911", "5.56", "7.62", "ammo"],
  },
  {
    id: "help-brute",
    kind: "help",
    title: "Big walkers",
    blurb: "Rare brutes hit twice as hard as a normal bite — two hits will put you down. They lumber. Keep range.",
    href: "/guide?q=brute",
    tags: ["brute", "big", "tank", "rare", "zombie"],
  },
  {
    id: "help-wildlife",
    kind: "help",
    title: "Wildlife",
    blurb: "Does walk with fawns. Bucks go alone. Turkeys travel in packs. Squirrels dash through the pines. Hunt for fresh meat.",
    href: "/guide?q=deer",
    tags: ["deer", "doe", "fawn", "buck", "turkey", "squirrel", "animal", "hunt"],
  },
  {
    id: "help-bear",
    kind: "help",
    title: "Bears",
    blurb: "A sow and two cubs roam the western woods. Contact kills you, walkers, and deer. Shoot from far off or leave.",
    href: "/guide?q=bear",
    tags: ["bear", "cub", "instakill", "fairy stone"],
  },
  {
    id: "help-interior",
    kind: "help",
    title: "Interiors",
    blurb: "Houses are two small rooms with beds, shelves, and crates. Ferrum College halls open into classrooms and dorms. Lowe's is aisles.",
    href: "/guide?q=interior",
    tags: ["interior", "rooms", "college", "house", "inside"],
  },
  {
    id: "help-pack",
    kind: "help",
    title: "Pack — I",
    blurb: "Open the pack to eat, drink, wear armor, and craft. Hand recipes are simple. A placed workbench unlocks metal, ammo, and meds.",
    href: "/guide?q=pack",
    tags: ["inventory", "i", "craft", "bench"],
  },
  {
    id: "help-infect",
    kind: "help",
    title: "Infection",
    blurb: "Bites start a three-minute fever. Antibiotics from the clinic (or crafted medkits plus luck) clear it.",
    href: "/guide?q=infection",
    tags: ["fever", "bite", "antibiotics", "turn", "zombie"],
  },
  {
    id: "help-claim",
    kind: "help",
    title: "Claim a house",
    blurb: "Some houses and the clinic can be claimed. Sleep in a bed to wait out the night.",
    href: "/guide?q=claim",
    tags: ["house", "bed", "safe", "base"],
  },
  {
    id: "help-lock",
    kind: "help",
    title: "Locks",
    blurb: "Some houses start locked. Bash the door. Inside, use the lock by the door if it is still standing. Walkers cannot enter a locked house. An unlocked door is slow to breach; a broken door is fast.",
    href: "/guide?q=lock",
    tags: ["lock", "door", "bash", "break", "house"],
  },
  {
    id: "help-car",
    kind: "help",
    title: "Cars",
    blurb: "E to enter. W/S drive, A/D steer. About two minutes of gas. Ram walkers. You cannot be bitten in a car. Pour a gas can from the pack to refill.",
    href: "/guide?q=car",
    tags: ["car", "drive", "gas", "ram", "vehicle"],
  },
  {
    id: "help-bench",
    kind: "help",
    title: "Crafting table",
    blurb: "The clinic on Ferrum Mountain Road has the only standing bench. Craft more from wood and scrap, then place one inside a building from the pack.",
    href: "/guide?q=bench",
    tags: ["workbench", "crafting table", "place", "clinic"],
  },
];

const PAGES: SearchHit[] = [
  {
    id: "page-play",
    kind: "page",
    title: "Play Ferrum Night",
    blurb: "Free in the browser. No download. Start at 180 Ferrum Mountain Road.",
    href: "/play",
    tags: ["play", "game", "start", "browser"],
  },
  {
    id: "page-guide",
    kind: "page",
    title: "Field guide",
    blurb: "Places, loot, crafting, and controls for Franklin County.",
    href: "/guide",
    tags: ["guide", "wiki", "map", "help"],
  },
];

function itemBlurb(id: string): string {
  const it = ITEMS[id];
  if (!it) return "";
  if (it.kind === "place") return "Place inside a building. Unlocks bench recipes.";
  if (it.gas) return `Adds ${it.gas} seconds of gas to a nearby car.`;
  if (it.kind === "consumable" && it.cure) return "Clears infection. Find it at the clinic first.";
  if (it.heal) return `Restores ${it.heal} health.`;
  if (it.kind === "weapon" || it.kind === "ranged" || it.kind === "tool") {
    return `Damage ${it.dmg ?? 0}${it.ammo ? ` · uses ${ITEMS[it.ammo]?.name ?? it.ammo}` : ""}.`;
  }
  if (it.kind === "armor") return `Soaks hits and slows the fever.`;
  if (it.kind === "ammo") return "Reload a ranged weapon.";
  return "Crafting material.";
}

export const CATALOG: SearchHit[] = [
  ...PAGES,
  ...PLACES.map((p) => ({
    id: p.id,
    kind: "place" as const,
    title: p.name,
    blurb: `${p.address} · ${p.blurb}`,
    href: `/guide?q=${encodeURIComponent(p.name)}`,
    tags: p.tags,
  })),
  ...Object.values(ITEMS).map((it) => ({
    id: `item-${it.id}`,
    kind: "item" as const,
    title: it.name,
    blurb: itemBlurb(it.id),
    href: `/guide?q=${encodeURIComponent(it.name)}`,
    tags: [it.kind, it.id],
  })),
  ...RECIPES.map((r) => {
    const need = Object.entries(r.needs)
      .map(([id, n]) => `${n} ${ITEMS[id]?.name ?? id}`)
      .join(", ");
    return {
      id: `craft-${r.id}`,
      kind: "craft" as const,
      title: `Craft ${ITEMS[r.out]?.name ?? r.out}`,
      blurb: `${r.station === "bench" ? "Workbench" : "By hand"} · ${need}`,
      href: `/guide?q=${encodeURIComponent(ITEMS[r.out]?.name ?? r.out)}`,
      tags: ["craft", r.station, r.out],
    };
  }),
  ...HELP,
];

export function searchCatalog(raw: string): SearchHit[] {
  const q = raw.trim().toLowerCase();
  if (!q) return CATALOG.filter((h) => h.kind === "page" || h.kind === "place").slice(0, 12);
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = CATALOG.map((h) => {
    const hay = `${h.title} ${h.blurb} ${h.tags.join(" ")}`.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (h.title.toLowerCase().includes(t)) score += 8;
      else if (hay.includes(t)) score += 3;
      else return { h, score: 0 };
    }
    if (h.title.toLowerCase().startsWith(q)) score += 6;
    return { h, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 16).map((x) => x.h);
}

export const ZONE_LABEL: Record<Place["zone"], string> = {
  rural: "Fairy Stone / rural",
  ferrum: "Ferrum",
  town: "Rocky Mount",
};
