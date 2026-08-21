"use client";

import { Link } from "@tanstack/react-router";
import { SiteSearch } from "@/components/site-search";

export function SiteNav({ solid = false }: { solid?: boolean }) {
  return (
    <header
      className={
        solid
          ? "sticky top-0 z-30 border-b border-border bg-bg/95"
          : "absolute inset-x-0 top-0 z-30"
      }
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="font-display text-lg tracking-tight text-fg">
          Ferrum Night
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <SiteSearch />
          <Link
            to="/guide"
            className="hidden h-11 items-center rounded-md px-3 text-sm text-muted hover:text-fg sm:flex"
          >
            Guide
          </Link>
          <Link
            to="/play"
            className="flex h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg"
          >
            Play
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Ferrum Night · free in any browser · Ferrum to Rocky Mount, Virginia
          <span className="mt-1 block text-xs text-faint">
            Roads and buildings from{" "}
            <a className="underline decoration-border hover:text-fg" href="https://www.openstreetmap.org/copyright">
              OpenStreetMap
            </a>
          </span>
        </p>
        <nav className="flex gap-4">
          <Link to="/play" className="hover:text-fg">
            Play
          </Link>
          <Link to="/guide" className="hover:text-fg">
            Guide
          </Link>
          <a
            href="https://github.com/lavalampofdoom/ferrum-night"
            className="hover:text-fg"
          >
            Source
          </a>
        </nav>
      </div>
    </footer>
  );
}
