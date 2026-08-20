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
    blurb: "Campus hall on the ridge. Quiet at first. Dorm wings hide canned food and spare wiring.",
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
    name: "Fairview Church",
    address: "Franklin St, Ferrum",
    zone: "ferrum",
    loot: "Cloth, canned food",
    blurb: "White clapboard off Franklin Street. A short walk from the general store.",
    tags: ["church", "franklin street", "ferrum"],
  },
  {
    id: "ferrum-store",
    name: "Ferrum General",
    address: "Franklin St (VA-40)",
    zone: "ferrum",
    loot: "Food, water, plastic",
    blurb: "Last open counter on VA-40 through town. Stock water before the long walk to Rocky Mount.",
    tags: ["store", "va-40", "franklin street", "shop"],
  },
  {
    id: "fairy-1576",
    name: "Farmhouse",
    address: "1576 Fairy Stone Park Rd",
    zone: "rural",
    loot: "Food, cloth, wood",
    blurb: "West on VA-57 toward Fairy Stone. Claimable. Deep woods, fewer walkers, long walk back.",
    tags: ["fairy stone", "va-57", "farm", "house", "rural"],
  },
  {
    id: "lowes",
    name: "Lowe's Home Improvement",
    address: "800 Old Franklin Tpke, Rocky Mount",
    zone: "town",
    loot: "Scrap, wood, tools, plastic",
    blurb: "Tool run on Old Franklin Turnpike. Crafting metal and a workbench nearby if you clear the lot.",
    tags: ["lowes", "hardware", "tools", "rocky mount", "old franklin"],
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
    name: "Goode Hwy Fuel",
    address: "N Main St, Rocky Mount",
    zone: "town",
    loot: "Plastic, scrap, snacks",
    blurb: "Fuel canopy on North Main. Plastic jugs and scrap from the bays.",
    tags: ["gas", "fuel", "station", "us-220"],
  },
  {
    id: "grocery",
    name: "Franklin Marketplace",
    address: "Franklin St, Rocky Mount",
    zone: "town",
    loot: "Food, water, plastic",
    blurb: "In-town market off Franklin Street. Best bulk food once you reach Rocky Mount.",
    tags: ["grocery", "market", "store", "rocky mount"],
  },
  {
    id: "va40",
    name: "VA-40 / Franklin Street",
    address: "Ferrum → Rocky Mount",
    zone: "ferrum",
    loot: "Road",
    blurb: "The spine of the map. Follow the dashed line east from Ferrum until the courthouse square.",
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
    id: "help-use",
    kind: "help",
    title: "Search / enter — E",
    blurb: "Press E (or Use) on a door, cabinet, bed, chest, or workbench.",
    href: "/guide?q=search",
    tags: ["e", "use", "door", "loot", "enter"],
  },
  {
    id: "help-attack",
    kind: "help",
    title: "Attack — Space",
    blurb: "Space swings or fires. Guns need bullets or shells. Walkers are slow; the fever is not.",
    href: "/guide?q=attack",
    tags: ["space", "combat", "gun", "melee"],
  },
  {
    id: "help-pack",
    kind: "help",
    title: "Pack — I",
    blurb: "Open the pack to eat, drink, wear armor, and craft. A workbench unlocks metal recipes.",
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
