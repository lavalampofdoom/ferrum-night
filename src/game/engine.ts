import { loadAssets, type Assets } from "./assets";
import { GameAudio } from "./audio";
import { CAR_GAS, FIXED_DT, MAX_FRAME_DT } from "./constants";
import { Input, radialDeadzone } from "./input";
import { craft, RECIPES } from "./items";
import { cameraFor, drawFrame, drawMinimap } from "./render";
import { clearSave, loadSave, writeSave } from "./save";
import {
  applySave,
  closeContainer,
  createState,
  currentCar,
  dropItem,
  snapshotSave,
  stepParticles,
  stepSim,
  storeInChest,
  takeFromChest,
  useItem,
  type GameState,
} from "./sim";
import { useHud } from "./store";
import { generateWorld, locationName } from "./world";

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  getPos: () => { x: number; y: number };
  setKeys?: (codes: string[]) => void;
  setSteer?: (v: number) => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
    __ferrum?: { start: () => void; pause: () => void; inspect?: () => unknown };

  }
}

export class Engine {
  canvas: HTMLCanvasElement;
  mini: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D;
  input = new Input();
  audio = new GameAudio();
  assets: Assets | null = null;
  state: GameState | null = null;
  running = false;
  paused = false;
  acc = 0;
  last = 0;
  unsub: (() => void) | null = null;
  hudT = 0;
  saveT = 0;
  cam = { x: 0, y: 0, scale: 1 };

  constructor(canvas: HTMLCanvasElement, mini?: HTMLCanvasElement | null) {
    this.canvas = canvas;
    this.mini = mini ?? null;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");
    this.ctx = ctx;
  }

  async init() {
    this.resize();
    this.assets = await loadAssets();
    const world = generateWorld(40);
    this.state = createState(world);
    const save = loadSave();
    if (save) applySave(this.state, save);
    this.unsub = this.input.attach(this.canvas);
    this.wireControlsTest();
    this.syncHud();
  }

  start() {
    if (!this.state) return;
    this.audio.unlock();
    this.running = true;
    this.paused = false;
    this.last = performance.now();
    useHud.getState().set({ screen: "play" });
    requestAnimationFrame(this.frame);
  }

  pauseToggle() {
    if (!this.running) return;
    this.paused = !this.paused;
    useHud.getState().set({ screen: this.paused ? "pause" : "play" });
    if (!this.paused) {
      this.last = performance.now();
      requestAnimationFrame(this.frame);
    }
  }

  newGame() {
    clearSave();
    const world = generateWorld(40 + Math.floor(Math.random() * 50));
    this.state = createState(world);
    this.paused = false;
    this.running = true;
    this.last = performance.now();
    useHud.getState().set({ screen: "play", invOpen: false, craftOpen: false, containerId: null });
    this.syncHud();
    requestAnimationFrame(this.frame);
  }

  destroy() {
    this.running = false;
    this.unsub?.();
    if (typeof window !== "undefined") delete window.__controlsTest;
  }

  setStick(x: number, y: number) {
    const v = radialDeadzone(x, y);
    this.input.stickX = v.x;
    this.input.stickY = v.y;
  }

  setAttack(v: boolean) {
    this.input.btnAttack = v;
  }
  setUse(v: boolean) {
    this.input.btnUse = v;
  }

  useInv(i: number) {
    if (!this.state) return;
    if (this.state.openChest) {
      storeInChest(this.state, i);
    } else {
      useItem(this.state, i);
    }
    this.syncHud();
  }

  dropInv(i: number) {
    if (!this.state) return;
    dropItem(this.state, i);
    this.syncHud();
  }

  takeContainer(i: number) {
    if (!this.state) return;
    takeFromChest(this.state, i);
    this.syncHud();
  }

  storeContainer(i: number) {
    if (!this.state) return;
    storeInChest(this.state, i);
    this.syncHud();
  }

  closeLoot() {
    if (!this.state) return;
    closeContainer(this.state);
    this.syncHud();
  }

  craftId(id: string) {
    if (!this.state) return;
    const r = RECIPES.find((x) => x.id === id);
    if (!r) return;
    if (r.station === "bench" && !this.state.atBench) return;
    if (craft(this.state.player.inv, r)) {
      this.audio.craft();
      this.state.toast = `Crafted ${r.out}`;
      this.state.toastT = 2;
      this.syncHud();
    }
  }

  resize = () => {
    const parent = this.canvas.parentElement ?? this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private frame = (now: number) => {
    if (!this.running || this.paused) return;
    const raw = Math.min(MAX_FRAME_DT, (now - this.last) / 1000);
    this.last = now;
    this.acc += raw;
    const a = this.input.poll();
    a.aimX = this.cam.x + this.input.pointerX / this.cam.scale;
    a.aimY = this.cam.y + this.input.pointerY / this.cam.scale;
    const hud = useHud.getState();
    if (a.justPause) {
      if (this.state?.openChest) {
        closeContainer(this.state);
        this.syncHud();
        return;
      }
      if (hud.invOpen) {
        hud.set({ invOpen: false, craftOpen: false });
        return;
      }
      this.pauseToggle();
      return;
    }
    if (a.justInv && this.state && hud.screen === "play") {
      if (this.state.openChest) {
        closeContainer(this.state);
        this.syncHud();
      } else {
        hud.set({ invOpen: !hud.invOpen, craftOpen: false });
      }
    }
    if (this.state?.openChest && a.justUse) {
      closeContainer(this.state);
      this.syncHud();
    }

    while (this.acc >= FIXED_DT) {
      if (this.state && hud.screen === "play" && !hud.invOpen && !this.state.openChest) {
        const prevHp = this.state.player.hp;
        stepSim(this.state, a, FIXED_DT);
        stepParticles(this.state, FIXED_DT);
        if (this.state.player.hp < prevHp) this.audio.hurt();
        if (this.state.player.attackT > 0.4) this.audio.swing();
        if (this.state.dead) useHud.getState().set({ screen: "dead" });
        if (this.state.turned) useHud.getState().set({ screen: "turned" });
        if (this.state.openChest) this.syncHud();
      }
      this.acc -= FIXED_DT;
    }

    this.hudT += raw;
    this.saveT += raw;
    if (this.hudT > 0.1) {
      this.hudT = 0;
      this.syncHud();
    }
    if (this.saveT > 8) {
      this.saveT = 0;
      this.save();
    }

    this.draw();
    requestAnimationFrame(this.frame);
  };

  private draw() {
    if (!this.state || !this.assets) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const vw = this.canvas.width / dpr;
    const vh = this.canvas.height / dpr;
    const target = cameraFor(this.state, vw, vh);
    this.cam.x += (target.x - this.cam.x) * 0.12;
    this.cam.y += (target.y - this.cam.y) * 0.12;
    this.cam.scale = target.scale;
    drawFrame(this.ctx, this.state, this.assets, this.cam, vw, vh);
    if (this.mini) {
      const m = this.mini.getContext("2d");
      if (m) {
        m.imageSmoothingEnabled = false;
        drawMinimap(m, this.state, 0, 0, this.mini.width, this.mini.height);
      }
    }
  }

  save() {
    if (!this.state) return;
    writeSave(snapshotSave(this.state));
  }

  private syncHud() {
    if (!this.state) return;
    const p = this.state.player;
    const b = this.state.interior
      ? this.state.world.buildings.find((x) => x.id === this.state!.interior!.buildingId)
      : null;
    const car = currentCar(this.state);
    useHud.getState().set({
      hp: p.hp,
      maxHp: p.maxHp,
      infection: p.infection,
      location: this.state.interior
        ? (b ? `${b.name} — interior` : "Inside")
        : locationName(this.state.world, p.x, p.y),
      hint: this.state.hint,
      weapon: p.weapon,
      armor: p.armor,
      inv: p.inv.map((s) => ({ ...s })),
      atBench: this.state.atBench,
      claimedHere: !!(b && this.state.claimed.has(b.id)),
      inside: !!this.state.interior,
      buildingName: b?.name ?? "",
      toast: this.state.toast,
      time: this.state.time,
      inCar: this.state.carId != null,
      gas: car?.gas ?? 0,
      gasMax: CAR_GAS,
      containerId: this.state.openChest,
      containerName: this.state.chestLabel,
      containerSlots: this.state.openChest
        ? (this.state.chests[this.state.openChest] ?? []).map((s) => ({ ...s }))
        : [],
    });
  }

  private wireControlsTest() {
    window.__controlsTest = {
      getYaw: () => {
        const s = this.state;
        if (!s || s.carId == null) return 0;
        return currentCar(s)?.ang ?? 0;
      },
      getSpeed: () => {
        const s = this.state;
        if (s?.carId != null) return s.player.moving ? 1 : 0;
        const a = this.input.actions;
        return Math.hypot(a.moveX, a.moveY);
      },
      getPos: () =>
        this.state ? { x: this.state.player.x, y: this.state.player.y } : { x: 0, y: 0 },
      setKeys: (codes: string[]) => this.input.setKeys(codes),
    };
    window.__ferrum = {
      start: () => this.start(),
      pause: () => this.pauseToggle(),
      inspect: () => {
        const s = this.state;
        if (!s) return null;
        const benches = s.interior?.furniture.filter((f) => f.kind === "bench").map((f) => f.label) ?? [];
        return {
          x: s.player.x,
          y: s.player.y,
          interior: s.interior?.buildingId ?? null,
          atBench: s.atBench,
          carId: s.carId,
          cars: s.world.cars.length,
          locked: s.world.buildings.filter((b) => b.locked).length,
          houses: s.world.buildings.filter((b) => b.kind === "house" || b.kind === "ranch").length,
          indoorZ: s.world.zombies.filter((z) => z.inside).length,
          indoorHouses: new Set(s.world.zombies.filter((z) => z.inside).map((z) => z.inside)).size,
          clinicLocked: s.world.buildings.find((b) => b.id === "clinic")?.locked ?? null,
          furn: s.interior?.furniture.map((f) => `${f.kind}:${f.look ?? ""}:${f.label}`) ?? [],
          benches,
          hint: s.hint,
          openChest: s.openChest,
          chestLabel: s.chestLabel,
          drops: s.drops.length,
          opaque: s.world.opaque.length,
          walls: s.interior ? s.interior.blocked.reduce((n, v) => n + v, 0) : 0,
        };
      },
    };
  }
}
