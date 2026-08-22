export type Actions = {
  moveX: number;
  moveY: number;
  attack: boolean;
  use: boolean;
  sprint: boolean;
  inv: boolean;
  pause: boolean;
  justAttack: boolean;
  justUse: boolean;
  justInv: boolean;
  justPause: boolean;
  aimX: number;
  aimY: number;
  aimOn: boolean;
};

const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "KeyE",
  "KeyF",
  "ShiftLeft",
  "ShiftRight",
  "KeyI",
  "Tab",
  "Escape",
  "KeyC",
]);

export class Input {
  keys = new Set<string>();
  injected = new Set<string>();
  pointerX = 0;
  pointerY = 0;
  pointerDown = false;
  pointerLive = false;
  stickX = 0;
  stickY = 0;
  btnAttack = false;
  btnUse = false;
  private prevAttack = false;
  private prevUse = false;
  private prevInv = false;
  private prevPause = false;
  actions: Actions = emptyActions();

  attach(el: HTMLElement) {
    const kd = (e: KeyboardEvent) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      this.keys.add(e.code);
    };
    const ku = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };
    const blur = () => this.keys.clear();
    const pm = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      this.pointerX = e.clientX - r.left;
      this.pointerY = e.clientY - r.top;
      this.pointerLive = true;
    };
    const pd = (e: PointerEvent) => {
      if (e.button === 0) this.pointerDown = true;
      pm(e);
    };
    const pu = (e: PointerEvent) => {
      if (e.button === 0) this.pointerDown = false;
    };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", blur);
    el.addEventListener("pointermove", pm);
    el.addEventListener("pointerdown", pd);
    window.addEventListener("pointerup", pu);
    window.addEventListener("pointercancel", pu);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", blur);
      el.removeEventListener("pointermove", pm);
      el.removeEventListener("pointerdown", pd);
      window.removeEventListener("pointerup", pu);
      window.removeEventListener("pointercancel", pu);
    };
  }

  poll() {
    const k = this.keys;
    const inj = this.injected;
    const has = (c: string) => k.has(c) || inj.has(c);
    let mx = 0;
    let my = 0;
    if (has("KeyA") || has("ArrowLeft")) mx -= 1;
    if (has("KeyD") || has("ArrowRight")) mx += 1;
    if (has("KeyW") || has("ArrowUp")) my -= 1;
    if (has("KeyS") || has("ArrowDown")) my += 1;
    mx += this.stickX;
    my += this.stickY;
    const mag = Math.hypot(mx, my);
    if (mag > 1) {
      mx /= mag;
      my /= mag;
    } else if (mag < 0.18) {
      mx = 0;
      my = 0;
    }
    const attack = has("Space") || this.pointerDown || this.btnAttack;
    const use = has("KeyE") || has("KeyF") || this.btnUse;
    const inv = has("KeyI") || has("Tab") || has("KeyC");
    const pause = has("Escape");
    this.actions = {
      moveX: mx,
      moveY: my,
      attack,
      use,
      sprint: has("ShiftLeft") || has("ShiftRight"),
      inv,
      pause,
      justAttack: attack && !this.prevAttack,
      justUse: use && !this.prevUse,
      justInv: inv && !this.prevInv,
      justPause: pause && !this.prevPause,
      aimX: 0,
      aimY: 0,
      aimOn: this.pointerLive,
    };
    this.prevAttack = attack;
    this.prevUse = use;
    this.prevInv = inv;
    this.prevPause = pause;
    return this.actions;
  }

  setKeys(codes: string[]) {
    this.injected = new Set(codes);
  }
}

function emptyActions(): Actions {
  return {
    moveX: 0,
    moveY: 0,
    attack: false,
    use: false,
    sprint: false,
    inv: false,
    pause: false,
    justAttack: false,
    justUse: false,
    justInv: false,
    justPause: false,
    aimX: 0,
    aimY: 0,
    aimOn: false,
  };
}

export function radialDeadzone(x: number, y: number, dz = 0.18): { x: number; y: number } {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}
