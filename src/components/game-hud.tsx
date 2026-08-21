"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Pause, Backpack, Hammer, DoorOpen } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ITEMS, RECIPES, canCraft, countItem } from "@/game/items";
import { useHud } from "@/game/store";
import { isPublicPages, publicUrl } from "@/lib/public-url";

type Props = {
  ready: boolean;
  error: string | null;
  onStart: () => void;
  onNew: () => void;
  onPause: () => void;
  onUse: (i: number) => void;
  onCraft: (id: string) => void;
  onStick: (x: number, y: number) => void;
  onAttack: (v: boolean) => void;
  onAct: (v: boolean) => void;
};

export function GameHud({
  ready,
  error,
  onStart,
  onNew,
  onPause,
  onUse,
  onCraft,
  onStick,
  onAttack,
  onAct,
}: Props) {
  const hud = useHud();
  const { user, isPending } = useCurrentUserState();

  if (hud.screen === "title" || !ready) {
    return (
      <Title onStart={onStart} ready={ready} error={error} isPending={isPending} signedIn={!!user} />
    );
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="pointer-events-auto min-w-0 max-w-[70%] rounded-xl bg-bg/80 px-3 py-2 ring-1 ring-border">
            <p className="font-display text-xs tracking-wide text-muted">{hud.location}</p>
            <Bar label="Health" value={hud.hp / hud.maxHp} color="bg-health" />
            {hud.infection > 0 ? (
              <Bar label="Infection" value={hud.infection / 180} color="bg-infect" />
            ) : null}
            <p className="mt-1 font-mono text-[11px] text-faint">
              {ITEMS[hud.weapon]?.name ?? "Hands"}
              {ITEMS[hud.weapon]?.ammo
                ? ` · ${countItem(hud.inv, ITEMS[hud.weapon]!.ammo!)} ${ITEMS[ITEMS[hud.weapon]!.ammo!]?.name ?? "ammo"}`
                : ""}
              {hud.armor ? ` · ${ITEMS[hud.armor]?.name}` : ""}
            </p>
          </div>
          <div className="pointer-events-auto">
            <IconBtn onClick={onPause} label="Pause">
              <Pause className="size-4" />
            </IconBtn>
          </div>
        </div>

        <div className="absolute bottom-28 left-3 right-3 sm:bottom-6 sm:left-4 sm:right-auto sm:max-w-sm">
          {hud.hint ? (
            <p className="rounded-lg bg-bg/75 px-3 py-2 font-display text-sm text-accent ring-1 ring-border">
              {hud.hint}
              <span className="ml-2 font-sans text-xs text-muted">E / Use</span>
            </p>
          ) : null}
          {hud.toast ? (
            <p className="mt-2 rounded-lg bg-raised/90 px-3 py-2 text-sm text-fg ring-1 ring-border">
              {hud.toast}
            </p>
          ) : null}
        </div>
      </div>

      <TouchPad
        onStick={onStick}
        onAttack={onAttack}
        onAct={onAct}
        onInv={() => useHud.getState().set({ invOpen: !hud.invOpen })}
      />

      {hud.invOpen ? <Inventory onUse={onUse} onCraft={onCraft} /> : null}
      {hud.screen === "pause" ? <PauseMenu onResume={onPause} onNew={onNew} /> : null}
      {hud.screen === "dead" || hud.screen === "turned" ? (
        <EndCard turned={hud.screen === "turned"} onNew={onNew} />
      ) : null}
    </>
  );
}

function Title({
  onStart,
  ready,
  error,
  isPending,
  signedIn,
}: {
  onStart: () => void;
  ready: boolean;
  error: string | null;
  isPending: boolean;
  signedIn: boolean;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-bg">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: `url(${publicUrl("/og.jpg")})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/30" />
      <header className="relative z-10 flex items-center justify-end gap-3 p-4">
        <Link to="/" className="rounded-lg px-3 py-2 text-sm text-muted ring-1 ring-border hover:text-fg">
          Site
        </Link>
        {isPublicPages ? null : isPending ? (
          <div className="h-8 w-8 animate-pulse rounded-full bg-raised" />
        ) : (
          <>
            <SignedOut>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm text-muted ring-1 ring-border hover:text-fg"
              >
                Sign in
              </Link>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </>
        )}
      </header>
      <div className="relative z-10 mt-auto max-w-lg px-6 pb-16 sm:px-10">
        <p className="font-display text-sm tracking-[0.2em] text-muted">FRANKLIN COUNTY, VA</p>
        <h1 className="mt-2 font-display text-5xl leading-none tracking-tight text-fg sm:text-6xl">
          Ferrum
          <br />
          Night
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
          Start at 180 Ferrum Mountain Road. Scavenge the clinic, claim a quiet house, and walk
          VA-40 toward Rocky Mount. The dead are slow. The fever is not.
        </p>
        {error ? <p className="mt-3 text-sm text-health">{error}</p> : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!ready}
            onClick={onStart}
            className="rounded-xl bg-accent px-5 py-3 font-display text-sm text-accent-fg disabled:opacity-40"
          >
            {ready ? "Walk the road" : "Loading map…"}
          </button>
          <p className="self-center text-xs text-faint">
            {signedIn ? "Progress saves on this device." : "WASD · E use · Space attack"}
          </p>
        </div>
      </div>
    </div>
  );
}

function Inventory({ onUse, onCraft }: { onUse: (i: number) => void; onCraft: (id: string) => void }) {
  const hud = useHud();
  const close = () => useHud.getState().set({ invOpen: false, craftOpen: false });
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-bg/60 p-3 sm:items-center">
      <div className="max-h-[80dvh] w-full max-w-lg overflow-auto rounded-2xl bg-surface p-4 ring-1 ring-border">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg">Pack</h2>
          <button type="button" onClick={close} className="text-sm text-muted">
            Close
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {Array.from({ length: 24 }).map((_, i) => {
            const s = hud.inv[i];
            return (
              <button
                key={i}
                type="button"
                onClick={() => s && onUse(i)}
                className="flex h-16 flex-col items-center justify-center rounded-lg bg-raised text-center text-[10px] text-muted ring-1 ring-border"
              >
                {s ? (
                  <>
                    <span className="px-1 text-fg">{ITEMS[s.id]?.name}</span>
                    <span className="font-mono">{s.n}</span>
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
        <h3 className="mt-4 font-display text-sm text-muted">
          Crafting {hud.atBench ? "· bench" : "· hand"}
        </h3>
        <ul className="mt-2 space-y-1">
          {RECIPES.filter((r) => (hud.atBench ? true : r.station === "hand")).map((r) => {
            const ok = canCraft(hud.inv, r);
            const need = Object.entries(r.needs)
              .map(([id, n]) => `${n} ${ITEMS[id]?.name}`)
              .join(", ");
            return (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
                <span className="text-sm">
                  {ITEMS[r.out]?.name} <span className="text-xs text-faint">{need}</span>
                </span>
                <button
                  type="button"
                  disabled={!ok}
                  onClick={() => onCraft(r.id)}
                  className="rounded-md bg-accent px-2 py-1 text-xs text-accent-fg disabled:bg-raised disabled:text-faint"
                >
                  Craft
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function PauseMenu({ onResume, onNew }: { onResume: () => void; onNew: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-bg/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 ring-1 ring-border">
        <h2 className="font-display text-2xl">Paused</h2>
        <p className="mt-2 text-sm text-muted">WASD move · E enter/search · Space attack · I pack</p>
        <div className="mt-5 flex flex-col gap-2">
          <button type="button" onClick={onResume} className="rounded-xl bg-accent px-4 py-3 text-accent-fg">
            Resume
          </button>
          <button type="button" onClick={onNew} className="rounded-xl px-4 py-3 ring-1 ring-border">
            New run
          </button>
          {isPublicPages ? (
            <Link to="/" className="rounded-xl px-4 py-3 text-center text-sm text-muted ring-1 ring-border">
              Leave the road
            </Link>
          ) : (
            <Link to="/login" className="rounded-xl px-4 py-3 text-center text-sm text-muted ring-1 ring-border">
              Account
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function EndCard({ turned, onNew }: { turned: boolean; onNew: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-bg/80 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 ring-1 ring-border">
        <h2 className="font-display text-2xl">{turned ? "You turned" : "You went down"}</h2>
        <p className="mt-2 text-sm text-muted">
          {turned
            ? "The antibiotics never came. Ferrum Mountain Road goes quiet."
            : "The walkers closed in. Claim a house. Wear a jacket. Keep moving."}
        </p>
        <button type="button" onClick={onNew} className="mt-5 w-full rounded-xl bg-accent px-4 py-3 text-accent-fg">
          Try again
        </button>
      </div>
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-xl bg-bg/80 text-fg ring-1 ring-border"
    >
      {children}
    </button>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mt-1.5">
      <div className="mb-0.5 flex justify-between font-mono text-[10px] text-faint">
        <span>{label}</span>
        <span>{Math.max(0, Math.round(value * 100))}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-raised">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
      </div>
    </div>
  );
}

function TouchPad({
  onStick,
  onAttack,
  onAct,
  onInv,
}: {
  onStick: (x: number, y: number) => void;
  onAttack: (v: boolean) => void;
  onAct: (v: boolean) => void;
  onInv: () => void;
}) {
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-4 sm:hidden">
      <div
        className="pointer-events-auto relative size-36 touch-none rounded-full bg-raised/50 ring-1 ring-border"
        onPointerDown={(e) => {
          origin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!origin.current || origin.current.id !== e.pointerId) return;
          const dx = (e.clientX - origin.current.x) / 56;
          const dy = (e.clientY - origin.current.y) / 56;
          const m = Math.hypot(dx, dy) || 1;
          const c = Math.min(1, m);
          onStick((dx / m) * c, (dy / m) * c);
        }}
        onPointerUp={() => {
          origin.current = null;
          onStick(0, 0);
        }}
        onPointerCancel={() => {
          origin.current = null;
          onStick(0, 0);
        }}
      />
      <div className="pointer-events-auto mb-2 flex gap-2">
        <button
          type="button"
          aria-label="Pack"
          onPointerDown={onInv}
          className="grid size-12 place-items-center rounded-full bg-raised/80 ring-1 ring-border"
        >
          <Backpack className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Use"
          onPointerDown={() => onAct(true)}
          onPointerUp={() => onAct(false)}
          onPointerCancel={() => onAct(false)}
          className="grid size-14 place-items-center rounded-full bg-raised/80 ring-1 ring-border"
        >
          <DoorOpen className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Attack"
          onPointerDown={() => onAttack(true)}
          onPointerUp={() => onAttack(false)}
          onPointerCancel={() => onAttack(false)}
          className="grid size-16 place-items-center rounded-full bg-accent text-accent-fg"
        >
          <Hammer className="size-6" />
        </button>
      </div>
    </div>
  );
}
