import { describe, it, expect } from "vitest";
import {
  buildBrainGraph,
  applyUserOverlay,
  filterGraphBySubstance,
} from "../brain-graph";
import type { SubstanceInput, ReceptorInput } from "../brain-graph";

/* ------------------------------------------------------------------ */
/*  Test data                                                         */
/* ------------------------------------------------------------------ */

const testSubstances: SubstanceInput[] = [
  {
    id: "sub:psilocybin",
    slug: "psilocybin",
    title: "Psilocybin",
    class_primary: "Psychedelika",
    mechanisms: ["5-HT2A-Agonist"],
    receptors: ["5-HT2A", "5-HT1A"],
    risk_level: "moderate",
    summary: "Test substance A",
  },
  {
    id: "sub:ketamine",
    slug: "ketamin",
    title: "Ketamin",
    class_primary: "Dissoziativa",
    mechanisms: ["NMDA-Antagonist"],
    receptors: ["NMDA"],
    risk_level: "moderate",
    summary: "Test substance B",
  },
  {
    id: "sub:mdma",
    slug: "mdma",
    title: "MDMA",
    class_primary: "Empathogene",
    mechanisms: ["SERT-Umkehrtransport", "Serotoninfreisetzung"],
    receptors: ["SERT", "NET", "DAT"],
    risk_level: "high",
    summary: "Test substance C",
  },
];

const testReceptors: ReceptorInput[] = [
  {
    id: "r:5-HT2A",
    label: "5-HT2A",
    type: "metabotropic",
    system: "serotonin",
    description: "Serotonin receptor 2A",
    risk_notes: "Psychotomimetic effects",
    related_substances: ["sub:psilocybin", "sub:lsd"],
  },
  {
    id: "r:5-HT1A",
    label: "5-HT1A",
    type: "metabotropic",
    system: "serotonin",
    description: "Serotonin receptor 1A",
    risk_notes: "Anxiolytic",
    related_substances: ["sub:psilocybin"],
  },
  {
    id: "r:NMDA",
    label: "NMDA",
    type: "ionotropic",
    system: "glutamate",
    description: "NMDA receptor",
    risk_notes: "Dissociative effects",
    related_substances: ["sub:ketamine"],
  },
  {
    id: "r:SERT",
    label: "SERT",
    type: "transporter",
    system: "serotonin",
    description: "Serotonin transporter",
    risk_notes: "Serotonin syndrome risk",
    related_substances: ["sub:mdma"],
  },
  {
    id: "r:NET",
    label: "NET",
    type: "transporter",
    system: "norepinephrine",
    description: "Norepinephrine transporter",
    risk_notes: "Cardiovascular risk",
    related_substances: ["sub:mdma"],
  },
  {
    id: "r:DAT",
    label: "DAT",
    type: "transporter",
    system: "dopamine",
    description: "Dopamine transporter",
    risk_notes: "Addiction risk",
    related_substances: ["sub:mdma"],
  },
];

/* ------------------------------------------------------------------ */
/*  buildBrainGraph                                                   */
/* ------------------------------------------------------------------ */

describe("buildBrainGraph", () => {
  const graph = buildBrainGraph(testSubstances, testReceptors);

  it("produces nodes for all five node types", () => {
    const types = new Set(graph.nodes.map((n) => n.type));
    expect(types.has("substance")).toBe(true);
    expect(types.has("receptor")).toBe(true);
    expect(types.has("neurotransmitter")).toBe(true);
    expect(types.has("effect")).toBe(true);
    expect(types.has("risk")).toBe(true);
  });

  it("creates one substance node per input", () => {
    const substanceNodes = graph.nodes.filter((n) => n.type === "substance");
    expect(substanceNodes.length).toBe(testSubstances.length);
  });

  it("creates receptor nodes from receptors.json", () => {
    const receptorNodes = graph.nodes.filter((n) => n.type === "receptor");
    expect(receptorNodes.length).toBeGreaterThanOrEqual(testReceptors.length);
  });

  it("creates binds_to edges from substances to receptors", () => {
    const bindEdges = graph.edges.filter((e) => e.relation === "binds_to");
    // Psilocybin has 2 receptors, Ketamin 1, MDMA 3 = 6 total
    expect(bindEdges.length).toBe(6);
  });

  it("creates modulates edges from receptors to neurotransmitters", () => {
    const modEdges = graph.edges.filter((e) => e.relation === "modulates");
    expect(modEdges.length).toBe(testReceptors.length);
  });

  it("creates produces edges for known mechanisms", () => {
    const prodEdges = graph.edges.filter((e) => e.relation === "produces");
    // 5-HT2A-Agonist → Halluzinationen, NMDA-Antagonist → Dissoziation,
    // SERT-Umkehrtransport → Serotoninfreisetzung, Serotoninfreisetzung → Euphorie
    expect(prodEdges.length).toBeGreaterThanOrEqual(3);
  });

  it("creates has_risk edges for every substance", () => {
    const riskEdges = graph.edges.filter((e) => e.relation === "has_risk");
    expect(riskEdges.length).toBe(testSubstances.length);
  });

  it("assigns higher weight to high-risk substances", () => {
    const mdmaRiskEdge = graph.edges.find(
      (e) => e.source === "substance:mdma" && e.relation === "has_risk",
    );
    expect(mdmaRiskEdge).toBeDefined();
    expect(mdmaRiskEdge!.weight).toBe(1.0);
  });

  it("does not have duplicate nodes", () => {
    const ids = graph.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("handles empty inputs gracefully", () => {
    const empty = buildBrainGraph([], []);
    expect(empty.nodes).toEqual([]);
    expect(empty.edges).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  applyUserOverlay                                                  */
/* ------------------------------------------------------------------ */

describe("applyUserOverlay", () => {
  const graph = buildBrainGraph(testSubstances, testReceptors);

  it("returns the same graph if no flags are provided", () => {
    const result = applyUserOverlay(graph, []);
    expect(result).toBe(graph); // reference equality
  });

  it("flags matching receptor nodes", () => {
    const result = applyUserOverlay(graph, ["serotonin"]);
    const flaggedNodes = result.nodes.filter((n) => n.meta.flagged);
    expect(flaggedNodes.length).toBeGreaterThan(0);
    // All serotonin-system nodes should be flagged
    const serotoninReceptors = result.nodes.filter(
      (n) => n.type === "receptor" && n.meta.system === "serotonin",
    );
    for (const r of serotoninReceptors) {
      expect(r.meta.flagged).toBe(true);
    }
  });

  it("is case-insensitive for flags", () => {
    const result = applyUserOverlay(graph, ["SEROTONIN"]);
    const flagged = result.nodes.filter((n) => n.meta.flagged);
    expect(flagged.length).toBeGreaterThan(0);
  });

  it("does not modify edges", () => {
    const result = applyUserOverlay(graph, ["serotonin"]);
    expect(result.edges).toBe(graph.edges);
  });
});

/* ------------------------------------------------------------------ */
/*  filterGraphBySubstance                                            */
/* ------------------------------------------------------------------ */

describe("filterGraphBySubstance", () => {
  const graph = buildBrainGraph(testSubstances, testReceptors);

  it("returns only nodes connected to the given substance", () => {
    const filtered = filterGraphBySubstance(graph, "ketamin");
    const nodeIds = filtered.nodes.map((n) => n.id);
    expect(nodeIds).toContain("substance:ketamin");
    expect(nodeIds).toContain("receptor:NMDA");
    // Should NOT contain psilocybin nodes
    expect(nodeIds).not.toContain("substance:psilocybin");
  });

  it("returns matching edges only", () => {
    const filtered = filterGraphBySubstance(graph, "psilocybin");
    for (const edge of filtered.edges) {
      const nodeIds = filtered.nodes.map((n) => n.id);
      expect(nodeIds).toContain(edge.source);
      expect(nodeIds).toContain(edge.target);
    }
  });

  it("returns empty graph for unknown substance", () => {
    const filtered = filterGraphBySubstance(graph, "nonexistent");
    expect(filtered.nodes.length).toBe(0);
    expect(filtered.edges.length).toBe(0);
  });
});
