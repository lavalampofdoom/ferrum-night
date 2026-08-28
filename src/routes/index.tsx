import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing-page";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ferrum Night — free zombie survival in Ferrum, Virginia" },
      {
        name: "description",
        content:
          "Play Ferrum Night free in any browser. Top-down zombie survival on a geographically exact replica of Ferrum, Virginia. Searchable map, loot, and crafting.",
      },
      {
        name: "keywords",
        content:
          "Ferrum Night, Ferrum Virginia, Franklin County, Ferrum College, zombie survival, free browser game, VA-40, play online",
      },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: LandingPage,
});
