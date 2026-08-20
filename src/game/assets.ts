import { publicUrl } from "@/lib/public-url";

export type Assets = {
  player: HTMLImageElement;
  zombie: HTMLImageElement;
  attack: HTMLImageElement;
  tiles: Record<string, HTMLImageElement>;
  buildings: Record<string, HTMLImageElement>;
  props: Record<string, HTMLImageElement>;
};


function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export async function loadAssets(): Promise<Assets> {
  const tileNames = ["grass", "forest", "asphalt", "dirt", "wood", "water", "wall"];
  const bld = ["house", "ranch", "clinic", "kfc", "lowes", "courthouse", "college", "church", "gas"];
  const props = [
    "pine",
    "oak",
    "truck",
    "crate",
    "barrel",
    "mailbox",
    "bush",
    "dumpster",
    "tires",
    "fence",
    "hydrant",
    "picnic",
  ];
  const [player, zombie, attack, ...rest] = await Promise.all([
    load(publicUrl("/game/sprites/player.png")),
    load(publicUrl("/game/sprites/zombie.png")),
    load(publicUrl("/game/sprites/player-attack.png")),
    ...tileNames.map((n) => load(publicUrl(`/game/tiles/${n}.png`))),
    ...bld.map((n) => load(publicUrl(`/game/buildings/${n}.png`))),
    ...props.map((n) => load(publicUrl(`/game/props/${n}.png`))),
  ]);
  const tiles: Record<string, HTMLImageElement> = {};
  tileNames.forEach((n, i) => {
    tiles[n] = rest[i]!;
  });
  const buildings: Record<string, HTMLImageElement> = {};
  bld.forEach((n, i) => {
    buildings[n] = rest[tileNames.length + i]!;
  });
  const propImgs: Record<string, HTMLImageElement> = {};
  props.forEach((n, i) => {
    propImgs[n] = rest[tileNames.length + bld.length + i]!;
  });
  return { player, zombie, attack, tiles, buildings, props: propImgs };
}
