import type { MetadataRoute } from "next";
import { demoArticles } from "@/lib/demo-data";
import glossaryData from "@/../data/glossary.json";
import substancesData from "@/../data/substances.json";

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

  const articleRoutes: MetadataRoute.Sitemap = demoArticles
    .filter((a) => a.status === "published")
    .map((article) => ({
      url: `${BASE_URL}/articles/${article.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const glossaryRoutes: MetadataRoute.Sitemap = glossaryData.map((entry) => ({
    url: `${BASE_URL}/glossary/${entry.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const substanceRoutes: MetadataRoute.Sitemap = substancesData.map((s) => ({
    url: `${BASE_URL}/articles/${s.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticRoutes, ...articleRoutes, ...glossaryRoutes, ...substanceRoutes];
}
