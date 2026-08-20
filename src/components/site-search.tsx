"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { searchCatalog, type SearchHit } from "@/game/catalog";

const KIND_LABEL: Record<SearchHit["kind"], string> = {
  page: "Page",
  place: "Place",
  item: "Item",
  craft: "Craft",
  help: "Help",
};

export function SiteSearch({
  variant = "nav",
  autoFocus = false,
}: {
  variant?: "nav" | "hero";
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (variant === "hero") {
    return (
      <>
        <HeroField onOpen={() => setOpen(true)} autoFocus={autoFocus} />
        {open ? <Palette q={q} setQ={setQ} onClose={() => setOpen(false)} /> : null}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 min-w-11 items-center gap-2 rounded-md bg-raised px-3 text-sm text-muted ring-1 ring-border hover:text-fg"
        aria-label="Search Ferrum Night"
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded-xs bg-bg px-1.5 font-mono text-[0.6875rem] text-faint sm:inline">
          ⌘K
        </kbd>
      </button>
      {open ? <Palette q={q} setQ={setQ} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function HeroField({ onOpen, autoFocus }: { onOpen: () => void; autoFocus: boolean }) {
  return (
    <button
      type="button"
      autoFocus={autoFocus}
      onClick={onOpen}
      className="flex h-12 w-full items-center gap-3 rounded-lg bg-raised px-4 text-left text-sm text-muted ring-1 ring-border hover:text-fg"
    >
      <Search className="size-4 shrink-0" />
      <span>Search places, items, crafting, controls</span>
    </button>
  );
}

function Palette({
  q,
  setQ,
  onClose,
}: {
  q: string;
  setQ: (v: string) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const hits = useMemo(() => searchCatalog(q), [q]);
  const inputId = useId();

  const go = (href: string) => {
    const url = new URL(href, "https://local.invalid");
    const path = url.pathname as "/play" | "/guide" | "/";
    const query = url.searchParams.get("q") ?? "";
    onClose();
    if (path === "/guide") {
      void navigate({ to: "/guide", search: { q: query } });
    } else if (path === "/play") {
      void navigate({ to: "/play" });
    } else {
      void navigate({ to: "/" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-start bg-bg/80 p-3 pt-[12vh] sm:p-6 sm:pt-[16vh]">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close search" onClick={onClose} />
      <Command
        className="relative z-10 mx-auto w-full max-w-lg overflow-hidden rounded-xl bg-surface ring-1 ring-border"
        shouldFilter={false}
        loop
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 text-muted" />
          <Command.Input
            autoFocus
            id={inputId}
            value={q}
            onValueChange={setQ}
            placeholder="Ferrum College, antibiotics, VA-40…"
            className="h-12 w-full bg-transparent text-sm text-fg outline-none placeholder:text-faint"
          />
        </div>
        <Command.List className="max-h-[min(24rem,50vh)] overflow-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
            Nothing on this road matches.
          </Command.Empty>
          {hits.map((h) => (
            <Command.Item
              key={h.id}
              value={`${h.id} ${h.title}`}
              onSelect={() => go(h.href)}
              className="flex cursor-pointer flex-col gap-0.5 rounded-md px-3 py-2 data-[selected=true]:bg-raised"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-fg">{h.title}</span>
                <span className="font-mono text-[0.6875rem] uppercase tracking-wide text-faint">
                  {KIND_LABEL[h.kind]}
                </span>
              </span>
              <span className="text-xs leading-snug text-muted">{h.blurb}</span>
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
