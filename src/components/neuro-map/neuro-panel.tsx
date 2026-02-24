"use client";

import { X, ExternalLink, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { NeuroNode, InteractionRaw } from "./neuro-types";
import { CLASS_COLORS, DEFAULT_NODE_COLOR, RECEPTOR_COLORS } from "./neuro-types";

interface NeuroPanelProps {
  node: NeuroNode;
  /** interaction warnings that involve this substance */
  interactions: InteractionRaw[];
  /** second selected node for compare mode (if any) */
  compareNode?: NeuroNode;
  onClose: () => void;
}

export function NeuroPanel({ node, interactions, compareNode, onClose }: NeuroPanelProps) {
  const color = CLASS_COLORS[node.classPrimary] ?? DEFAULT_NODE_COLOR;

  /* If compare mode, find shared receptors */
  const sharedReceptors = compareNode
    ? node.receptors.filter((r) => compareNode.receptors.includes(r))
    : [];

  /* Find interaction between the two selected nodes */
  const crossInteraction = compareNode
    ? interactions.find(
        (ix) =>
          (ix.a === node.id && ix.b === compareNode.id) ||
          (ix.b === node.id && ix.a === compareNode.id),
      )
    : undefined;

  return (
    <aside className="absolute right-0 top-0 z-30 flex h-full w-80 flex-col border-l border-neutral-800 bg-neutral-950/95 backdrop-blur-md sm:w-96">
      {/* header */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <h2 className="truncate text-lg font-bold" style={{ color }}>
          {node.label}
        </h2>
        <button
          onClick={onClose}
          className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
          aria-label="Panel schließen"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* scrollable body */}
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {/* class + risk */}
        <div className="flex flex-wrap gap-2">
          <Badge style={{ backgroundColor: color, color: "#000" }}>
            {node.classPrimary}
          </Badge>
          <Badge
            variant={
              node.riskLevel === "high"
                ? "destructive"
                : node.riskLevel === "moderate"
                  ? "default"
                  : "secondary"
            }
          >
            Risiko: {node.riskLevel}
          </Badge>
        </div>

        {/* summary */}
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Beschreibung
          </h3>
          <p className="text-sm leading-relaxed text-neutral-300">{node.summary}</p>
        </div>

        {/* receptors */}
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Rezeptoren
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {node.receptors.map((r) => (
              <Badge
                key={r}
                variant="outline"
                style={{
                  borderColor: RECEPTOR_COLORS[r] ?? "#555",
                  color: RECEPTOR_COLORS[r] ?? "#aaa",
                }}
              >
                {r}
              </Badge>
            ))}
          </div>
        </div>

        {/* mechanisms */}
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Wirkmechanismen
          </h3>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-neutral-400">
            {node.mechanisms.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>

        {/* interaction warnings for this substance */}
        {interactions.length > 0 && (
          <div>
            <h3 className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <AlertTriangle className="h-3 w-3 text-yellow-500" />
              Interaktionswarnungen
            </h3>
            <div className="space-y-2">
              {interactions.map((ix, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 p-3"
                >
                  <p className="text-sm font-medium text-neutral-200">
                    {ix.headline}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Risiko:{" "}
                    <span
                      className={
                        ix.risk === "high" ? "text-red-400" : "text-yellow-400"
                      }
                    >
                      {ix.risk}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* compare mode section */}
        {compareNode && (
          <div className="rounded-lg border border-cyan-900 bg-cyan-950/30 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
              Vergleich mit {compareNode.label}
            </h3>
            {sharedReceptors.length > 0 ? (
              <>
                <p className="mb-1 text-xs text-neutral-400">
                  Gemeinsame Rezeptoren:
                </p>
                <div className="flex flex-wrap gap-1">
                  {sharedReceptors.map((r) => (
                    <Badge
                      key={r}
                      style={{
                        backgroundColor: RECEPTOR_COLORS[r] ?? "#444",
                        color: "#000",
                      }}
                    >
                      {r}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-neutral-500">
                Keine gemeinsamen Rezeptoren.
              </p>
            )}

            {crossInteraction && (
              <div className="mt-3 rounded border border-red-900 bg-red-950/30 p-2">
                <p className="text-xs font-medium text-red-300">
                  <AlertTriangle className="mr-1 inline h-3 w-3" />
                  {crossInteraction.headline}
                </p>
                <p className="mt-1 text-xs text-red-400/70">
                  {crossInteraction.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* link to article page */}
        <div className="pt-2">
          <Link href={`/articles/${node.slug}`}>
            <Button variant="outline" className="w-full gap-2 border-neutral-700 text-neutral-300 hover:border-cyan-600 hover:text-cyan-400">
              <ExternalLink className="h-4 w-4" />
              Zur Artikelseite
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
