import type { Assets } from "./assets";
import { MAP_H, MAP_W, T, TILE, VIEW_TILES_X } from "./constants";
import { ITEMS } from "./items";
import type { GameState } from "./sim";
import type { Building } from "./world";

const TILE_IMG: Record<number, string> = {
  [T.GRASS]: "grass",
  [T.TALL]: "grass",
  [T.FOREST]: "forest",
  [T.DIRT]: "dirt",
  [T.ASPHALT]: "asphalt",
  [T.LINE]: "asphalt",
  [T.PARKING]: "asphalt",
  [T.WALK]: "dirt",
  [T.WATER]: "water",
  [T.CROP]: "grass",
  [T.WOOD]: "wood",
  [T.WALL]: "wall",
};

export type Cam = { x: number; y: number; scale: number };

export function cameraFor(s: GameState, vw: number, vh: number): Cam {
  const scale = vw / (VIEW_TILES_X * TILE);
  const mapW = s.interior ? s.interior.w * TILE : MAP_W * TILE;
  const mapH = s.interior ? s.interior.h * TILE : MAP_H * TILE;
  let x = s.player.x - vw / 2 / scale;
  let y = s.player.y - vh / 2 / scale;
  x += (Math.random() - 0.5) * s.shake * 10;
  y += (Math.random() - 0.5) * s.shake * 10;
  const maxX = Math.max(0, mapW - vw / scale);
  const maxY = Math.max(0, mapH - vh / scale);
  return {
    x: clamp(x, 0, maxX),
    y: clamp(y, 0, maxY),
    scale,
  };
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  assets: Assets,
  cam: Cam,
  vw: number,
  vh: number,
) {
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#0b0c0a";
  ctx.fillRect(0, 0, vw, vh);
  ctx.save();
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.x, -cam.y);

  drawTiles(ctx, s, assets, cam, vw, vh);
  const sprites: { y: number; draw: () => void }[] = [];

  if (!s.interior) {
    for (const t of s.world.trees) {
      if (t.chopped) continue;
      if (!inView(t.x, t.y, cam, vw, vh, 80)) continue;
      sprites.push({
        y: t.y,
        draw: () => {
          const img = assets.props[t.kind === "pine" ? "pine" : "oak"];
          if (!img) return;
          const h = t.kind === "pine" ? 56 : 48;
          const w = (img.width / img.height) * h;
          ctx.drawImage(img, t.x - w / 2, t.y - h + 8, w, h);
        },
      });
    }
    for (const p of s.world.props) {
      if (!inView(p.x, p.y, cam, vw, vh, 60)) continue;
      sprites.push({
        y: p.y,
        draw: () => {
          const img = assets.props[p.kind];
          if (!img) return;
          ctx.drawImage(img, p.x - 16, p.y - 28, 32, 32);
        },
      });
    }
    for (const b of s.world.buildings) {
      if (!inView(b.x + b.w / 2, b.y + b.h / 2, cam, vw, vh, 200)) continue;
      sprites.push({
        y: b.y + b.h,
        draw: () => drawBuilding(ctx, assets, b),
      });
    }
    for (const z of s.world.zombies) {
      if (!z.alive) continue;
      if (!inView(z.x, z.y, cam, vw, vh, 40)) continue;
      sprites.push({
        y: z.y,
        draw: () => drawActor(ctx, assets.zombie, z.x, z.y, z.facing, s.time * 4, true, z.hitT > 0),
      });
    }
  } else {
    for (const f of s.interior.furniture) {
      sprites.push({
        y: f.y,
        draw: () => drawFurn(ctx, f),
      });
    }
  }

  sprites.push({
    y: s.player.y,
    draw: () => {
      const attacking = s.player.attackT > (ITEMS[s.player.weapon]?.rate ?? 0.4) * 0.45;
      const sheet = attacking ? assets.attack : assets.player;
      const face = attacking ? 0 : s.player.facing;
      const frame = attacking ? Math.min(3, Math.floor((1 - s.player.attackT / (ITEMS[s.player.weapon]?.rate ?? 0.4)) * 4)) : Math.floor(s.time * 8);
      drawActor(ctx, sheet, s.player.x, s.player.y, face, frame, !attacking, s.player.invuln > 0 && Math.floor(s.time * 20) % 2 === 0, attacking);
    },
  });

  sprites.sort((a, b) => a.y - b.y);
  for (const sp of sprites) sp.draw();

  for (const b of s.bullets) {
    if (!b.alive) continue;
    ctx.fillStyle = "#e6e1d0";
    ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
  }
  for (const p of s.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.s, p.s);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // dusk wash
  ctx.fillStyle = "rgba(12, 10, 8, 0.22)";
  ctx.fillRect(0, 0, vw, vh);
  const g = ctx.createRadialGradient(vw / 2, vh / 2, vw * 0.2, vw / 2, vh / 2, vw * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);
}

function drawTiles(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  assets: Assets,
  cam: Cam,
  vw: number,
  vh: number,
) {
  const tiles = s.interior ? s.interior.tiles : s.world.tiles;
  const tw = s.interior ? s.interior.w : MAP_W;
  const th = s.interior ? s.interior.h : MAP_H;
  const x0 = Math.max(0, Math.floor(cam.x / TILE) - 1);
  const y0 = Math.max(0, Math.floor(cam.y / TILE) - 1);
  const x1 = Math.min(tw, Math.ceil((cam.x + vw / cam.scale) / TILE) + 1);
  const y1 = Math.min(th, Math.ceil((cam.y + vh / cam.scale) / TILE) + 1);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const t = tiles[y * tw + x] ?? T.GRASS;
      const key = TILE_IMG[t] ?? "grass";
      const img = assets.tiles[key];
      if (img) ctx.drawImage(img, x * TILE, y * TILE, TILE + 0.5, TILE + 0.5);
      if (t === T.LINE) {
        ctx.fillStyle = "rgba(196, 176, 80, 0.35)";
        ctx.fillRect(x * TILE + 14, y * TILE + 10, 4, 12);
      }
      if (t === T.TALL) {
        ctx.fillStyle = "rgba(40, 55, 28, 0.18)";
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
      if (t === T.CROP) {
        ctx.fillStyle = "rgba(140, 120, 50, 0.16)";
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
      if (t === T.PARKING) {
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
  }
}

function drawBuilding(ctx: CanvasRenderingContext2D, assets: Assets, b: Building) {
  const img = assets.buildings[b.kind] ?? assets.buildings.house;
  if (!img) return;
  ctx.drawImage(img, b.x, b.y, b.w, b.h);
  if (b.claimed) {
    ctx.fillStyle = "#c9c3b0";
    ctx.fillRect(b.doorX - 3, b.y - 8, 6, 6);
  }
}

function drawActor(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  x: number,
  y: number,
  facing: number,
  frame: number,
  walkSheet: boolean,
  flash: boolean,
  attackSheet = false,
) {
  const cols = attackSheet ? 2 : 4;
  const rows = attackSheet ? 2 : 4;
  const cw = sheet.width / cols;
  const ch = sheet.height / rows;
  const f = ((frame % 4) + 4) % 4;
  const col = attackSheet ? f % 2 : f;
  const row = attackSheet ? Math.floor(f / 2) : facing;
  const dw = 28;
  const dh = 28;
  ctx.save();
  if (flash) ctx.filter = "brightness(2.4)";
  ctx.drawImage(sheet, col * cw, row * ch, cw, ch, x - dw / 2, y - dh + 4, dw, dh);
  ctx.restore();
  void walkSheet;
}

function drawFurn(ctx: CanvasRenderingContext2D, f: { kind: string; x: number; y: number; searched?: boolean }) {
  const colors: Record<string, string> = {
    loot: "#6b5344",
    bed: "#3d4a5c",
    chest: "#8a6a3b",
    bench: "#5a4634",
    door: "#2a2d24",
    claim: "#6a8a4e",
  };
  ctx.fillStyle = colors[f.kind] ?? "#444";
  if (f.kind === "bed") ctx.fillRect(f.x - 14, f.y - 10, 28, 18);
  else if (f.kind === "bench") ctx.fillRect(f.x - 12, f.y - 8, 24, 14);
  else if (f.kind === "door") ctx.fillRect(f.x - 16, f.y - 4, 32, 10);
  else ctx.fillRect(f.x - 8, f.y - 8, 16, 16);
  if (f.searched) {
    ctx.strokeStyle = "rgba(230,225,208,0.35)";
    ctx.strokeRect(f.x - 8, f.y - 8, 16, 16);
  }
}

function inView(x: number, y: number, cam: Cam, vw: number, vh: number, pad: number) {
  return (
    x > cam.x - pad &&
    y > cam.y - pad &&
    x < cam.x + vw / cam.scale + pad &&
    y < cam.y + vh / cam.scale + pad
  );
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function drawMinimap(ctx: CanvasRenderingContext2D, s: GameState, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "rgba(12, 14, 10, 0.78)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(201,195,176,0.25)";
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  if (s.interior) {
    ctx.fillStyle = "#c9c3b0";
    ctx.fillRect(x + w / 2 - 2, y + h / 2 - 2, 4, 4);
    return;
  }
  const sx = w / (MAP_W * TILE);
  const sy = h / (MAP_H * TILE);
  ctx.fillStyle = "#7a3a32";
  ctx.fillRect(x + 1775, y, 0, 0);
  // Rocky Mount blob
  ctx.fillStyle = "rgba(80,70,60,0.8)";
  const rm = { x: 326 * TILE, y: 60 * TILE };
  ctx.fillRect(x + rm.x * sx - 10, y + rm.y * sy - 8, 22, 18);
  ctx.fillStyle = "rgba(50,70,40,0.7)";
  const fe = { x: 146 * TILE, y: 178 * TILE };
  ctx.fillRect(x + fe.x * sx - 6, y + fe.y * sy - 5, 12, 10);
  ctx.fillStyle = "#c9c3b0";
  ctx.fillRect(x + s.player.x * sx - 2, y + s.player.y * sy - 2, 4, 4);
}
