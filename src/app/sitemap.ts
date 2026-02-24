import type { MetadataRoute } from "next";
import { demoArticles } from "@/lib/demo-data";
import glossaryData from "@/../data/glossary.json";
import { substances as substancesData } from "@/../data/substances";

const BASE_URL = "https://synapedia.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/articles`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/interactions`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/brain`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/glossary`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/compare`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/categories`, changeFrequency: "monthly", priority: 0.6 },
  ];

  const articleSlugs = new Set(
    demoArticles
      .filter((a) => a.status === "published")
      .map((a) => a.slug)
  );

  for (const s of substancesData) {
    articleSlugs.add(s.slug);
  }

  const articleRoutes: MetadataRoute.Sitemap = Array.from(articleSlugs).map(
    (slug) => ({
      url: `${BASE_URL}/articles/${slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })
  );

  const glossaryRoutes: MetadataRoute.Sitemap = glossaryData.map((entry) => ({
    url: `${BASE_URL}/glossary/${entry.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...articleRoutes, ...glossaryRoutes];
}
