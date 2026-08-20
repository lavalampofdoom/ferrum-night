#!/usr/bin/env python3
"""Chroma-key, slice, and publish Ferrum Night art into public/game/."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter
import numpy as np

ART = Path("/workspace/artifacts/imagine_images")
OUT = Path("/workspace/public/game")
WORK = Path("/workspace/assets")


def magenta_mask(arr: np.ndarray) -> np.ndarray:
    r = arr[..., 0].astype(np.float32)
    g = arr[..., 1].astype(np.float32)
    b = arr[..., 2].astype(np.float32)
    dist = np.sqrt((r - 255) ** 2 + (g - 0) ** 2 + (b - 255) ** 2)
    # JPEG magenta / pink / hot purple
    hot = (r > 150) & (b > 150) & (g < 110) & (r + b > g * 2.6 + 80)
    pink = (r > 170) & (b > 120) & (g < 130) & (r > g + 40) & (b > g + 20)
    return (dist < 110) | hot | pink


def chroma(im: Image.Image, expand: int = 2) -> Image.Image:
    rgba = im.convert("RGBA")
    arr = np.asarray(rgba).copy()
    mask = magenta_mask(arr)
    # expand mask so JPEG ringing dies
    mimg = Image.fromarray((mask.astype(np.uint8) * 255), "L")
    if expand:
        mimg = mimg.filter(ImageFilter.MaxFilter(expand * 2 + 1))
    mask = np.asarray(mimg) > 0
    arr[..., 3] = np.where(mask, 0, arr[..., 3])
    # despill leftover
    r = arr[..., 0].astype(np.float32)
    g = arr[..., 1].astype(np.float32)
    b = arr[..., 2].astype(np.float32)
    fringe = (~mask) & ((r > 140) & (b > 140) & (g < 160))
    avg = (g + np.minimum(r, b)) * 0.5
    arr[..., 0] = np.where(fringe, avg, r).astype(np.uint8)
    arr[..., 2] = np.where(fringe, avg, b).astype(np.uint8)
    out = Image.fromarray(arr, "RGBA")
    bbox = out.getbbox()
    if bbox:
        x0, y0, x1, y1 = bbox
        pad = 2
        x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
        x1, y1 = min(out.width, x1 + pad), min(out.height, y1 + pad)
        out = out.crop((x0, y0, x1, y1))
    return out


def slice_grid(im: Image.Image, rows: int, cols: int) -> list[Image.Image]:
    w, h = im.size
    cw, ch = w // cols, h // rows
    frames = []
    for r in range(rows):
        for c in range(cols):
            cell = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            frames.append(chroma(cell, expand=1))
    return frames


def pack_sheet(frames: list[Image.Image], rows: int, cols: int, cell: int = 96) -> Image.Image:
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        r, c = divmod(i, cols)
        fr = fr.copy()
        fr.thumbnail((cell - 8, cell - 8), Image.Resampling.NEAREST)
        x = c * cell + (cell - fr.width) // 2
        y = r * cell + cell - 4 - fr.height
        sheet.paste(fr, (x, y), fr)
    return sheet


def save_tile(src: Path, dest: Path, size: int = 64) -> None:
    im = Image.open(src).convert("RGB")
    im = im.resize((size, size), Image.Resampling.NEAREST)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG")


def publish_prop(src: Path, dest: Path, max_side: int) -> None:
    im = chroma(Image.open(src), expand=3)
    im.thumbnail((max_side, max_side), Image.Resampling.NEAREST)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    tiles = {
        "grass": "7feb2af1-01ab-4a10-85ab-ee55f9133efa.jpg",
        "forest": "1f610eb1-b7cf-4621-ab46-b33ba5cdce2c.jpg",
        "asphalt": "b713bfe0-f81e-4abc-830b-933b252eca1c.jpg",
        "dirt": "2b5daad5-412b-4106-afb0-3778b01d53a9.jpg",
        "wood": "61cc3a00-c820-4eac-a378-b1a1d83a2b20.jpg",
        "water": "8b865b73-e983-48b0-bf09-154c14d35319.jpg",
        "wall": "1376de04-c7ce-4e2c-9fcd-a652582157f6.jpg",
    }
    for name, fn in tiles.items():
        save_tile(ART / fn, OUT / "tiles" / f"{name}.png", 64)
        t = Image.open(OUT / "tiles" / f"{name}.png")
        prev = Image.new("RGB", (128, 128))
        for y in (0, 64):
            for x in (0, 64):
                prev.paste(t, (x, y))
        (WORK / "tiles").mkdir(parents=True, exist_ok=True)
        prev.save(WORK / "tiles" / f"{name}-2x2.png")

    player_raw = Image.open(ART / "03fb702c-9655-4f73-9d25-cf028616c62b.jpg")
    zombie_raw = Image.open(ART / "7dcbc4f1-c09b-4d3c-8e38-60b18f2df9d7.jpg")
    attack_raw = Image.open(ART / "0d0cef85-a3e1-4a5c-9a98-bb5859ebcb7d.jpg")

    pack_sheet(slice_grid(player_raw, 4, 4), 4, 4, 96).save(OUT / "sprites" / "player.png")
    pack_sheet(slice_grid(zombie_raw, 4, 4), 4, 4, 96).save(OUT / "sprites" / "zombie.png")
    pack_sheet(slice_grid(attack_raw, 2, 2), 2, 2, 96).save(OUT / "sprites" / "player-attack.png")

    buildings = {
        "house": ("a18d8329-b9c9-4fba-a22d-3c13254c0ff9.jpg", 160),
        "ranch": ("027dd384-be44-4247-a9e8-598f2b0c1de1.jpg", 160),
        "clinic": ("c34ccf2d-02ec-45dd-bba4-df96faba22c5.jpg", 200),
        "kfc": ("bf37d9eb-7221-4aff-a5a1-314610b84792.jpg", 220),
        "lowes": ("b3e6effa-7f0c-45df-9efc-f7b22585676e.jpg", 280),
        "courthouse": ("4ebce3e5-ba6e-4289-8161-4dee94d6ced1.jpg", 200),
        "college": ("7d7d25cc-ea98-46d7-88bf-482067cf8ae3.jpg", 260),
        "church": ("3aa8b7bb-bcd6-45cd-82b3-9c8d9d9cbbf7.jpg", 180),
        "gas": ("dd90bbac-e5f3-4e05-b251-5282476195cd.jpg", 200),
    }
    for name, (fn, mx) in buildings.items():
        publish_prop(ART / fn, OUT / "buildings" / f"{name}.png", mx)

    publish_prop(ART / "04a2f39a-67fd-4ace-9edf-fc14b5c6db67.jpg", OUT / "props" / "pine.png", 120)
    publish_prop(ART / "8f7c76ed-2abf-4ba8-b4b1-8f0e7cb31b8f.jpg", OUT / "props" / "oak.png", 110)
    publish_prop(ART / "ea2b8058-c714-40eb-8d3e-e279dd124b36.jpg", OUT / "props" / "truck.png", 110)

    pack_raw = Image.open(ART / "b6025e9d-bf29-4305-9562-1b2a7abfb8e5.jpg")
    labels = ["crate", "barrel", "mailbox", "bush", "dumpster", "tires", "fence", "hydrant", "picnic"]
    for lab, cell in zip(labels, slice_grid(pack_raw, 3, 3)):
        cell.thumbnail((64, 64), Image.Resampling.NEAREST)
        cell.save(OUT / "props" / f"{lab}.png")

    print("done")


if __name__ == "__main__":
    main()
