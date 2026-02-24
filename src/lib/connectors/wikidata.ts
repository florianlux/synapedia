/**
 * Wikidata connector — fetches structured substance data via SPARQL.
 * No HTML scraping. Uses the public Wikidata Query Service.
 */

const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const USER_AGENT = process.env.WIKIDATA_USER_AGENT || "Synapedia/1.0 (harm-reduction lexicon)";

export interface WikidataSubstanceData {
  wikidataId: string;
  label: string;
  description: string;
  aliases: string[];
  cas?: string;
  inchi?: string;
  inchiKey?: string;
  smiles?: string;
  pubchemCid?: string;
  chemblId?: string;
  drugbankId?: string;
  classLabels: string[];
  sourceUrl: string;
  retrievedAt: string;
}

/**
 * Search Wikidata for a substance by name and return structured data.
 */
export async function fetchWikidataByName(name: string): Promise<WikidataSubstanceData | null> {
  const query = `
SELECT ?item ?itemLabel ?itemDescription ?cas ?inchi ?inchiKey ?smiles ?pubchem ?chembl ?drugbank WHERE {
  ?item rdfs:label "${escapeSparql(name)}"@en .
  ?item wdt:P31/wdt:P279* wd:Q11173 .
  OPTIONAL { ?item wdt:P231 ?cas . }
  OPTIONAL { ?item wdt:P234 ?inchi . }
  OPTIONAL { ?item wdt:P235 ?inchiKey . }
  OPTIONAL { ?item wdt:P233 ?smiles . }
  OPTIONAL { ?item wdt:P662 ?pubchem . }
  OPTIONAL { ?item wdt:P592 ?chembl . }
  OPTIONAL { ?item wdt:P715 ?drugbank . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en" . }
} LIMIT 1
  `.trim();

  const result = await sparqlQuery(query);
  const binding = result?.[0];
  if (!binding) return null;

  const qid = extractQid(binding.item?.value);
  const aliases = await fetchAliases(qid);
  const classLabels = await fetchClasses(qid);

  return {
    wikidataId: qid,
    label: binding.itemLabel?.value ?? name,
    description: binding.itemDescription?.value ?? "",
    aliases,
    cas: binding.cas?.value,
    inchi: binding.inchi?.value,
    inchiKey: binding.inchiKey?.value,
    smiles: binding.smiles?.value,
    pubchemCid: binding.pubchem?.value,
    chemblId: binding.chembl?.value,
    drugbankId: binding.drugbank?.value,
    classLabels,
    sourceUrl: `https://www.wikidata.org/wiki/${qid}`,
    retrievedAt: new Date().toISOString(),
  };
}

/**
 * Fetch substance by Wikidata QID directly.
 */
export async function fetchWikidataByQid(qid: string): Promise<WikidataSubstanceData | null> {
  // Validate QID format (must be Q followed by digits)
  if (!/^Q\d+$/.test(qid)) return null;

  const query = `
SELECT ?itemLabel ?itemDescription ?cas ?inchi ?inchiKey ?smiles ?pubchem ?chembl ?drugbank WHERE {
  BIND(wd:${escapeSparql(qid)} AS ?item)
  OPTIONAL { ?item wdt:P231 ?cas . }
  OPTIONAL { ?item wdt:P234 ?inchi . }
  OPTIONAL { ?item wdt:P235 ?inchiKey . }
  OPTIONAL { ?item wdt:P233 ?smiles . }
  OPTIONAL { ?item wdt:P662 ?pubchem . }
  OPTIONAL { ?item wdt:P592 ?chembl . }
  OPTIONAL { ?item wdt:P715 ?drugbank . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en" . }
} LIMIT 1
  `.trim();

  const result = await sparqlQuery(query);
  const binding = result?.[0];
  if (!binding) return null;

  const aliases = await fetchAliases(qid);
  const classLabels = await fetchClasses(qid);

  return {
    wikidataId: qid,
    label: binding.itemLabel?.value ?? qid,
    description: binding.itemDescription?.value ?? "",
    aliases,
    cas: binding.cas?.value,
    inchi: binding.inchi?.value,
    inchiKey: binding.inchiKey?.value,
    smiles: binding.smiles?.value,
    pubchemCid: binding.pubchem?.value,
    chemblId: binding.chembl?.value,
    drugbankId: binding.drugbank?.value,
    classLabels,
    sourceUrl: `https://www.wikidata.org/wiki/${qid}`,
    retrievedAt: new Date().toISOString(),
  };
}

/* ---- helpers ---- */

async function fetchAliases(qid: string): Promise<string[]> {
  const query = `
SELECT ?alias WHERE {
  wd:${escapeSparql(qid)} skos:altLabel ?alias .
  FILTER(LANG(?alias) IN ("en","de"))
} LIMIT 20
  `.trim();
  const result = await sparqlQuery(query);
  return (result ?? []).map((b) => b.alias?.value).filter(Boolean) as string[];
}

async function fetchClasses(qid: string): Promise<string[]> {
  const query = `
SELECT ?classLabel WHERE {
  wd:${escapeSparql(qid)} wdt:P31 ?class .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de" . }
} LIMIT 10
  `.trim();
  const result = await sparqlQuery(query);
  return (result ?? []).map((b) => b.classLabel?.value).filter(Boolean) as string[];
}

interface SparqlBinding {
  [key: string]: { value?: string } | undefined;
}

async function sparqlQuery(query: string): Promise<SparqlBinding[] | null> {
  try {
    const url = `${WIKIDATA_SPARQL}?query=${encodeURIComponent(query)}&format=json`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json() as { results?: { bindings?: SparqlBinding[] } };
    return data?.results?.bindings ?? null;
  } catch (err) {
    console.error("[Wikidata] SPARQL error:", err instanceof Error ? err.message : err);
    return null;
  }
}

function extractQid(uri?: string): string {
  if (!uri) return "";
  return uri.replace("http://www.wikidata.org/entity/", "");
}

function escapeSparql(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}
