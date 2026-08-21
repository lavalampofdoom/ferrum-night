"use client";

import { useMemo, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { ITEMS, RECIPES } from "@/game/items";
import { PLACES, searchCatalog, ZONE_LABEL } from "@/game/catalog";
import { SiteFooter, SiteNav } from "@/components/site-nav";

export function GuidePage() {
  const raw = useSearch({ strict: false }) as { q?: string };
  const initial = typeof raw.q === "string" ? raw.q : "";
  const [q, setQ] = useState(initial);
  const hits = useMemo(() => (q.trim() ? searchCatalog(q) : []), [q]);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <SiteNav solid />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className="font-display text-sm tracking-[0.2em] text-muted">FIELD GUIDE</p>
        <h1 className="mt-2 font-display text-4xl tracking-tight">Ferrum to Rocky Mount</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          Searchable notes for the free browser game Ferrum Night: OpenStreetMap roads and
          buildings across Franklin County, loot tables, crafting, and the keys that keep you
          from turning.
        </p>
        <label className="mt-6 block">
          <span className="sr-only">Search the guide</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search places, items, recipes, controls"
            className="h-12 w-full rounded-lg bg-raised px-4 text-sm text-fg ring-1 ring-border outline-none placeholder:text-faint"
          />
        </label>

        {q.trim() ? (
          <section className="mt-8">
            <h2 className="font-display text-xl">Results</h2>
            <ul className="mt-3 divide-y divide-border rounded-lg ring-1 ring-border">
              {hits.length === 0 ? (
                <li className="px-4 py-6 text-sm text-muted">No matches for “{q}”.</li>
              ) : (
                hits.map((h) => (
                  <li key={h.id} className="px-4 py-3">
                    {h.href.startsWith("/play") ? (
                      <Link to="/play" className="block">
                        <p className="text-sm text-fg">{h.title}</p>
                        <p className="text-xs leading-relaxed text-muted">{h.blurb}</p>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="block w-full text-left"
                        onClick={() => setQ(h.title)}
                      >
                        <p className="text-sm text-fg">{h.title}</p>
                        <p className="text-xs leading-relaxed text-muted">{h.blurb}</p>
                      </button>
                    )}
                  </li>
                ))
              )}
            </ul>
          </section>
        ) : null}

        <section className="mt-12" id="places">
          <h2 className="font-display text-2xl">Places</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {PLACES.map((p) => (
              <li key={p.id} id={p.id} className="rounded-lg bg-surface p-4 ring-1 ring-border">
                <p className="font-mono text-[0.6875rem] uppercase tracking-wide text-faint">
                  {ZONE_LABEL[p.zone]}
                </p>
                <h3 className="mt-1 font-display text-lg">{p.name}</h3>
                <p className="text-xs text-muted">{p.address}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{p.blurb}</p>
                <p className="mt-2 text-xs text-faint">Loot · {p.loot}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12" id="gear">
          <h2 className="font-display text-2xl">Gear</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {Object.values(ITEMS)
              .filter((it) => it.id !== "pistol" && it.id !== "shotgun" && it.id !== "bullets" && it.id !== "shells")
              .map((it) => (
              <li key={it.id} id={it.id} className="rounded-md bg-surface px-4 py-3 ring-1 ring-border">
                <p className="text-sm text-fg">{it.name}</p>
                <p className="font-mono text-[0.6875rem] uppercase text-faint">{it.kind}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-12" id="firearms">
          <h2 className="font-display text-2xl">Firearms</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            A baseball bat still drops a walker in two to four swings. Guns are loot — civic offices,
            Lowe's, and campus hide the rare ones. Craft matching ammo at a bench. Paintball
            markers never kill at range; they stain and stun. Jam the marker into a walker to hurt them.
          </p>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            <Row k="9mm / 1911" v="Sidearms. 9mm is common in houses; the .45 hits harder." />
            <Row k="12ga / 20ga" v="Pump for reach. Sawed-off 20 gauge is a room broom." />
            <Row k="AR-15 / 7.62" v="5.56 with a holo for volume. Bolt 7.62 for the long shot — and the bear." />
            <Row k="Bow / paintball" v="Bow is silent. Paintball is nonlethal unless you are standing on them." />
          </dl>
        </section>

        <section className="mt-12" id="wildlife">
          <h2 className="font-display text-2xl">Wildlife</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Franklin County is still a county. Does keep their fawns close. Bucks walk alone. Turkeys
            move in packs. Squirrels streak on and off the screen. A sow and two cubs work the western
            woods toward Fairy Stone — they kill on contact, walkers and deer included. Give them the road.
          </p>
        </section>

        <section className="mt-12" id="craft">
          <h2 className="font-display text-2xl">Crafting</h2>
          <ul className="mt-4 space-y-2">
            {RECIPES.map((r) => {
              const need = Object.entries(r.needs)
                .map(([id, n]) => `${n} ${ITEMS[id]?.name ?? id}`)
                .join(", ");
              return (
                <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-md bg-surface px-4 py-3 ring-1 ring-border">
                  <span className="text-sm">
                    {ITEMS[r.out]?.name ?? r.out}
                    <span className="ml-2 text-xs text-muted">{need}</span>
                  </span>
                  <span className="font-mono text-[0.6875rem] uppercase text-faint">
                    {r.station === "bench" ? "bench" : "hand"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-12" id="controls">
          <h2 className="font-display text-2xl">Controls</h2>
          <dl className="mt-4 grid gap-2 sm:grid-cols-2">
            <Row k="WASD" v="Walk. Shift sprints. Faster on asphalt, slower in woods and crops." />
            <Row k="E" v="Enter, search, sleep, claim, use a bench." />
            <Row k="Space" v="Melee or fire. Bat drops a walker in 2–4 hits. Guns need matching ammo." />
            <Row k="I" v="Open the pack and craft." />
            <Row k="Touch" v="Left pad to move. Use / attack on the right." />
            <Row k="Ground" v="Roads are quick and marked. Forest and tall grass drag. Water and walls stop you. Tree trunks are solid." />
            <Row k="Walkers" v="Normal bites take seven hits to drop you. Rare brutes take two. Keep a bat or a door between you." />
            <Row k="Fever" v="Bites infect. Antibiotics at the clinic stop the turn." />
          </dl>
          <Link
            to="/play"
            className="mt-8 inline-flex h-12 items-center rounded-lg bg-accent px-5 font-display text-sm text-accent-fg"
          >
            Play Ferrum Night
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-surface px-4 py-3 ring-1 ring-border">
      <dt className="font-mono text-xs text-faint">{k}</dt>
      <dd className="mt-1 text-sm text-muted">{v}</dd>
    </div>
  );
}
