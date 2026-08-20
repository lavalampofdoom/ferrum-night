import { copyFileSync, writeFileSync } from "node:fs";

const origin = "https://lavalampofdoom.github.io/ferrum-night";

copyFileSync("dist-pages/index.html", "dist-pages/404.html");
writeFileSync("dist-pages/.nojekyll", "");
writeFileSync(
  "dist-pages/robots.txt",
  `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
);
writeFileSync(
  "dist-pages/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>${origin}/play</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>${origin}/guide</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
</urlset>
`,
);
