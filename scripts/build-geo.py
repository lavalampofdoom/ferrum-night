#!/usr/bin/env python3
"""Compact OSM dumps into src/game/geo-data.ts (ODbL: © OpenStreetMap)."""
from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path("/workspace")
DATA = ROOT / "src/game/data"
OUT = ROOT / "src/game/geo-data.ts"

WEST, EAST = -80.12, -79.84
SOUTH, NORTH = 36.875, 37.035


def dp(pts: list[tuple[float, float]], eps: float) -> list[tuple[float, float]]:
    if len(pts) < 3:
        return pts

    def dist(a, b, p):
        vx, vy = b[0] - a[0], b[1] - a[1]
        l2 = vx * vx + vy * vy
        if l2 == 0:
            return math.hypot(p[0] - a[0], p[1] - a[1])
        t = max(0.0, min(1.0, ((p[0] - a[0]) * vx + (p[1] - a[1]) * vy) / l2))
        return math.hypot(p[0] - (a[0] + t * vx), p[1] - (a[1] + t * vy))

    def rec(chunk):
        if len(chunk) < 3:
            return chunk
        a, b = chunk[0], chunk[-1]
        im, md = 0, 0.0
        for i in range(1, len(chunk) - 1):
            d = dist(a, b, chunk[i])
            if d > md:
                im, md = i, d
        if md > eps:
            return rec(chunk[: im + 1])[:-1] + rec(chunk[im:])
        return [a, b]

    return rec(pts)


def in_bounds(lat: float, lon: float, pad: float = 0.008) -> bool:
    return (SOUTH - pad) <= lat <= (NORTH + pad) and (WEST - pad) <= lon <= (EAST + pad)


def r5(v: float) -> float:
    return round(v, 5)


def load(name: str):
    with open(DATA / name) as f:
        return json.load(f)


def way_pts(e) -> list[tuple[float, float]]:
    g = e.get("geometry") or []
    pts = [(p["lat"], p["lon"]) for p in g]
    pts = [p for p in pts if in_bounds(*p)]
    return pts


def width_for(highway: str) -> int:
    if highway in ("primary", "secondary"):
        return 2
    if highway in ("tertiary", "unclassified"):
        return 1
    return 0


def compact_roads(path: str, eps: float) -> list[dict]:
    data = load(path)
    out = []
    for e in data["elements"]:
        if e.get("type") != "way":
            continue
        tags = e.get("tags") or {}
        hw = tags.get("highway") or ""
        pts = dp(way_pts(e), eps)
        if len(pts) < 2:
            continue
        flat = []
        for lat, lon in pts:
            flat.append(r5(lat))
            flat.append(r5(lon))
        out.append(
            {
                "name": tags.get("name") or tags.get("ref") or "",
                "w": width_for(hw),
                "pts": flat,
            }
        )
    return out


def zone(lat: float, lng: float) -> str:
    if lng >= -79.92:
        return "town"
    if 36.916 <= lat <= 36.938 and -80.032 <= lng <= -80.004:
        return "ferrum"
    return "rural"


# Curated real-world landmarks (Nominatim / OSM centroids).
LANDMARKS = [
    {
        "id": "clinic",
        "kind": "clinic",
        "name": "Tri-Area Community Health",
        "address": "180 Ferrum Mountain Rd",
        "lat": 36.92611,
        "lng": -80.01912,
        "tw": 6,
        "th": 5,
        "claimable": True,
        "loot": "clinic",
        "zone": "ferrum",
    },
    {
        "id": "college",
        "kind": "college",
        "name": "Franklin Hall — Student Center",
        "address": "Ferrum College",
        "lat": 36.92804,
        "lng": -80.02212,
        "tw": 7,
        "th": 5,
        "claimable": False,
        "loot": "college",
        "zone": "ferrum",
    },
    {
        "id": "college-lib",
        "kind": "college",
        "name": "Stanley Library",
        "address": "Ferrum College",
        "lat": 36.92689,
        "lng": -80.02160,
        "tw": 6,
        "th": 4,
        "claimable": False,
        "loot": "college",
        "zone": "ferrum",
    },
    {
        "id": "college2",
        "kind": "church",
        "name": "Vaughn Chapel",
        "address": "Ferrum College",
        "lat": 36.92747,
        "lng": -80.02168,
        "tw": 4,
        "th": 4,
        "claimable": False,
        "loot": "church",
        "zone": "ferrum",
    },
    {
        "id": "church-ferrum",
        "kind": "church",
        "name": "Saint James Methodist Church",
        "address": "Franklin St, Ferrum",
        "lat": 36.92112,
        "lng": -80.00942,
        "tw": 4,
        "th": 6,
        "claimable": False,
        "loot": "church",
        "zone": "ferrum",
    },
    {
        "id": "ferrum-store",
        "kind": "gas",
        "name": "Ferrum Minute Market",
        "address": "9711 Franklin St",
        "lat": 36.92120,
        "lng": -80.01121,
        "tw": 5,
        "th": 4,
        "claimable": False,
        "loot": "store",
        "zone": "ferrum",
    },
    {
        "id": "ferrum-dg",
        "kind": "gas",
        "name": "Dollar General",
        "address": "9785 Franklin St, Ferrum",
        "lat": 36.92178,
        "lng": -80.01247,
        "tw": 5,
        "th": 4,
        "claimable": False,
        "loot": "store",
        "zone": "ferrum",
    },
    {
        "id": "ferrum-dq",
        "kind": "kfc",
        "name": "DQ Grill & Chill",
        "address": "9737 Franklin St, Ferrum",
        "lat": 36.92149,
        "lng": -80.01159,
        "tw": 5,
        "th": 4,
        "claimable": False,
        "loot": "kfc",
        "zone": "ferrum",
    },
    {
        "id": "ferrum-fire",
        "kind": "gas",
        "name": "Ferrum Volunteer Fire",
        "address": "Franklin St, Ferrum",
        "lat": 36.92176,
        "lng": -80.00959,
        "tw": 5,
        "th": 4,
        "claimable": False,
        "loot": "civic",
        "zone": "ferrum",
    },
    {
        "id": "ferrum-post",
        "kind": "house",
        "name": "Ferrum Post Office",
        "address": "57 Fieldcrest Rd",
        "lat": 36.92035,
        "lng": -80.01210,
        "tw": 4,
        "th": 3,
        "claimable": True,
        "loot": "civic",
        "zone": "ferrum",
    },
    {
        "id": "ferrum-elem",
        "kind": "college",
        "name": "Ferrum Elementary School",
        "address": "Ferrum, VA",
        "lat": 36.92292,
        "lng": -80.02664,
        "tw": 7,
        "th": 5,
        "claimable": False,
        "loot": "college",
        "zone": "ferrum",
    },
    {
        "id": "fairy-1576",
        "kind": "house",
        "name": "Farmhouse",
        "address": "1576 Fairy Stone Park Rd",
        "lat": 36.90540,
        "lng": -80.09020,
        "tw": 4,
        "th": 4,
        "claimable": True,
        "loot": "house",
        "zone": "rural",
    },
    {
        "id": "new-haven",
        "kind": "church",
        "name": "New Haven Church",
        "address": "west of Ferrum",
        "lat": 36.91514,
        "lng": -80.04476,
        "tw": 4,
        "th": 5,
        "claimable": False,
        "loot": "church",
        "zone": "rural",
    },
    {
        "id": "lowes",
        "kind": "lowes",
        "name": "Lowe's Home Improvement",
        "address": "800 Old Franklin Tpke",
        "lat": 37.01499,
        "lng": -79.86068,
        "tw": 10,
        "th": 6,
        "claimable": False,
        "loot": "lowes",
        "zone": "town",
    },
    {
        "id": "walmart",
        "kind": "lowes",
        "name": "Walmart Supercenter",
        "address": "550 Old Franklin Tpke",
        "lat": 37.01361,
        "lng": -79.86340,
        "tw": 10,
        "th": 6,
        "claimable": False,
        "loot": "store",
        "zone": "town",
    },
    {
        "id": "kfc",
        "kind": "kfc",
        "name": "KFC",
        "address": "1775 N Main St",
        "lat": 37.01971,
        "lng": -79.88842,
        "tw": 6,
        "th": 5,
        "claimable": False,
        "loot": "kfc",
        "zone": "town",
    },
    {
        "id": "courthouse",
        "kind": "courthouse",
        "name": "Franklin County Courthouse",
        "address": "Main St, Rocky Mount",
        "lat": 36.99514,
        "lng": -79.88864,
        "tw": 6,
        "th": 7,
        "claimable": False,
        "loot": "civic",
        "zone": "town",
    },
    {
        "id": "hospital",
        "kind": "clinic",
        "name": "Carilion Franklin Memorial",
        "address": "390 S Main St",
        "lat": 36.99366,
        "lng": -79.89038,
        "tw": 7,
        "th": 5,
        "claimable": False,
        "loot": "clinic",
        "zone": "town",
    },
    {
        "id": "library",
        "kind": "courthouse",
        "name": "Franklin County Public Library",
        "address": "355 Franklin St",
        "lat": 36.99798,
        "lng": -79.89178,
        "tw": 5,
        "th": 4,
        "claimable": False,
        "loot": "civic",
        "zone": "town",
    },
    {
        "id": "sheetz",
        "kind": "gas",
        "name": "Sheetz",
        "address": "265 Old Franklin Tpke",
        "lat": 37.01219,
        "lng": -79.86965,
        "tw": 5,
        "th": 4,
        "claimable": False,
        "loot": "gas",
        "zone": "town",
    },
    {
        "id": "foodlion",
        "kind": "college",
        "name": "Food Lion",
        "address": "Tanyard Rd, Rocky Mount",
        "lat": 37.00632,
        "lng": -79.87645,
        "tw": 7,
        "th": 5,
        "claimable": False,
        "loot": "store",
        "zone": "town",
    },
    {
        "id": "mcdonalds",
        "kind": "kfc",
        "name": "McDonald's",
        "address": "970 Tanyard Rd",
        "lat": 37.00762,
        "lng": -79.87530,
        "tw": 5,
        "th": 4,
        "claimable": False,
        "loot": "kfc",
        "zone": "town",
    },
    {
        "id": "gas-rm",
        "kind": "gas",
        "name": "Shell",
        "address": "N Main St, Rocky Mount",
        "lat": 37.01925,
        "lng": -79.88795,
        "tw": 5,
        "th": 4,
        "claimable": False,
        "loot": "gas",
        "zone": "town",
    },
    {
        "id": "harvester",
        "kind": "college",
        "name": "Harvester Performance Center",
        "address": "450 Franklin St",
        "lat": 36.99656,
        "lng": -79.89211,
        "tw": 6,
        "th": 4,
        "claimable": False,
        "loot": "civic",
        "zone": "town",
    },
    {
        "id": "fchs",
        "kind": "college",
        "name": "Franklin County High School",
        "address": "700 Tanyard Rd",
        "lat": 37.00390,
        "lng": -79.87845,
        "tw": 8,
        "th": 5,
        "claimable": False,
        "loot": "college",
        "zone": "town",
    },
]


# Maggodee Creek (south of Ferrum College / village)
WATERWAYS = [
    {
        "name": "Maggodee Creek",
        "w": 1,
        "pts": [
            36.9082, -80.0720,
            36.9124, -80.0540,
            36.9168, -80.0385,
            36.9194, -80.0248,
            36.9208, -80.0142,
            36.9236, -80.0020,
            36.9285, -79.9880,
            36.9340, -79.9740,
        ],
    }
]


def too_close(lat, lng, spots, deg=0.00105) -> bool:
    for slat, slng in spots:
        if abs(lat - slat) < deg and abs(lng - slng) < deg * 1.25:
            if (lat - slat) ** 2 + ((lng - slng) * 1.25) ** 2 < deg * deg:
                return True
    return False


def houses() -> list[dict]:
    data = load("osm-buildings.json")
    taken = [(lm["lat"], lm["lng"]) for lm in LANDMARKS]
    skip_b = {"roof", "shed", "carport", "garage", "grandstand", "terrace"}
    out = []
    hid = 0
    for e in data["elements"]:
        tags = e.get("tags") or {}
        c = e.get("center")
        if not c:
            continue
        lat, lng = c["lat"], c["lon"]
        if not in_bounds(lat, lng, 0.0):
            continue
        b = tags.get("building") or "yes"
        if b in skip_b:
            continue
        if too_close(lat, lng, taken, 0.00085):
            continue
        name = tags.get("name") or ""
        # skip if this is already a curated landmark by name
        if name and any(name.split("—")[0].strip() in lm["name"] or lm["name"] in name for lm in LANDMARKS):
            continue
        kind = "house"
        loot = "house"
        claimable = True
        tw, th = 3, 3
        if b == "university" or b == "school":
            kind = "college"
            loot = "college"
            claimable = False
            tw, th = 4, 3
            if not name:
                name = "Campus Hall"
        elif b == "church" or tags.get("amenity") == "place_of_worship":
            kind = "church"
            loot = "church"
            claimable = False
            tw, th = 4, 5
            if not name:
                name = "Church"
        elif b in ("retail", "commercial"):
            kind = "gas"
            loot = "store"
            claimable = False
            tw, th = 4, 3
            if not name:
                name = "Shop"
        elif b == "industrial":
            kind = "ranch"
            loot = "lowes"
            claimable = False
            tw, th = 5, 4
            if not name:
                name = "Warehouse"
        elif b == "hospital":
            kind = "clinic"
            loot = "clinic"
            claimable = False
            tw, th = 6, 4
            if not name:
                name = "Clinic"
        elif b == "house":
            kind = "house"
            name = name or "House"
        elif b == "apartments":
            kind = "ranch"
            name = name or "Apartments"
            tw, th = 4, 3
        else:
            # generic building=yes
            if tags.get("shop") or tags.get("amenity") in ("fast_food", "restaurant", "fuel", "cafe"):
                kind = "gas"
                loot = "store"
                claimable = False
                name = name or tags.get("shop") or "Shop"
                tw, th = 4, 3
            else:
                kind = "ranch" if (hid % 5 == 0) else "house"
                name = name or ("Brick Ranch" if kind == "ranch" else "House")
                tw, th = (4, 3) if kind == "ranch" else (3, 3)

        hn = tags.get("addr:housenumber") or ""
        st = tags.get("addr:street") or ""
        if hn and st:
            address = f"{hn} {st}"
        elif st:
            address = st
        else:
            z = zone(lat, lng)
            address = (
                "N Main St area"
                if z == "town"
                else "Franklin St, Ferrum"
                if z == "ferrum"
                else "Franklin County"
            )

        hid += 1
        rec = {
            "id": f"b{hid}",
            "kind": kind,
            "name": name[:48],
            "address": address[:52],
            "lat": r5(lat),
            "lng": r5(lng),
            "tw": tw,
            "th": th,
            "claimable": claimable,
            "loot": loot,
            "zone": zone(lat, lng),
        }
        out.append(rec)
        taken.append((lat, lng))
    return out


def ts_val(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, str):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, float):
        s = f"{v:.5f}".rstrip("0").rstrip(".")
        return s
    if isinstance(v, int):
        return str(v)
    if isinstance(v, list):
        return "[" + ", ".join(ts_val(x) for x in v) + "]"
    if isinstance(v, dict):
        keys = []
        for k, val in v.items():
            keys.append(f"{k}: {ts_val(val)}")
        return "{ " + ", ".join(keys) + " }"
    return str(v)


def emit_arr(name: str, typ: str, rows: list[dict]) -> str:
    lines = [f"export const {name}: {typ}[] = ["]
    for r in rows:
        lines.append(f"  {ts_val(r)},")
    lines.append("];")
    return "\n".join(lines)


def main():
    roads = compact_roads("osm-roads.json", 0.00028)
    streets = compact_roads("osm-residential.json", 0.00035)
    blds = houses()
    header = '''/** OSM-derived Ferrum–Rocky Mount geography. Coords are lat,lng (flat pairs).
 * © OpenStreetMap contributors, ODbL. Do not import raw Overpass dumps. */
export type GeoRoad = { name: string; w: number; pts: number[] };
export type GeoPlace = {
  id: string;
  kind: "house" | "ranch" | "clinic" | "kfc" | "lowes" | "courthouse" | "college" | "church" | "gas";
  name: string;
  address: string;
  lat: number;
  lng: number;
  tw: number;
  th: number;
  claimable: boolean;
  loot: string;
  zone: "rural" | "ferrum" | "town";
};

'''
    body = "\n\n".join(
        [
            emit_arr("ROADS", "GeoRoad", roads),
            emit_arr("STREETS", "GeoRoad", streets),
            emit_arr("WATERWAYS", "GeoRoad", WATERWAYS),
            emit_arr("LANDMARKS", "GeoPlace", LANDMARKS),
            emit_arr("HOUSES", "GeoPlace", blds),
        ]
    )
    OUT.write_text(header + body + "\n")
    print(
        f"wrote {OUT} ({OUT.stat().st_size/1024:.1f}KB) "
        f"roads={len(roads)} streets={len(streets)} landmarks={len(LANDMARKS)} houses={len(blds)}"
    )


if __name__ == "__main__":
    main()
