"use client";

import { createFileRoute } from "@tanstack/react-router";
import { GameApp } from "@/components/game-app";
import { PlayLock } from "@/components/play-lock";

export const Route = createFileRoute("/play")({
  head: () => ({
    meta: [
      { title: "Play Ferrum Night — Ferrum, VA" },
      {
        name: "description",
        content:
          "Play Ferrum Night in your browser. WASD to walk, E to search, Space to fight. Starts at Tri-Area Community Health on Ferrum Mountain Road.",
      },
    ],
  }),
  component: Play,
});

function Play() {
  return (
    <>
      <PlayLock />
      <GameApp />
    </>
  );
}
