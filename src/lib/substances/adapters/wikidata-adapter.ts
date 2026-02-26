/**
 * Wikidata Source Adapter.
 * Fetches structured substance data via Wikidata SPARQL API.
 * No HTML scraping – uses only the official Wikidata Query Service.
 */
import type { SourceAdapter, RawSourceSubstance } from "./index";
import { fetchWikidataByName, fetchWikidataByQid } from "@/lib/connectors/wikidata";

function toRaw(
  data: NonNullable<Awaited<ReturnType<typeof fetchWikidataByQid>>>,
  label?: string,
): RawSourceSubstance {
  return {
    sourceId: "wikidata",
    sourceUrl: data.sourceUrl,
    retrievedAt: data.retrievedAt,
    name: data.label ?? label ?? "",
    aliases: data.aliases,
    wikidataQid: data.wikidataId,
    canonicalId: data.inchiKey ?? data.wikidataId,
    inchiKey: data.inchiKey,
    inchi: data.inchi,
    smiles: data.smiles,
    casNumber: data.cas,
    drugClass: data.classLabels,
    summary: data.description,
    hasDescription: Boolean(data.description),
    hasChem: Boolean(data.inchiKey || data.smiles),
  };
}

export const wikidataAdapter: SourceAdapter = {
  id: "wikidata",
  label: "Wikidata",
  enabled: true,
  supportsSearch: true,
  supportsBulk: false,

  async search(query: string): Promise<RawSourceSubstance[]> {
    const data = await fetchWikidataByName(query);
    if (!data) return [];
    return [toRaw(data, query)];
  },

  async fetchById(id: string): Promise<RawSourceSubstance | null> {
    const data = await fetchWikidataByQid(id);
    if (!data) return null;
    return toRaw(data);
  },

  async fetchBulk(ids: string[]): Promise<RawSourceSubstance[]> {
    const results = await Promise.allSettled(ids.map((id) => this.fetchById(id)));
    return results
      .filter(
        (r): r is PromiseFulfilledResult<RawSourceSubstance> =>
          r.status === "fulfilled" && r.value !== null,
      )
      .map((r) => r.value);
  },
};
