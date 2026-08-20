import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ferrum Night — free zombie survival in Ferrum, Virginia" },
      {
        name: "description",
        content:
          "Play Ferrum Night free in any browser. Top-down zombie survival from Ferrum College and 180 Ferrum Mountain Road along VA-40 to Rocky Mount, Franklin County, Virginia. Searchable map, loot, and crafting.",
      },
      {
        name: "keywords",
        content:
          "Ferrum Night, Ferrum Virginia, Rocky Mount VA, Franklin County, Ferrum College, zombie survival, free browser game, VA-40, Fairy Stone, play online",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: LandingPage,
});
