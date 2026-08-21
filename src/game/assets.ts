import { publicUrl } from "@/lib/public-url";

export type Assets = {
  player: HTMLImageElement;
  zombie: HTMLImageElement;
  attack: HTMLImageElement;
  brute: HTMLImageElement;
  doe: HTMLImageElement;
  buck: HTMLImageElement;
  fawn: HTMLImageElement;
  bear: HTMLImageElement;
  cub: HTMLImageElement;
  turkey: HTMLImageElement;
  squirrel: HTMLImageElement;
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
  const actors = ["player", "zombie", "player-attack", "brute", "doe", "buck", "fawn", "bear", "cub", "turkey", "squirrel"];
  const [loadedActors, loadedTiles, loadedBld, loadedProps] = await Promise.all([
    Promise.all(actors.map((n) => load(publicUrl(`/game/sprites/${n === "player-attack" ? "player-attack" : n}.png`)))),
    Promise.all(tileNames.map((n) => load(publicUrl(`/game/tiles/${n}.png`)))),
    Promise.all(bld.map((n) => load(publicUrl(`/game/buildings/${n}.png`)))),
    Promise.all(props.map((n) => load(publicUrl(`/game/props/${n}.png`)))),
  ]);
  const tiles: Record<string, HTMLImageElement> = {};
  tileNames.forEach((n, i) => {
    tiles[n] = loadedTiles[i]!;
  });
  const buildings: Record<string, HTMLImageElement> = {};
  bld.forEach((n, i) => {
    buildings[n] = loadedBld[i]!;
  });
  const propImgs: Record<string, HTMLImageElement> = {};
  props.forEach((n, i) => {
    propImgs[n] = loadedProps[i]!;
  });
  return {
    player: loadedActors[0]!,
    zombie: loadedActors[1]!,
    attack: loadedActors[2]!,
    brute: loadedActors[3]!,
    doe: loadedActors[4]!,
    buck: loadedActors[5]!,
    fawn: loadedActors[6]!,
    bear: loadedActors[7]!,
    cub: loadedActors[8]!,
    turkey: loadedActors[9]!,
    squirrel: loadedActors[10]!,
    tiles,
    buildings,
    props: propImgs,
  };
}
