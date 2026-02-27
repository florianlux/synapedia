export interface SubstanceGroup {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

const FALLBACK_TIMESTAMP = "2025-01-01T00:00:00.000Z";

/**
 * Fallback seed data used when the DB is empty or unavailable (demo mode).
 * Each group maps to a `class_primary` value in data/substances.json.
 */
export const fallbackGroups: SubstanceGroup[] = [
  {
    id: "fg-stimulanzien",
    name: "Stimulanzien",
    slug: "stimulanzien",
    description:
      "Substanzen, die die Aktivität des zentralen Nervensystems steigern und Wachheit, Aufmerksamkeit sowie Energie erhöhen.",
    icon: "⚡",
    sort_order: 1,
    created_at: FALLBACK_TIMESTAMP,
  },
  {
    id: "fg-depressiva",
    name: "Depressiva",
    slug: "depressiva",
    description:
      "Substanzen, die die Aktivität des ZNS dämpfen und sedierende, anxiolytische oder muskelrelaxierende Wirkungen haben.",
    icon: "🌙",
    sort_order: 2,
    created_at: FALLBACK_TIMESTAMP,
  },
  {
    id: "fg-opioide",
    name: "Opioide",
    slug: "opioide",
    description:
      "Substanzen, die an Opioidrezeptoren binden und analgetische sowie euphorisierende Effekte hervorrufen.",
    icon: "💊",
    sort_order: 3,
    created_at: FALLBACK_TIMESTAMP,
  },
  {
    id: "fg-psychedelika",
    name: "Psychedelika",
    slug: "psychedelika",
    description:
      "Substanzen, die primär über serotonerge Rezeptoren wirken und tiefgreifende Veränderungen der Wahrnehmung und des Bewusstseins bewirken.",
    icon: "🍄",
    sort_order: 4,
    created_at: FALLBACK_TIMESTAMP,
  },
  {
    id: "fg-dissoziativa",
    name: "Dissoziativa",
    slug: "dissoziativa",
    description:
      "Substanzen, die primär NMDA-Rezeptoren blockieren und dissoziative Zustände mit veränderter Wahrnehmung erzeugen.",
    icon: "🔮",
    sort_order: 5,
    created_at: FALLBACK_TIMESTAMP,
  },
  {
    id: "fg-cannabinoide",
    name: "Cannabinoide",
    slug: "cannabinoide",
    description:
      "Substanzen, die auf das Endocannabinoidsystem wirken, primär über CB1- und CB2-Rezeptoren.",
    icon: "🌿",
    sort_order: 6,
    created_at: FALLBACK_TIMESTAMP,
  },
  {
    id: "fg-empathogene",
    name: "Empathogene / Entaktogene",
    slug: "empathogene",
    description:
      "Substanzen, die die Freisetzung von Serotonin und anderen Monoaminen fördern und Empathie sowie emotionale Offenheit verstärken.",
    icon: "💛",
    sort_order: 7,
    created_at: FALLBACK_TIMESTAMP,
  },
  {
    id: "fg-benzodiazepine",
    name: "Benzodiazepine",
    slug: "benzodiazepine",
    description:
      "Positive allosterische Modulatoren am GABA-A-Rezeptor mit anxiolytischer, sedierender und antikonvulsiver Wirkung.",
    icon: "💤",
    sort_order: 8,
    created_at: FALLBACK_TIMESTAMP,
  },
  {
    id: "fg-nootropika",
    name: "Nootropika",
    slug: "nootropika",
    description:
      "Substanzen, die kognitive Funktionen wie Gedächtnis, Konzentration oder Lernfähigkeit verbessern sollen.",
    icon: "🧠",
    sort_order: 9,
    created_at: FALLBACK_TIMESTAMP,
  },
  {
    id: "fg-deliranzien",
    name: "Deliranzien",
    slug: "deliranzien",
    description:
      "Substanzen, die anticholinerg wirken und einen deliranten Zustand mit echten Halluzinationen hervorrufen können.",
    icon: "👁️",
    sort_order: 10,
    created_at: FALLBACK_TIMESTAMP,
  },
  {
    id: "fg-research-chemicals",
    name: "Research Chemicals / Designer",
    slug: "research-chemicals",
    description:
      "Neuartige psychoaktive Substanzen, die oft als Derivate bekannter Wirkstoffe entwickelt werden und wenig erforscht sind.",
    icon: "🧪",
    sort_order: 11,
    created_at: FALLBACK_TIMESTAMP,
  },
  {
    id: "fg-antidepressiva",
    name: "Antidepressiva",
    slug: "antidepressiva",
    description:
      "Medikamentenklassen, die zur Behandlung von Depressionen und Angststörungen eingesetzt werden.",
    icon: "🩺",
    sort_order: 12,
    created_at: FALLBACK_TIMESTAMP,
  },
];

/**
 * Map from substance `class_primary` to fallback group slug.
 */
const classToSlug: Record<string, string> = {
  Stimulanzien: "stimulanzien",
  Depressiva: "depressiva",
  Opioide: "opioide",
  Psychedelika: "psychedelika",
  Dissoziativa: "dissoziativa",
  Cannabinoide: "cannabinoide",
  Empathogene: "empathogene",
  Benzodiazepine: "benzodiazepine",
  Nootropika: "nootropika",
  Deliranzien: "deliranzien",
  "Research Chemicals": "research-chemicals",
  Antidepressiva: "antidepressiva",
};

/** Resolve a `class_primary` value to a fallback group slug (or undefined). */
export function classToGroupSlug(classPrimary: string): string | undefined {
  return classToSlug[classPrimary];
}
