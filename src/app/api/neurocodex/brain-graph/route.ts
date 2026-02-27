import { NextRequest, NextResponse } from "next/server";
import { substances } from "@/../data/substances";
import receptorsData from "@/../data/receptors.json";
import {
  buildBrainGraph,
  applyUserOverlay,
  filterGraphBySubstance,
} from "@/lib/neurocodex/brain-graph";
import type { ReceptorInput } from "@/lib/neurocodex/brain-graph";

/**
 * GET /api/neurocodex/brain-graph
 * Returns the full brain graph, optionally filtered by substance.
 *
 * Query params:
 *   - substance: slug to filter graph to one substance's connections
 *   - flags: comma-separated sensitivity flags for user overlay
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const substanceSlug = searchParams.get("substance");
    const flagsParam = searchParams.get("flags");

    const receptors = receptorsData as ReceptorInput[];
    let graph = buildBrainGraph(substances, receptors);

    // Apply user sensitivity overlay
    if (flagsParam) {
      const flags = flagsParam.split(",").map((f) => f.trim()).filter(Boolean);
      graph = applyUserOverlay(graph, flags);
    }

    // Filter to a single substance's subgraph
    if (substanceSlug) {
      graph = filterGraphBySubstance(graph, substanceSlug);
    }

    return NextResponse.json(graph);
  } catch (err) {
    console.error("[BrainGraph]", err);
    return NextResponse.json(
      { error: "Brain-Graph konnte nicht erstellt werden." },
      { status: 500 },
    );
  }
}
