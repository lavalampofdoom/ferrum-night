import type { Assets } from "./assets";
import { MAP_H, MAP_W, T, TILE, VIEW_TILES_X, VISION, VISION_IN, geoToWorld } from "./constants";
import { ITEMS } from "./items";
import type { GameState } from "./sim";
import type { Building, Car, Critter } from "./world";
import { hasLos } from "./world";
import { ROADS } from "./geo-data";

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

  const vis = visFor(s, cam, vw, vh);
  drawTiles(ctx, s, assets, cam, vw, vh, vis);
  const canSee = (x: number, y: number) => vis.see(x, y);
  const sprites: { y: number; draw: () => void }[] = [];

  if (!s.interior) {
    for (const t of s.world.trees) {
      if (t.chopped) continue;
      if (!inView(t.x, t.y, cam, vw, vh, 80)) continue;
      if (!canSee(t.x, t.y)) continue;
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
      if (!canSee(p.x, p.y)) continue;
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
    for (const car of s.world.cars) {
      if (!inView(car.x, car.y, cam, vw, vh, 50)) continue;
      if (!canSee(car.x, car.y) && s.carId !== car.id) continue;
      sprites.push({
        y: car.y + 8,
        draw: () => drawCar(ctx, car, s.carId === car.id),
      });
    }
    for (const z of s.world.zombies) {
      if (!z.alive || z.inside) continue;
      if (!inView(z.x, z.y, cam, vw, vh, 50)) continue;
      if (!canSee(z.x, z.y)) continue;
      sprites.push({
        y: z.y,
        draw: () => {
          const moving = Math.hypot(z.vx, z.vy) > 8;
          const frame = moving ? z.walk : 0;
          const sheet = z.brute ? assets.brute : assets.zombie;
          const size = z.brute ? 42 : 28;
          drawActor(ctx, sheet, z.x, z.y, z.facing, frame, z.hitT > 0, false, size);
          if (z.paintT > 0) {
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = "#e85ad0";
            ctx.beginPath();
            ctx.arc(z.x, z.y - 8, z.brute ? 12 : 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        },
      });
    }
    for (const c of s.world.critters) {
      if (!c.alive) continue;
      if (!inView(c.x, c.y, cam, vw, vh, 60)) continue;
      if (!canSee(c.x, c.y)) continue;
      sprites.push({
        y: c.y,
        draw: () => drawCritter(ctx, assets, c),
      });
    }
  } else {
    for (const f of s.interior.furniture) {
      if (!canSee(f.x, f.y) && f.kind !== "door") continue;
      sprites.push({
        y: f.y,
        draw: () => drawFurn(ctx, { ...f, searched: s.searched.has(f.id) }),
      });
    }
    const bid = s.interior.buildingId;
    for (const z of s.world.zombies) {
      if (!z.alive || z.inside !== bid) continue;
      if (!canSee(z.x, z.y)) continue;
      sprites.push({
        y: z.y,
        draw: () => {
          const moving = Math.hypot(z.vx, z.vy) > 8;
          drawActor(ctx, z.brute ? assets.brute : assets.zombie, z.x, z.y, z.facing, moving ? z.walk : 0, z.hitT > 0, false, z.brute ? 42 : 28);
        },
      });
    }
  }

  const insideId = s.interior?.buildingId ?? null;
  for (const d of s.drops) {
    if ((d.inside ?? null) !== insideId) continue;
    if (!inView(d.x, d.y, cam, vw, vh, 30)) continue;
    if (!canSee(d.x, d.y)) continue;
    sprites.push({
      y: d.y,
      draw: () => {
        ctx.fillStyle = "#6b5344";
        ctx.fillRect(d.x - 6, d.y - 8, 12, 10);
        ctx.fillStyle = "#c9a227";
        ctx.fillRect(d.x - 2, d.y - 5, 4, 4);
      },
    });
  }

  if (s.carId == null) {
    sprites.push({
      y: s.player.y,
      draw: () => {
        const attacking = s.player.attackT > (ITEMS[s.player.weapon]?.rate ?? 0.4) * 0.45;
        const sheet = attacking ? assets.attack : assets.player;
        const face = attacking ? 0 : s.player.facing;
        const frame = attacking
          ? Math.min(3, Math.floor((1 - s.player.attackT / (ITEMS[s.player.weapon]?.rate ?? 0.4)) * 4))
          : s.player.moving
            ? s.player.walk
            : 0;
        drawActor(
          ctx,
          sheet,
          s.player.x,
          s.player.y,
          face,
          frame,
          s.player.invuln > 0 && Math.floor(s.time * 20) % 2 === 0,
          attacking,
          32,
          46,
        );
      },
    });
  }

  sprites.sort((a, b) => a.y - b.y);
  for (const sp of sprites) sp.draw();

  for (const b of s.bullets) {
    if (!b.alive) continue;
    if (!canSee(b.x, b.y)) continue;
    ctx.fillStyle = b.tint || "#e6e1d0";
    if (b.paint) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(b.x - 2, b.y - 2, 4, 4);
    }
  }
  for (const p of s.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.s, p.s);
    ctx.globalAlpha = 1;
  }

  ctx.restore();

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
  vis: { see: (x: number, y: number) => boolean },
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
      if (!s.interior && (t === T.ASPHALT || t === T.LINE)) {
        ctx.fillStyle = "rgba(14, 12, 10, 0.42)";
        ctx.fillRect(x * TILE, y * TILE, TILE + 0.5, TILE + 0.5);
      }
      if (t === T.LINE) {
        ctx.fillStyle = "#ead56a";
        ctx.fillRect(x * TILE + 12, y * TILE + 6, 7, 18);
      }
      if (!s.interior && t === T.DIRT) {
        const n =
          (x > 0 && isRoad(tiles[(y * tw + (x - 1))!] ?? -1)) ||
          (x + 1 < tw && isRoad(tiles[y * tw + (x + 1)] ?? -1)) ||
          (y > 0 && isRoad(tiles[(y - 1) * tw + x] ?? -1)) ||
          (y + 1 < th && isRoad(tiles[(y + 1) * tw + x] ?? -1));
        if (n) {
          ctx.fillStyle = "rgba(28, 22, 12, 0.38)";
          ctx.fillRect(x * TILE, y * TILE, TILE + 0.5, TILE + 0.5);
        }
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
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
      if (!vis.see(x * TILE + 16, y * TILE + 16)) {
        ctx.fillStyle = "rgba(6, 7, 5, 0.72)";
        ctx.fillRect(x * TILE, y * TILE, TILE + 0.5, TILE + 0.5);
      }
    }
  }
}

function isRoad(t: number) {
  return t === T.ASPHALT || t === T.LINE;
}

function drawBuilding(ctx: CanvasRenderingContext2D, assets: Assets, b: Building) {
  const img = assets.buildings[b.kind] ?? assets.buildings.house;
  if (!img) return;
  ctx.drawImage(img, b.x, b.y, b.w, b.h);
  if (b.claimed) {
    ctx.fillStyle = "#c9c3b0";
    ctx.fillRect(b.doorX - 3, b.y - 8, 6, 6);
  }
  const dx = b.doorX;
  const dy = b.y + b.h - 6;
  if (b.doorBroken) {
    ctx.fillStyle = "#1a1612";
    ctx.fillRect(dx - 7, dy - 16, 14, 18);
    ctx.fillStyle = "#6b5344";
    ctx.fillRect(dx - 8, dy - 16, 3, 10);
    ctx.fillRect(dx + 5, dy - 12, 3, 12);
    ctx.fillStyle = "#3d3228";
    ctx.fillRect(dx - 4, dy - 4, 8, 3);
  } else if (b.locked) {
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(dx - 4, dy - 10, 8, 7);
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(dx, dy - 10, 3, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = "#2a2418";
    ctx.fillRect(dx - 1, dy - 8, 2, 3);
  }
}

function drawActor(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  x: number,
  y: number,
  facing: number,
  frame: number,
  flash: boolean,
  attackSheet = false,
  size = 28,
  height = size,
) {
  const cols = attackSheet ? 2 : 4;
  const rows = attackSheet ? 2 : 4;
  const cw = sheet.width / cols;
  const ch = sheet.height / rows;
  const f = ((Math.floor(frame) % 4) + 4) % 4;
  const col = attackSheet ? f % 2 : f;
  const row = attackSheet ? Math.floor(f / 2) : facing;
  ctx.save();
  if (flash) ctx.filter = "brightness(2.4)";
  ctx.drawImage(sheet, col * cw, row * ch, cw, ch, x - size / 2, y - height + 6, size, height);
  ctx.restore();
}

function drawCritter(ctx: CanvasRenderingContext2D, assets: Assets, c: Critter) {
  const sheet =
    c.kind === "doe"
      ? assets.doe
      : c.kind === "buck"
        ? assets.buck
        : c.kind === "fawn"
          ? assets.fawn
          : c.kind === "bear"
            ? assets.bear
            : c.kind === "cub"
              ? assets.cub
              : c.kind === "turkey"
                ? assets.turkey
                : assets.squirrel;
  const size =
    c.kind === "bear"
      ? 52
      : c.kind === "cub"
        ? 32
        : c.kind === "buck"
          ? 36
          : c.kind === "doe"
            ? 34
            : c.kind === "fawn"
              ? 24
              : c.kind === "turkey"
                ? 22
                : 14;
  const moving = Math.hypot(c.vx, c.vy) > 6;
  drawActor(ctx, sheet, c.x, c.y, c.facing, moving ? c.walk : 0, false, false, size);
}

function drawCar(ctx: CanvasRenderingContext2D, car: Car, occupied: boolean) {
  const palettes = [
    ["#6b2a24", "#4a1c18", "#c9c3b0"],
    ["#2c3a4a", "#1a242e", "#8aa0b8"],
    ["#3d4a2c", "#262e1c", "#c4c9b0"],
    ["#5a4634", "#3a2e22", "#d4c4a0"],
    ["#3a3a3c", "#1e1e20", "#b0b0b4"],
  ];
  const [body, shade, glass] = palettes[car.color % palettes.length]!;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(-car.ang);
  ctx.fillStyle = "#1a1a1c";
  ctx.fillRect(-7, -16, 5, 8);
  ctx.fillRect(2, -16, 5, 8);
  ctx.fillRect(-7, 8, 5, 8);
  ctx.fillRect(2, 8, 5, 8);
  ctx.fillStyle = shade;
  ctx.fillRect(-10, -18, 20, 36);
  ctx.fillStyle = body;
  ctx.fillRect(-9, -16, 18, 32);
  ctx.fillStyle = shade;
  ctx.fillRect(-9, 6, 18, 10);
  ctx.fillStyle = occupied ? "#1c2420" : glass;
  ctx.globalAlpha = occupied ? 0.85 : 0.7;
  ctx.fillRect(-7, -8, 14, 10);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ead56a";
  ctx.fillRect(-8, 14, 4, 3);
  ctx.fillRect(4, 14, 4, 3);
  ctx.fillStyle = "#a33b34";
  ctx.fillRect(-8, -17, 4, 2);
  ctx.fillRect(4, -17, 4, 2);
  if (occupied) {
    ctx.fillStyle = "#c9c3b0";
    ctx.fillRect(-3, -4, 6, 5);
  }
  ctx.restore();
}

function drawFurn(
  ctx: CanvasRenderingContext2D,
  f: { kind: string; x: number; y: number; searched?: boolean; label?: string; look?: string },
) {
  const look = (f.look || f.kind || inferLook(f.kind, f.label ?? "")).toLowerCase();
  if (look === "bed" || (f.kind === "bed" && look !== "gurney")) {
    ctx.fillStyle = "#4a3428";
    ctx.fillRect(f.x - 18, f.y - 14, 36, 26);
    ctx.fillStyle = "#2a2018";
    ctx.fillRect(f.x - 18, f.y - 14, 36, 4);
    ctx.fillRect(f.x - 18, f.y + 8, 36, 4);
    ctx.fillStyle = "#6a5a48";
    ctx.fillRect(f.x - 16, f.y - 10, 32, 16);
    ctx.fillStyle = "#8a7a68";
    ctx.fillRect(f.x - 14, f.y - 4, 28, 8);
    ctx.fillStyle = "#c9c3b0";
    ctx.fillRect(f.x - 14, f.y - 10, 12, 8);
    ctx.fillStyle = "#3d3228";
    ctx.fillRect(f.x - 17, f.y + 10, 4, 4);
    ctx.fillRect(f.x + 13, f.y + 10, 4, 4);
  } else if (look === "gurney") {
    ctx.fillStyle = "#8a9aaa";
    ctx.fillRect(f.x - 16, f.y - 10, 32, 18);
    ctx.fillStyle = "#c9c3b0";
    ctx.fillRect(f.x - 14, f.y - 8, 28, 8);
    ctx.fillStyle = "#3d4a5c";
    ctx.fillRect(f.x - 15, f.y + 8, 4, 6);
    ctx.fillRect(f.x + 11, f.y + 8, 4, 6);
  } else if (look === "bench" || f.kind === "bench") {
    ctx.fillStyle = "#3a2a1c";
    ctx.fillRect(f.x - 18, f.y - 6, 36, 16);
    ctx.fillStyle = "#6b4a2b";
    ctx.fillRect(f.x - 16, f.y - 10, 32, 8);
    ctx.fillStyle = "#8a6a3b";
    ctx.fillRect(f.x - 14, f.y - 14, 10, 6);
    ctx.fillRect(f.x + 2, f.y - 13, 12, 5);
    ctx.fillStyle = "#4a4a4c";
    ctx.fillRect(f.x + 8, f.y - 8, 6, 4);
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(f.x - 10, f.y - 6, 3, 8);
  } else if (look === "shelf" || look === "shelves") {
    ctx.fillStyle = "#3d2a1c";
    ctx.fillRect(f.x - 14, f.y - 22, 28, 32);
    ctx.fillStyle = "#5a3e28";
    ctx.fillRect(f.x - 12, f.y - 20, 24, 3);
    ctx.fillRect(f.x - 12, f.y - 10, 24, 3);
    ctx.fillRect(f.x - 12, f.y, 24, 3);
    ctx.fillRect(f.x - 12, f.y + 8, 24, 3);
    const books = ["#6a2a24", "#2c3a4a", "#c9a227", "#3d4a2c", "#8a6a3b"];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = books[i]!;
      ctx.fillRect(f.x - 10 + i * 4, f.y - 19, 3, 8);
      ctx.fillRect(f.x - 10 + i * 4, f.y - 9, 3, 8);
    }
  } else if (look === "cabinet" || look === "closet") {
    ctx.fillStyle = "#5a3e28";
    ctx.fillRect(f.x - 12, f.y - 18, 24, 28);
    ctx.fillStyle = "#3d2a1c";
    ctx.fillRect(f.x - 1, f.y - 16, 2, 24);
    ctx.fillStyle = "#8a6a3b";
    ctx.fillRect(f.x - 10, f.y - 16, 8, 10);
    ctx.fillRect(f.x + 2, f.y - 16, 8, 10);
    ctx.fillRect(f.x - 10, f.y - 4, 8, 10);
    ctx.fillRect(f.x + 2, f.y - 4, 8, 10);
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(f.x - 4, f.y - 8, 2, 2);
    ctx.fillRect(f.x + 2, f.y - 8, 2, 2);
  } else if (look === "dresser") {
    ctx.fillStyle = "#5a3e28";
    ctx.fillRect(f.x - 14, f.y - 12, 28, 22);
    ctx.fillStyle = "#8a6a3b";
    ctx.fillRect(f.x - 12, f.y - 10, 24, 5);
    ctx.fillRect(f.x - 12, f.y - 3, 24, 5);
    ctx.fillRect(f.x - 12, f.y + 4, 24, 5);
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(f.x - 2, f.y - 8, 4, 2);
    ctx.fillRect(f.x - 2, f.y - 1, 4, 2);
    ctx.fillRect(f.x - 2, f.y + 6, 4, 2);
  } else if (look === "kitchen" || look === "counter") {
    ctx.fillStyle = "#4a4a4c";
    ctx.fillRect(f.x - 16, f.y - 8, 32, 16);
    ctx.fillStyle = "#8a8a8c";
    ctx.fillRect(f.x - 16, f.y - 12, 32, 6);
    ctx.fillStyle = "#2a2a2c";
    ctx.fillRect(f.x - 12, f.y - 10, 8, 4);
    ctx.fillStyle = "#6b5344";
    ctx.fillRect(f.x + 4, f.y - 16, 6, 6);
  } else if (look === "desk") {
    ctx.fillStyle = "#5a3e28";
    ctx.fillRect(f.x - 16, f.y - 6, 32, 14);
    ctx.fillStyle = "#8a6a3b";
    ctx.fillRect(f.x - 16, f.y - 10, 32, 6);
    ctx.fillStyle = "#c9c3b0";
    ctx.fillRect(f.x - 8, f.y - 14, 10, 6);
    ctx.fillStyle = "#2c3a4a";
    ctx.fillRect(f.x + 6, f.y - 12, 6, 4);
  } else if (look === "pew") {
    ctx.fillStyle = "#4a3428";
    ctx.fillRect(f.x - 20, f.y - 4, 40, 10);
    ctx.fillStyle = "#6b4a2b";
    ctx.fillRect(f.x - 20, f.y - 14, 40, 6);
    ctx.fillRect(f.x - 20, f.y - 14, 4, 16);
    ctx.fillRect(f.x + 16, f.y - 14, 4, 16);
  } else if (look === "locker") {
    ctx.fillStyle = "#4a4a4c";
    ctx.fillRect(f.x - 12, f.y - 20, 24, 32);
    ctx.fillStyle = "#2a2a2c";
    ctx.fillRect(f.x - 1, f.y - 18, 2, 28);
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(f.x - 8, f.y - 4, 3, 3);
    ctx.fillRect(f.x + 5, f.y - 4, 3, 3);
  } else if (look === "crate" || f.kind === "chest") {
    ctx.fillStyle = "#6b4a2b";
    ctx.fillRect(f.x - 12, f.y - 10, 24, 18);
    ctx.fillStyle = "#8a6a3b";
    ctx.fillRect(f.x - 12, f.y - 10, 24, 4);
    ctx.fillStyle = "#3d2a1c";
    ctx.fillRect(f.x - 1, f.y - 10, 2, 18);
    ctx.fillRect(f.x - 12, f.y - 2, 24, 2);
    if (f.kind === "chest") {
      ctx.fillStyle = "#c9a227";
      ctx.fillRect(f.x - 3, f.y - 2, 6, 4);
    }
  } else if (look === "lock" || f.kind === "lock") {
    ctx.fillStyle = "#5a3e28";
    ctx.fillRect(f.x - 10, f.y - 16, 20, 24);
    ctx.fillStyle = "#3d2a1c";
    ctx.fillRect(f.x - 8, f.y - 14, 16, 20);
    ctx.fillStyle = "#c9a227";
    ctx.fillRect(f.x - 4, f.y - 6, 8, 7);
    ctx.strokeStyle = "#c9a227";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(f.x, f.y - 6, 3, Math.PI, 0);
    ctx.stroke();
  } else if (f.kind === "door") {
    ctx.fillStyle = "#2a2d24";
    ctx.fillRect(f.x - 18, f.y - 4, 36, 12);
    ctx.fillStyle = "#6b5344";
    ctx.fillRect(f.x - 14, f.y - 2, 28, 8);
  } else if (f.kind === "claim") {
    ctx.fillStyle = "#6a8a4e";
    ctx.fillRect(f.x - 3, f.y - 14, 4, 20);
    ctx.fillStyle = "#c9c3b0";
    ctx.fillRect(f.x + 1, f.y - 14, 12, 8);
  } else {
    ctx.fillStyle = "#6b5344";
    ctx.fillRect(f.x - 9, f.y - 10, 18, 18);
    ctx.fillStyle = "#3d3228";
    ctx.fillRect(f.x - 6, f.y - 6, 5, 6);
    ctx.fillRect(f.x + 2, f.y - 6, 5, 6);
  }
  if (f.searched) {
    ctx.strokeStyle = "rgba(230,225,208,0.35)";
    ctx.strokeRect(f.x - 12, f.y - 14, 24, 24);
  }
}

function inferLook(kind: string, label: string) {
  const l = label.toLowerCase();
  if (kind === "bench") return "bench";
  if (kind === "bed") return l.includes("gurney") ? "gurney" : "bed";
  if (kind === "lock") return "lock";
  if (kind === "door") return "door";
  if (kind === "claim") return "claim";
  if (l.includes("shelf")) return "shelf";
  if (l.includes("cabinet") || l.includes("closet") || l.includes("pharmacy") || l.includes("exam")) return "cabinet";
  if (l.includes("kitchen") || l.includes("counter") || l.includes("vending")) return "counter";
  if (l.includes("desk") || l.includes("office") || l.includes("drawer") || l.includes("lecture")) return "desk";
  if (l.includes("pew")) return "pew";
  if (l.includes("locker") || l.includes("cage") || l.includes("evidence")) return "locker";
  if (l.includes("crate") || l.includes("stock") || l.includes("storage")) return "crate";
  if (l.includes("dresser")) return "dresser";
  if (l.includes("gurney")) return "gurney";
  if (l.includes("bed") || l.includes("dorm")) return "bed";
  return kind;
}

function visFor(s: GameState, _cam: Cam, _vw: number, _vh: number) {
  const interior = s.interior;
  const opaque = interior ? interior.blocked : s.world.opaque;
  const bw = interior ? interior.w : MAP_W;
  const bh = interior ? interior.h : MAP_H;
  const range = interior ? VISION_IN : VISION;
  const ox = s.player.x;
  const oy = s.player.y - 8;
  const cache = new Map<number, boolean>();
  return {
    see(x: number, y: number) {
      if (Math.hypot(x - ox, y - oy) > range) return false;
      const tx = Math.floor(x / TILE);
      const ty = Math.floor(y / TILE);
      const k = ty * 1024 + tx;
      const hit = cache.get(k);
      if (hit !== undefined) return hit;
      const ok = hasLos(opaque, bw, bh, ox, oy, x, y);
      cache.set(k, ok);
      return ok;
    },
  };
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
  ctx.strokeStyle = "rgba(210, 190, 90, 0.9)";
  ctx.lineWidth = 1.4;
  for (const road of ROADS) {
    if (road.w < 1) continue;
    const p = road.pts;
    if (p.length < 4) continue;
    ctx.beginPath();
    for (let i = 0; i + 1 < p.length; i += 2) {
      const g = geoToWorld(p[i]!, p[i + 1]!);
      const px = x + g.x * sx;
      const py = y + g.y * sy;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(120, 70, 48, 0.9)";
  for (const b of s.world.buildings) {
    if (b.kind === "house" || b.kind === "ranch") continue;
    ctx.fillRect(x + (b.x + b.w / 2) * sx - 1, y + (b.y + b.h / 2) * sy - 1, 2, 2);
  }
  ctx.fillStyle = "#c9c3b0";
  ctx.fillRect(x + s.player.x * sx - 2, y + s.player.y * sy - 2, 4, 4);
  ctx.fillStyle = "#7a90b8";
  for (const c of s.world.cars) {
    ctx.fillRect(x + c.x * sx - 1, y + c.y * sy - 1, 2, 2);
  }
}
