import { create } from "zustand";
import type { Slot } from "./items";

export type Screen = "title" | "play" | "pause" | "dead" | "turned";

export type HudState = {
  screen: Screen;
  hp: number;
  maxHp: number;
  infection: number;
  location: string;
  hint: string;
  weapon: string;
  armor: string;
  inv: Slot[];
  invOpen: boolean;
  craftOpen: boolean;
  atBench: boolean;
  claimedHere: boolean;
  inside: boolean;
  buildingName: string;
  toast: string;
  time: number;
  set: (p: Partial<HudState>) => void;
};

export const useHud = create<HudState>((set) => ({
  screen: "title",
  hp: 100,
  maxHp: 100,
  infection: 0,
  location: "Ferrum, VA",
  hint: "",
  weapon: "fists",
  armor: "",
  inv: [],
  invOpen: false,
  craftOpen: false,
  atBench: false,
  claimedHere: false,
  inside: false,
  buildingName: "",
  toast: "",
  time: 0,
  set: (p) => set(p),
}));
