import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Outlet, RouterProvider, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { AppErrorComponent } from "@/lib/error-component";
import { LandingPage } from "@/components/landing-page";
import { GuidePage } from "@/components/guide-page";
import { GameApp } from "@/components/game-app";
import { PlayLock } from "@/components/play-lock";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import "@/styles.css";

const rootRoute = createRootRoute({
  component: () => (
    <AuthProvider>
      <PreviewHostBridge />
      <Outlet />
    </AuthProvider>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

function Play() {
  return (
    <>
      <PlayLock />
      <GameApp />
    </>
  );
}

const playRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/play",
  component: Play,
});

const guideRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guide",
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  component: GuidePage,
});

const routeTree = rootRoute.addChildren([indexRoute, playRoute, guideRoute]);

const rawBase = import.meta.env.BASE_URL || "/";
const basepath = rawBase === "/" ? undefined : rawBase.replace(/\/$/, "");

const router = createRouter({
  routeTree,
  basepath,
  defaultErrorComponent: AppErrorComponent,
});

const el = document.getElementById("app");
if (!el) throw new Error("Missing #app");

createRoot(el).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
