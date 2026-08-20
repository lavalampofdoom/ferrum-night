import { createFileRoute } from "@tanstack/react-router";
import { GuidePage } from "@/components/guide-page";

type GuideSearch = { q?: string };

export const Route = createFileRoute("/guide")({
  validateSearch: (s: Record<string, unknown>): GuideSearch => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  head: () => ({
    meta: [
      {
        title: "Ferrum Night field guide — places, loot, controls",
      },
      {
        name: "description",
        content:
          "Searchable field guide for Ferrum Night: Ferrum College, Tri-Area clinic, VA-40, Rocky Mount courthouse, KFC, Lowe's, crafting, and keyboard controls.",
      },
    ],
  }),
  component: GuidePage,
});
