import type { Slot } from "./items";

export const SAVE_VERSION = 6;
const KEY = "ferrum-night-save";
const BACK = "ferrum-night-save-bak";

export type SaveData = {
  version: number;
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
  interior: string | null;
  doors?: Record<string, { locked: boolean; broken: boolean; hp: number }>;
  benches?: Record<string, { x: number; y: number }[]>;
  cars?: { id: number; x: number; y: number; ang: number; gas: number }[];
  carId?: number | null;
  zeds?: { id: number; x: number; y: number; hp: number; alive: boolean; inside: string | null }[];
  drops?: { id: number; x: number; y: number; slot: Slot; inside: string | null }[];
};

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SaveData;
    if (!s || typeof s !== "object") return null;
    if (s.version !== SAVE_VERSION) {
      // v1 was a fake street grid; OSM map invalidates positions.
      if (!s.version || s.version < 6) return null;
      return migrate(s);
    }
    return s;
  } catch {
    return null;
  }
}

function migrate(s: SaveData): SaveData {
  s.version = SAVE_VERSION;
  s.inv ??= [];
  s.claimed ??= [];
  s.chests ??= {};
  s.searched ??= [];
  s.chopped ??= [];
  s.deadZ ??= [];
  s.deadC ??= [];
  s.doors ??= {};
  s.benches ??= {};
  s.cars ??= [];
  s.carId ??= null;
  return s;
}

export function writeSave(data: SaveData) {
  try {
    const prev = localStorage.getItem(KEY);
    if (prev) localStorage.setItem(BACK, prev);
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
