"use client";

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Monitor, Search as SearchIcon } from "lucide-react";
import { JsonLd, SITE_TAGLINE, videoGameLd, CANONICAL_ORIGIN } from "@/components/json-ld";
import { SiteFooter, SiteNav } from "@/components/site-nav";
import { SiteSearch } from "@/components/site-search";
import { PLACES, ZONE_LABEL } from "@/game/catalog";
import { publicUrl } from "@/lib/public-url";

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <JsonLd data={videoGameLd(CANONICAL_ORIGIN)} />
      <SiteNav />
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{ backgroundImage: `url(${publicUrl("/og.jpg")})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/75 to-bg/40" />
        <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
          <p className="font-display text-sm tracking-[0.2em] text-muted">FRANKLIN COUNTY, VIRGINIA</p>
          <h1 className="mt-3 max-w-xl font-display text-5xl leading-none tracking-tight sm:text-6xl">
            Ferrum
            <br />
            Night
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted">{SITE_TAGLINE}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/play"
              className="flex h-12 items-center rounded-lg bg-accent px-5 font-display text-sm text-accent-fg"
            >
              Play in the browser
            </Link>
            <Link
              to="/guide"
              className="flex h-12 items-center rounded-lg px-5 text-sm text-muted ring-1 ring-border hover:text-fg"
            >
              Field guide
            </Link>
          </div>
          <div className="mt-8 max-w-lg">
            <SiteSearch variant="hero" />
            <p className="mt-2 text-xs text-faint">Search the map, loot, and controls. Works on any computer.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <Fact
          icon={<Monitor className="size-4" />}
          title="Any computer"
          body="Chrome, Safari, Firefox, Edge. Keyboard or touch. Nothing to install."
        />
        <Fact
          icon={<MapPin className="size-4" />}
          title="Real road"
          body="Ferrum College, VA-40, Fairy Stone Park Road, the Rocky Mount courthouse square."
        />
        <Fact
          icon={<SearchIcon className="size-4" />}
          title="Searchable"
          body="Places, items, and recipes. Press ⌘K or open the guide and type."
        />
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl">Franklin County</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
              A compressed stretch of real pavement: Maggodee Creek west, US-220 through Rocky Mount,
              the walk from 180 Ferrum Mountain Road to Main Street.
            </p>
          </div>
          <Link to="/guide" className="hidden text-sm text-muted hover:text-fg sm:inline">
            All places
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {PLACES.filter((p) => p.loot !== "Road" && p.loot !== "Town traffic" && p.loot !== "Wood, rural houses").map(
            (p) => (
              <li key={p.id}>
                <Link
                  to="/guide"
                  search={{ q: p.name }}
                  className="block rounded-lg bg-surface p-4 ring-1 ring-border hover:bg-raised"
                >
                  <p className="font-mono text-[0.6875rem] uppercase tracking-wide text-faint">
                    {ZONE_LABEL[p.zone]}
                  </p>
                  <h3 className="mt-1 font-display text-lg leading-snug">{p.name}</h3>
                  <p className="mt-1 text-xs text-muted">{p.address}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{p.blurb}</p>
                </Link>
              </li>
            ),
          )}
        </ul>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl">How to last the night</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            <Step n="1" title="Clear the clinic">
              Search Tri-Area Community Health for antibiotics. Claim it if you need a bed.
            </Step>
            <Step n="2" title="Walk VA-40">
              East on Franklin Street toward Rocky Mount. West on Fairy Stone for wood and quiet houses.
            </Step>
            <Step n="3" title="Kit up in town">
              Lowe's for scrap. Marketplace for food. Craft a jacket before the square gets loud.
            </Step>
          </ol>
          <Link
            to="/play"
            className="mt-8 inline-flex h-12 items-center rounded-lg bg-accent px-5 font-display text-sm text-accent-fg"
          >
            Start at 180 Ferrum Mountain Road
          </Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function Fact({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg bg-surface p-4 ring-1 ring-border">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <h2 className="font-display text-base text-fg">{title}</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <li className="rounded-lg bg-surface p-4 ring-1 ring-border">
      <p className="font-mono text-xs text-faint">{n}</p>
      <h3 className="mt-1 font-display text-lg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
    </li>
  );
}
