/**
 * Categorized seed packs for bulk import.
 * Each pack contains substances commonly studied in pharmacological/medical literature.
 */

export interface SeedPack {
  id: string;
  label: string;
  description: string;
  substances: string[];
}

export const SEED_PACKS: SeedPack[] = [
  {
    id: "psychedelics",
    label: "Psychedelics",
    description: "Classic and research psychedelics (serotonergic hallucinogens)",
    substances: [
      "Psilocybin", "LSD", "DMT", "Mescalin", "5-MeO-DMT",
      "2C-B", "2C-E", "2C-I", "DOB", "DOM",
      "4-AcO-DMT", "4-HO-MET", "4-HO-MiPT", "ETH-LAD", "AL-LAD",
      "1P-LSD", "ALD-52", "LSA", "Salvinorin A", "Ibogain",
      "Ayahuasca", "AMT (Alpha-Methyltryptamin)", "DiPT",
    ],
  },
  {
    id: "dissociatives",
    label: "Dissociatives",
    description: "NMDA antagonists and dissociative anesthetics",
    substances: [
      "Ketamin", "PCP", "3-MeO-PCP", "MXE (Methoxetamin)",
      "DXE (Deschloroketamin)", "Dextromethorphan (DXM)",
      "Lachgas (N2O)", "Memantin",
    ],
  },
  {
    id: "stimulants",
    label: "Stimulants",
    description: "CNS stimulants including amphetamines and cathinones",
    substances: [
      "Amphetamin", "Methamphetamin", "MDMA", "MDA",
      "Kokain", "Methylphenidat", "Modafinil",
      "4-FA", "Methylon", "Mephedron", "MDPV",
      "Alpha-PVP", "Cathinon", "Ephedrin", "Pseudoephedrin",
      "Koffein", "Nikotin", "Phenylethylamin (PEA)",
    ],
  },
  {
    id: "opioids",
    label: "Opioids",
    description: "Opioid receptor agonists, antagonists, and partial agonists",
    substances: [
      "Heroin", "Morphin", "Codein", "Fentanyl", "Oxycodon",
      "Tramadol", "Methadon", "Buprenorphin",
      "Kratom (Mitragynin)", "Naloxon", "Naltrexon",
    ],
  },
  {
    id: "depressants",
    label: "Depressants",
    description: "GABAergic substances, sedatives, and hypnotics",
    substances: [
      "Diazepam", "Alprazolam", "Lorazepam", "Clonazepam",
      "Midazolam", "Zolpidem", "GHB", "GBL",
      "Phenibut", "Gabapentin", "Pregabalin",
      "Alkohol (Ethanol)", "Baclofen", "Carisoprodol", "Meprobamat",
      "Barbital", "Phenobarbital", "Thiopental",
      "Propofol", "Clomethiazol",
    ],
  },
  {
    id: "antidepressants",
    label: "Antidepressants & Mood Stabilizers",
    description: "SSRIs, SNRIs, atypical antidepressants, mood stabilizers",
    substances: [
      "Fluoxetin", "Sertralin", "Citalopram",
      "Venlafaxin", "Duloxetin", "Mirtazapin",
      "Bupropion", "Tianeptin", "Johanniskraut",
      "Lithium", "Valproat", "Carbamazepin",
      "Lamotrigin", "Topiramat",
    ],
  },
  {
    id: "nootropics",
    label: "Nootropics",
    description: "Cognitive enhancers and racetams",
    substances: [
      "Piracetam", "Aniracetam", "Oxiracetam", "Noopept",
      "L-Theanin", "Ashwagandha", "Rhodiola Rosea",
      "Modafinil", "Atomoxetin",
    ],
  },
  {
    id: "nps",
    label: "Novel Psychoactive Substances (NPS)",
    description: "Research chemicals and designer drugs",
    substances: [
      "1P-LSD", "4-AcO-DMT", "4-HO-MET", "4-HO-MiPT",
      "ETH-LAD", "AL-LAD", "ALD-52",
      "3-MeO-PCP", "MXE (Methoxetamin)", "DXE (Deschloroketamin)",
      "Mephedron", "MDPV", "Alpha-PVP", "Methylon",
      "4-FA", "Phenibut",
    ],
  },
  {
    id: "antipsychotics",
    label: "Antipsychotics & Auxiliary",
    description: "Neuroleptics, antihistamines, and auxiliary substances",
    substances: [
      "Quetiapin", "Olanzapin", "Risperidon", "Aripiprazol",
      "Haloperidol", "Chlorpromazin",
      "Diphenhydramin", "Promethazin", "Scopolamin", "Atropin",
      "Dexmedetomidin", "Clonidin", "Amantadin",
      "Disulfiram", "Acamprosat", "Vareniclin", "Cytisin",
      "Muscimol", "Ibotensäure", "Tryptamin",
    ],
  },
];

/** Get all unique substance names from all seed packs */
export function getAllSeedNames(): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const pack of SEED_PACKS) {
    for (const name of pack.substances) {
      if (!seen.has(name)) {
        seen.add(name);
        result.push(name);
      }
    }
  }
  return result;
}

/** Get substance names for a specific seed pack */
export function getSeedPackNames(packId: string): string[] {
  const pack = SEED_PACKS.find((p) => p.id === packId);
  return pack ? [...pack.substances] : [];
}
