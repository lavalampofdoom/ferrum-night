export const CANONICAL_ORIGIN = "https://lavalampofdoom.github.io/ferrum-night";

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export const SITE_NAME = "Ferrum Night";
export const SITE_TAGLINE =
  "Free top-down zombie survival in the browser. Start at 180 Ferrum Mountain Road and walk a geographically exact replica of Ferrum, Virginia.";

export function videoGameLd(origin: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: origin,
        description: SITE_TAGLINE,
        potentialAction: {
          "@type": "SearchAction",
          target: `${origin}/guide?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "VideoGame",
        name: SITE_NAME,
        url: `${origin}/play`,
        description: SITE_TAGLINE,
        genre: ["Survival", "Action", "Zombie"],
        playMode: "SinglePlayer",
        applicationCategory: "GameApplication",
        operatingSystem: "Windows, macOS, Linux, ChromeOS, iOS, Android",
        gamePlatform: "Web Browser",
        isAccessibleForFree: true,
        inLanguage: "en",
        image: `${origin}/og.jpg`,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
      },
    ],
  };
}
