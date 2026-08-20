"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-6 text-fg">
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-surface p-6 ring-1 ring-border">
        <p className="font-display text-xs tracking-[0.2em] text-muted">FERRUM NIGHT</p>
        <h1 className="font-display text-2xl">Sign in</h1>
        <p className="text-sm text-muted">Keep a survivor identity. The road still saves on this device.</p>
        {authEnabled ? (
          GROK_PROVIDERS.map((p) => (
            <button
              key={p.providerId}
              type="button"
              onClick={() => signIn(p.providerId, { callbackURL: "/play" })}
              className="w-full rounded-xl bg-accent px-4 py-3 text-sm text-accent-fg"
            >
              Continue with {p.label}
            </button>
          ))
        ) : (
          <p className="text-sm text-muted">Sign-in is disabled.</p>
        )}
        <Link to="/play" className="block text-center text-sm text-muted">
          Back to the road
        </Link>
      </div>
    </main>
  );
}
