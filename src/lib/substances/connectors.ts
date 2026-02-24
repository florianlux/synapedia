/**
 * Source connectors for substance data collection.
 * ToS-safe: Only store URLs + minimal metadata. No aggressive scraping.
 */

import type { SubstanceSource } from "./schema";

/* ---------- Slug / Name normalization ---------- */

export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, "")     // remove parenthetical info
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/[ß]/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ---------- PsychonautWiki connector ---------- */

export function buildPsychonautWikiSource(name: string, substanceId: string): Omit<SubstanceSource, "id"> {
  return {
    substance_id: substanceId,
    source_name: `PsychonautWiki: ${name}`,
    source_url: `https://psychonautwiki.org/wiki/${encodeURIComponent(name)}`,
    source_type: "psychonautwiki",
    snippet: "",
    snippet_hash: "",
    license_note: "URL reference only. Manual review required per ToS.",
    confidence: 0.7,
  };
}

/* ---------- drugcom.de connector ---------- */

export function buildDrugcomSource(name: string, substanceId: string): Omit<SubstanceSource, "id"> {
  const slug = nameToSlug(name);
  return {
    substance_id: substanceId,
    source_name: `drugcom.de: ${name}`,
    source_url: `https://www.drugcom.de/drogenlexikon/buchstabe-${name.charAt(0).toLowerCase()}/${slug}/`,
    source_type: "drugcom",
    snippet: "",
    snippet_hash: "",
    license_note: "URL reference only. No scraping per ToS.",
    confidence: 0.8,
  };
}

/* ---------- PubMed / NCBI connector ---------- */

export function buildPubMedSource(name: string, substanceId: string): Omit<SubstanceSource, "id"> {
  return {
    substance_id: substanceId,
    source_name: `PubMed search: ${name}`,
    source_url: `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(name)}+pharmacology`,
    source_type: "pubmed",
    snippet: "",
    snippet_hash: "",
    license_note: "Search URL only. Abstracts available via NCBI E-utilities API.",
    confidence: 0.9,
  };
}

/* ---------- Reddit reference builder ---------- */

const REDDIT_SUBREDDITS = ["drugs", "researchchemicals", "nootropics", "harmreduction", "psychonaut"];

export function buildRedditSearchUrls(name: string): { subreddit: string; url: string }[] {
  return REDDIT_SUBREDDITS.map((sub) => ({
    subreddit: sub,
    url: `https://www.reddit.com/r/${sub}/search/?q=${encodeURIComponent(name)}&restrict_sr=1&sort=top&t=all`,
  }));
}

export function buildRedditSource(name: string, substanceId: string): Omit<SubstanceSource, "id"> {
  return {
    substance_id: substanceId,
    source_name: `Reddit community reports: ${name}`,
    source_url: `https://www.reddit.com/search/?q=${encodeURIComponent(name)}&type=link&sort=top`,
    source_type: "reddit",
    snippet: "",
    snippet_hash: "",
    license_note: "Community reports only. Not used as factual source. Requires Reddit OAuth API for data access.",
    confidence: 0.3,
  };
}

/* ---------- Build all source references for a substance ---------- */

export function buildAllSources(name: string, substanceId: string): Omit<SubstanceSource, "id">[] {
  return [
    buildPsychonautWikiSource(name, substanceId),
    buildDrugcomSource(name, substanceId),
    buildPubMedSource(name, substanceId),
    buildRedditSource(name, substanceId),
  ];
}
