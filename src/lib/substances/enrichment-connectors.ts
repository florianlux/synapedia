/**
 * Enrichment connectors: PubChem and ChEMBL API clients.
 * Uses public REST APIs (no scraping).
 */

/* ============ PubChem ============ */

export interface PubChemFacts {
  cid: number | null;
  iupacName: string;
  molecularFormula: string;
  molecularWeight: string;
  synonyms: string[];
}

const PUBCHEM_BASE = "https://pubchem.ncbi.nlm.nih.gov/rest/pug";

/**
 * Fetch basic compound facts from PubChem by name.
 * Returns null if not found or on error (non-throwing).
 */
export async function fetchPubChemFacts(name: string): Promise<PubChemFacts | null> {
  try {
    // Get CID by name
    const cidUrl = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(name)}/cids/JSON`;
    const cidRes = await fetch(cidUrl, { signal: AbortSignal.timeout(10_000) });
    if (!cidRes.ok) return null;

    const cidData = await cidRes.json() as { IdentifierList?: { CID?: number[] } };
    const cid = cidData?.IdentifierList?.CID?.[0];
    if (!cid) return null;

    // Get compound properties
    const propsUrl = `${PUBCHEM_BASE}/compound/cid/${cid}/property/IUPACName,MolecularFormula,MolecularWeight/JSON`;
    const propsRes = await fetch(propsUrl, { signal: AbortSignal.timeout(10_000) });
    const propsData = propsRes.ok
      ? (await propsRes.json() as { PropertyTable?: { Properties?: Array<{
          IUPACName?: string;
          MolecularFormula?: string;
          MolecularWeight?: number;
        }> } })
      : null;
    const props = propsData?.PropertyTable?.Properties?.[0];

    // Get synonyms (limit to 10)
    const synUrl = `${PUBCHEM_BASE}/compound/cid/${cid}/synonyms/JSON`;
    const synRes = await fetch(synUrl, { signal: AbortSignal.timeout(10_000) });
    const synData = synRes.ok
      ? (await synRes.json() as { InformationList?: { Information?: Array<{ Synonym?: string[] }> } })
      : null;
    const allSynonyms = synData?.InformationList?.Information?.[0]?.Synonym ?? [];

    return {
      cid,
      iupacName: props?.IUPACName ?? "",
      molecularFormula: props?.MolecularFormula ?? "",
      molecularWeight: props?.MolecularWeight?.toString() ?? "",
      synonyms: allSynonyms.slice(0, 10),
    };
  } catch (err) {
    console.error(`[PubChem] Error fetching ${name}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/* ============ ChEMBL ============ */

export interface ChEMBLTarget {
  targetName: string;
  targetType: string;
  organism: string;
  action: string;
}

export interface ChEMBLResult {
  chemblId: string;
  prefName: string;
  targets: ChEMBLTarget[];
}

const CHEMBL_BASE = "https://www.ebi.ac.uk/chembl/api/data";

/**
 * Search ChEMBL for a molecule by name and retrieve its known targets.
 * Returns null if not found or on error (non-throwing).
 */
export async function fetchChEMBLTargets(name: string): Promise<ChEMBLResult | null> {
  try {
    // Search for the molecule
    const searchUrl = `${CHEMBL_BASE}/molecule/search.json?q=${encodeURIComponent(name)}&limit=1`;
    const searchRes = await fetch(searchUrl, {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "application/json" },
    });
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json() as {
      molecules?: Array<{
        molecule_chembl_id?: string;
        pref_name?: string;
      }>;
    };
    const molecule = searchData?.molecules?.[0];
    if (!molecule?.molecule_chembl_id) return null;

    const chemblId = molecule.molecule_chembl_id;

    // Get mechanism of action / targets
    const mechUrl = `${CHEMBL_BASE}/mechanism.json?molecule_chembl_id=${chemblId}&limit=20`;
    const mechRes = await fetch(mechUrl, {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "application/json" },
    });

    const targets: ChEMBLTarget[] = [];

    if (mechRes.ok) {
      const mechData = await mechRes.json() as {
        mechanisms?: Array<{
          target_chembl_id?: string;
          mechanism_of_action?: string;
          action_type?: string;
        }>;
      };

      for (const mech of mechData?.mechanisms ?? []) {
        if (mech.target_chembl_id) {
          // Fetch target details
          const targetUrl = `${CHEMBL_BASE}/target/${mech.target_chembl_id}.json`;
          const targetRes = await fetch(targetUrl, {
            signal: AbortSignal.timeout(10_000),
            headers: { Accept: "application/json" },
          });

          if (targetRes.ok) {
            const targetData = await targetRes.json() as {
              pref_name?: string;
              target_type?: string;
              organism?: string;
            };
            targets.push({
              targetName: targetData?.pref_name ?? mech.mechanism_of_action ?? "Unknown",
              targetType: targetData?.target_type ?? "",
              organism: targetData?.organism ?? "",
              action: mech.action_type ?? "",
            });
          }
        }
      }
    }

    return {
      chemblId,
      prefName: molecule.pref_name ?? name,
      targets,
    };
  } catch (err) {
    console.error(`[ChEMBL] Error fetching ${name}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/* ============ Wikidata Category Seeds ============ */

export interface WikidataSubstance {
  name: string;
  wikidataId: string;
}

const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";

/**
 * Fetch substances from a Wikidata category using SPARQL.
 * categoryId should be like "Q21174726" (psychoactive drugs) etc.
 */
export async function fetchWikidataCategory(categoryId: string, limit = 100): Promise<WikidataSubstance[]> {
  const query = `
SELECT ?item ?itemLabel WHERE {
  ?item wdt:P31/wdt:P279* wd:${categoryId} .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de" . }
}
LIMIT ${limit}
  `.trim();

  try {
    const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(query)}&format=json`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
      headers: { Accept: "application/json", "User-Agent": "Synapedia/1.0" },
    });
    if (!res.ok) return [];

    const data = await res.json() as {
      results?: {
        bindings?: Array<{
          item?: { value?: string };
          itemLabel?: { value?: string };
        }>;
      };
    };

    return (data?.results?.bindings ?? [])
      .filter((b) => b.itemLabel?.value && b.item?.value)
      .map((b) => ({
        name: b.itemLabel!.value!,
        wikidataId: b.item!.value!.replace("http://www.wikidata.org/entity/", ""),
      }));
  } catch (err) {
    console.error(`[Wikidata] Error fetching category ${categoryId}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Look up a substance name via PubChem to verify it exists.
 * Returns the CID if found, null otherwise. Useful for "Fetch from Source" validation.
 */
export async function verifyPubChemName(name: string): Promise<number | null> {
  try {
    const url = `${PUBCHEM_BASE}/compound/name/${encodeURIComponent(name)}/cids/JSON`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const data = await res.json() as { IdentifierList?: { CID?: number[] } };
    return data?.IdentifierList?.CID?.[0] ?? null;
  } catch {
    return null;
  }
}
