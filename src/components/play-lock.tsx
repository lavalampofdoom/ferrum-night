"use client";

import { useEffect } from "react";

/** Lock document scroll while the canvas game is up. */
export function PlayLock() {
  useEffect(() => {
    document.documentElement.classList.add("play-lock");
    return () => document.documentElement.classList.remove("play-lock");
  }, []);
  return null;
}
