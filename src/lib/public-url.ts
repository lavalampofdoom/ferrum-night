/** Prefix a public path with the Vite base (GitHub Pages lives under /ferrum-night/). */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const b = base.endsWith("/") ? base : `${base}/`;
  const p = path.startsWith("/") ? path.slice(1) : path;
  return `${b}${p}`;
}

export const isPublicPages = import.meta.env.VITE_PUBLIC_PAGES === "true";
