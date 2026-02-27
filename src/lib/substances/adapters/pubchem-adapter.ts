/**
 * PubChem Source Adapter.
 * Fetches chemical identifiers from PubChem PUG REST API.
 */
import type { SourceAdapter, RawSourceSubstance } from "./index";
import { fetchPubChemByCid, fetchPubChemByName } from "@/lib/connectors/pubchem";

function toRaw(
  data: NonNullable<Awaited<ReturnType<typeof fetchPubChemByCid>>>,
): RawSourceSubstance {
  return {
    sourceId: "pubchem",
    sourceUrl: data.sourceUrl,
    retrievedAt: data.retrievedAt,
    name: data.iupacName || String(data.cid),
    aliases: data.synonyms,
    canonicalId: data.inchiKey,
    inchiKey: data.inchiKey,
    inchi: data.inchi,
    smiles: data.isomericSmiles || data.canonicalSmiles,
    molecularFormula: data.molecularFormula,
    pubchemCid: data.cid,
    summary: data.description,
    iupacName: data.iupacName,
    hasDescription: Boolean(data.description),
    hasChem: Boolean(data.molecularFormula || data.inchiKey),
  };
}

export const pubchemAdapter: SourceAdapter = {
  id: "pubchem",
  label: "PubChem",
  enabled: true,
  supportsSearch: true,
  supportsBulk: false,

  async search(query: string): Promise<RawSourceSubstance[]> {
    const data = await fetchPubChemByName(query);
    if (!data) return [];
    return [toRaw(data)];
  },

  async fetchById(id: string): Promise<RawSourceSubstance | null> {
    const cid = parseInt(id, 10);
    if (isNaN(cid)) return null;
    const data = await fetchPubChemByCid(cid);
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
