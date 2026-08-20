"use client";

import { useEffect, useRef, useState } from "react";
import { Engine } from "@/game/engine";
import { GameHud } from "@/components/game-hud";

export function GameApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas, miniRef.current);
    engineRef.current = engine;
    let dead = false;
    engine
      .init()
      .then(() => {
        if (!dead) setReady(true);
      })
      .catch((e: unknown) => {
        setErr(e instanceof Error ? e.message : "Failed to load");
      });
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    const onHide = () => {
      if (document.visibilityState === "hidden") engine.save();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      dead = true;
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onHide);
      engine.destroy();
    };
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ touchAction: "none" }}
      />
      <canvas
        ref={miniRef}
        width={148}
        height={96}
        className="pointer-events-none absolute right-4 top-20 z-10 hidden rounded-md ring-1 ring-border sm:block"
      />
      <GameHud
        ready={ready}
        error={err}
        onStart={() => engineRef.current?.start()}
        onNew={() => engineRef.current?.newGame()}
        onPause={() => engineRef.current?.pauseToggle()}
        onUse={(i) => engineRef.current?.useInv(i)}
        onCraft={(id) => engineRef.current?.craftId(id)}
        onStick={(x, y) => engineRef.current?.setStick(x, y)}
        onAttack={(v) => engineRef.current?.setAttack(v)}
        onAct={(v) => engineRef.current?.setUse(v)}
      />
    </div>
  );
}
