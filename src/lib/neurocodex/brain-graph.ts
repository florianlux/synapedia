/**
 * Brain Graph Builder – Neurocodex
 *
 * Pure functions that derive a Substance → Receptor → Neurotransmitter → Effect → Risk
 * graph from static JSON data (data/substances.json, data/receptors.json).
 *
 * No Supabase calls – works entirely from static data for offline / demo mode.
 */

import type {
  BrainGraph,
  BrainGraphNode,
  BrainGraphEdge,
  BrainGraphNodeType,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Input types matching data/ JSON structures                        */
/* ------------------------------------------------------------------ */

export interface SubstanceInput {
  id: string;
  slug: string;
  title: string;
  class_primary: string;
  mechanisms: string[];
  receptors: string[];
  risk_level: string;
  summary: string;
}

export interface ReceptorInput {
  id: string;
  label: string;
  type: string;
  system: string;
  description: string;
  risk_notes: string;
  related_substances: string[];
}

/* ------------------------------------------------------------------ */
/*  Effect / risk extraction helpers                                   */
/* ------------------------------------------------------------------ */

/** Map receptor systems to the neurotransmitter they belong to */
const SYSTEM_NEUROTRANSMITTER: Record<string, string> = {
  glutamate: "Glutamat",
  GABA: "GABA",
  serotonin: "Serotonin",
  opioid: "Endorphine",
  dopamine: "Dopamin",
  endocannabinoid: "Endocannabinoide",
  norepinephrine: "Noradrenalin",
  acetylcholine: "Acetylcholin",
};

/** Map mechanism strings to simplified effects */
const MECHANISM_EFFECTS: Record<string, string> = {
  "NMDA-Antagonist": "Dissoziation",
  "5-HT2A-Agonist": "Halluzinationen",
  "CB1-Agonist": "Psychoaktive Wirkung",
  "CB2-Agonist": "Immunmodulation",
  "Partieller D2-Agonist": "Dopaminerge Stimulation",
  "SERT-Umkehrtransport": "Serotoninfreisetzung",
  Serotoninfreisetzung: "Euphorie",
  Noradrenalinfreisetzung: "Sympathomimetik",
  Dopaminfreisetzung: "Belohnungsaktivierung",
  "DAT-Hemmung": "Dopaminerhöhung",
  "NET-Hemmung": "Noradrenalinerhöhung",
  "GABA-A-Agonist": "Sedierung",
  "GABA-A-Allosterisch": "Anxiolyse",
  "MOR-Agonist": "Analgesie",
  "nACh-Agonist": "Kognitionsförderung",
  "AMPA-Modulator": "Synaptische Plastizität",
  "SERT-Hemmung": "Serotoninerhöhung",
};

/** Risk level → risk node descriptions */
const RISK_DESCRIPTIONS: Record<string, string> = {
  low: "Niedriges Risikoprofil",
  moderate: "Moderates Risikoprofil – Vorsicht geboten",
  high: "Hohes Risikoprofil – erhebliche Gesundheitsgefahr",
  unknown: "Unbekanntes Risikoprofil – Daten unzureichend",
};

/* ------------------------------------------------------------------ */
/*  ID helpers                                                        */
/* ------------------------------------------------------------------ */

function nodeId(type: BrainGraphNodeType, key: string): string {
  return `${type}:${key}`;
}

/* ------------------------------------------------------------------ */
/*  Main builder                                                      */
/* ------------------------------------------------------------------ */

/**
 * Build a full BrainGraph from substance + receptor data.
 *
 * Graph structure:
 *   Substance ──binds_to──▶ Receptor
 *   Receptor  ──modulates──▶ Neurotransmitter
 *   Substance ──produces──▶ Effect
 *   Substance ──has_risk──▶ Risk
 */
export function buildBrainGraph(
  substances: SubstanceInput[],
  receptors: ReceptorInput[],
): BrainGraph {
  const nodesMap = new Map<string, BrainGraphNode>();
  const edges: BrainGraphEdge[] = [];

  const addNode = (
    id: string,
    label: string,
    type: BrainGraphNodeType,
    meta: Record<string, unknown> = {},
  ) => {
    if (!nodesMap.has(id)) {
      nodesMap.set(id, { id, label, type, meta });
    }
  };

  // Build receptor lookup: label → ReceptorInput
  const receptorByLabel = new Map<string, ReceptorInput>();
  for (const r of receptors) {
    receptorByLabel.set(r.label, r);
  }

  // 1. Add receptor + neurotransmitter nodes (and their edges)
  for (const r of receptors) {
    const rId = nodeId("receptor", r.label);
    addNode(rId, r.label, "receptor", {
      type: r.type,
      system: r.system,
      description: r.description,
    });

    const ntName = SYSTEM_NEUROTRANSMITTER[r.system] ?? r.system;
    const ntId = nodeId("neurotransmitter", ntName);
    addNode(ntId, ntName, "neurotransmitter", { system: r.system });

    edges.push({
      source: rId,
      target: ntId,
      relation: "modulates",
      weight: 0.8,
    });
  }

  // 2. Add substance nodes + edges
  for (const s of substances) {
    const sId = nodeId("substance", s.slug);
    addNode(sId, s.title, "substance", {
      class: s.class_primary,
      risk_level: s.risk_level,
      summary: s.summary,
    });

    // Substance → Receptor edges
    for (const rLabel of s.receptors) {
      const rId = nodeId("receptor", rLabel);
      // Ensure receptor node exists even if not in receptors.json
      if (!nodesMap.has(rId)) {
        addNode(rId, rLabel, "receptor", {});
      }
      edges.push({
        source: sId,
        target: rId,
        relation: "binds_to",
        weight: 0.9,
      });
    }

    // Substance → Effect edges (derived from mechanisms)
    for (const mech of s.mechanisms) {
      const effectLabel = MECHANISM_EFFECTS[mech];
      if (effectLabel) {
        const eId = nodeId("effect", effectLabel);
        addNode(eId, effectLabel, "effect", { mechanism: mech });
        edges.push({
          source: sId,
          target: eId,
          relation: "produces",
          weight: 0.7,
        });
      }
    }

    // Substance → Risk edge
    const riskLabel = RISK_DESCRIPTIONS[s.risk_level] ?? s.risk_level;
    const riskId = nodeId("risk", s.risk_level);
    addNode(riskId, riskLabel, "risk", { level: s.risk_level });
    edges.push({
      source: sId,
      target: riskId,
      relation: "has_risk",
      weight: s.risk_level === "high" ? 1.0 : s.risk_level === "moderate" ? 0.6 : 0.3,
    });
  }

  console.log(
    `[BrainGraph] Built graph: ${nodesMap.size} nodes, ${edges.length} edges`,
  );

  return {
    nodes: Array.from(nodesMap.values()),
    edges,
  };
}

/* ------------------------------------------------------------------ */
/*  User overlay helpers                                              */
/* ------------------------------------------------------------------ */

/**
 * Apply user sensitivity flags to a brain graph.
 * Flags sensitive receptors/effects with a `flagged` meta key.
 * Does NOT enable misuse optimization – purely harm-reduction markers.
 */
export function applyUserOverlay(
  graph: BrainGraph,
  sensitivityFlags: string[],
): BrainGraph {
  if (sensitivityFlags.length === 0) return graph;

  const flagSet = new Set(sensitivityFlags.map((f) => f.toLowerCase()));

  const nodes = graph.nodes.map((node) => {
    const labelLower = node.label.toLowerCase();
    const systemLower = ((node.meta.system as string) ?? "").toLowerCase();
    const flagged =
      flagSet.has(labelLower) ||
      flagSet.has(systemLower) ||
      flagSet.has(node.type);

    return flagged ? { ...node, meta: { ...node.meta, flagged: true } } : node;
  });

  return { nodes, edges: graph.edges };
}

/**
 * Filter a brain graph to only show nodes connected to a specific substance.
 * Useful for per-substance detail views.
 */
export function filterGraphBySubstance(
  graph: BrainGraph,
  substanceSlug: string,
): BrainGraph {
  const substanceId = nodeId("substance", substanceSlug);
  const connectedIds = new Set<string>([substanceId]);

  for (const edge of graph.edges) {
    if (edge.source === substanceId) connectedIds.add(edge.target);
    if (edge.target === substanceId) connectedIds.add(edge.source);
  }

  return {
    nodes: graph.nodes.filter((n) => connectedIds.has(n.id)),
    edges: graph.edges.filter(
      (e) => connectedIds.has(e.source) && connectedIds.has(e.target),
    ),
  };
}
