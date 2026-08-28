import { create } from "zustand";
import type { Slot } from "./items";

export type Screen = "title" | "play" | "pause" | "dead" | "turned" | "turn-choice";

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
  inCar: boolean;
  gas: number;
  gasMax: number;
  form: "human" | "zed";
  zedLevel: number;
  offerTurn: boolean;
  hpShow: boolean;
  gasShow: boolean;
  carShow: boolean;
  infShow: boolean;
  carHp: number;
  followName: string;
  containerId: string | null;
  containerName: string;
  containerSlots: Slot[];
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
  inCar: false,
  gas: 0,
  gasMax: 120,
  form: "human",
  zedLevel: 1,
  offerTurn: false,
  hpShow: false,
  gasShow: false,
  carShow: false,
  infShow: false,
  carHp: 100,
  followName: "",
  containerId: null,
  containerName: "",
  containerSlots: [],
  set: (p) => set(p),
}));
