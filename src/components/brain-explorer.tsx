"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { X, Search, Brain, Network } from "lucide-react";

/* ═══════════════════════════════ Types ═══════════════════════════════ */

type ReceptorData = {
  id: string;
  label: string;
  type: string;
  system: string;
  description: string;
  risk_notes: string;
  related_substances: string[];
};

type SubstanceData = {
  id: string;
  slug: string;
  title: string;
  class_primary: string;
  receptors: string[];
};

type BrainRegion = {
  id: string;
  name: string;
  receptorLabels: string[];
  color: string;
};

type BrainExplorerProps = {
  receptors: ReceptorData[];
  substances: SubstanceData[];
};

/* ═══════════════════════════════ Constants ═══════════════════════════ */

const BRAIN_REGIONS: BrainRegion[] = [
  {
    id: "cortex",
    name: "Kortex",
    receptorLabels: ["5-HT2A", "5-HT1A", "NMDA", "AMPA"],
    color: "#06b6d4",
  },
  {
    id: "limbic",
    name: "Limbisches System",
    receptorLabels: ["CB1", "μ-Opioid", "5-HT2A", "GABA-A"],
    color: "#a855f7",
  },
  {
    id: "basal-ganglia",
    name: "Basalganglien",
    receptorLabels: ["D1", "D2", "DAT", "GABA-A"],
    color: "#22c55e",
  },
  {
    id: "brainstem",
    name: "Hirnstamm",
    receptorLabels: ["SERT", "NET", "μ-Opioid", "nACh"],
    color: "#f97316",
  },
  {
    id: "cerebellum",
    name: "Kleinhirn",
    receptorLabels: ["GABA-A", "NMDA"],
    color: "#eab308",
  },
];

const SYSTEM_COLORS: Record<string, string> = {
  glutamate: "#06b6d4",
  serotonin: "#a855f7",
  dopamine: "#22c55e",
  GABA: "#eab308",
  opioid: "#ef4444",
  endocannabinoid: "#10b981",
  norepinephrine: "#f97316",
  acetylcholine: "#3b82f6",
};

const SYSTEM_LABELS: Record<string, string> = {
  glutamate: "Glutamat",
  serotonin: "Serotonin",
  dopamine: "Dopamin",
  GABA: "GABA",
  opioid: "Opioid",
  endocannabinoid: "Endocannabinoid",
  norepinephrine: "Noradrenalin",
  acetylcholine: "Acetylcholin",
};

const FILTER_CHIPS = [
  "Psychedelika",
  "Dissoziativa",
  "Opioide",
  "Stimulanzien",
  "Depressiva",
  "Cannabinoide",
] as const;

// Pre-computed static node positions for the receptor network graph
const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  "5-HT2A": { x: 130, y: 100 },
  "5-HT1A": { x: 65, y: 195 },
  SERT: { x: 225, y: 185 },
  NMDA: { x: 615, y: 85 },
  AMPA: { x: 730, y: 140 },
  D1: { x: 165, y: 360 },
  D2: { x: 285, y: 290 },
  DAT: { x: 340, y: 400 },
  "GABA-A": { x: 465, y: 220 },
  "μ-Opioid": { x: 65, y: 425 },
  "κ-Opioid": { x: 165, y: 490 },
  CB1: { x: 640, y: 370 },
  CB2: { x: 740, y: 435 },
  NET: { x: 485, y: 375 },
  nACh: { x: 415, y: 495 },
};

// Pre-computed edges: receptor pairs sharing at least one substance
const EDGES: [string, string][] = [
  ["NMDA", "GABA-A"],
  ["NMDA", "AMPA"],
  ["NMDA", "DAT"],
  ["NMDA", "SERT"],
  ["GABA-A", "AMPA"],
  ["5-HT2A", "5-HT1A"],
  ["5-HT2A", "D2"],
  ["5-HT1A", "D2"],
  ["μ-Opioid", "κ-Opioid"],
  ["D1", "D2"],
  ["D1", "NET"],
  ["D1", "DAT"],
  ["D1", "SERT"],
  ["D2", "NET"],
  ["D2", "DAT"],
  ["D2", "SERT"],
  ["CB1", "CB2"],
  ["SERT", "NET"],
  ["SERT", "DAT"],
  ["NET", "DAT"],
];

/* ═══════════════════════════ Main Component ══════════════════════════ */

export function BrainExplorer({ receptors, substances }: BrainExplorerProps) {
  const [selectedReceptor, setSelectedReceptor] =
    useState<ReceptorData | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<BrainRegion | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const receptorsByLabel = useMemo(() => {
    const map = new Map<string, ReceptorData>();
    for (const r of receptors) map.set(r.label, r);
    return map;
  }, [receptors]);

  const substancesById = useMemo(() => {
    const map = new Map<string, SubstanceData>();
    for (const s of substances) map.set(s.id, s);
    return map;
  }, [substances]);

  // Map substance class → set of receptor labels
  const classToReceptorLabels = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const s of substances) {
      if (!map[s.class_primary]) map[s.class_primary] = new Set();
      for (const r of s.receptors) map[s.class_primary].add(r);
    }
    return map;
  }, [substances]);

  const highlightedReceptors = useMemo(() => {
    if (!activeFilter) return null;
    return classToReceptorLabels[activeFilter] ?? new Set<string>();
  }, [activeFilter, classToReceptorLabels]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return receptors.filter((r) => r.label.toLowerCase().includes(q));
  }, [searchQuery, receptors]);

  const selectReceptor = useCallback(
    (label: string) => {
      const r = receptorsByLabel.get(label);
      if (r) {
        setSelectedReceptor(r);
        setSelectedRegion(null);
        setPanelOpen(true);
        setSearchQuery("");
      }
    },
    [receptorsByLabel],
  );

  const selectRegion = useCallback((region: BrainRegion) => {
    setSelectedRegion(region);
    setSelectedReceptor(null);
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setSelectedReceptor(null);
    setSelectedRegion(null);
  }, []);

  const toggleFilter = useCallback((chip: string) => {
    setActiveFilter((prev) => (prev === chip ? null : chip));
  }, []);

  const isReceptorHighlighted = useCallback(
    (label: string) => {
      if (!highlightedReceptors) return true;
      return highlightedReceptors.has(label);
    },
    [highlightedReceptors],
  );

  const isRegionHighlighted = useCallback(
    (region: BrainRegion) => {
      if (!highlightedReceptors) return true;
      return region.receptorLabels.some((r) => highlightedReceptors.has(r));
    },
    [highlightedReceptors],
  );

  // Close panel on Escape
  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panelOpen, closePanel]);

  return (
    <div className="relative">
      {/* ── Search & filters ── */}
      <div className="mb-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Rezeptor suchen…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          {searchResults.length > 0 && (
            <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-neutral-700 bg-neutral-900 shadow-lg">
              {searchResults.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-800"
                    onClick={() => selectReceptor(r.label)}
                  >
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: SYSTEM_COLORS[r.system] ?? "#666",
                      }}
                    />
                    <span>{r.label}</span>
                    <span className="ml-auto text-xs text-neutral-500">
                      {SYSTEM_LABELS[r.system] ?? r.system}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => toggleFilter(chip)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activeFilter === chip
                  ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                  : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="brain-map">
        <TabsList>
          <TabsTrigger value="brain-map">
            <Brain className="mr-1.5 h-4 w-4" />
            Brain Map
          </TabsTrigger>
          <TabsTrigger value="receptor-network">
            <Network className="mr-1.5 h-4 w-4" />
            Rezeptor-Netzwerk
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brain-map">
          <Card className="mt-2 border-neutral-800 bg-neutral-950/60">
            <CardContent className="p-2 sm:p-4">
              <BrainMapSVG
                onSelectRegion={selectRegion}
                selectedRegion={selectedRegion}
                isRegionHighlighted={isRegionHighlighted}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receptor-network">
          <Card className="mt-2 border-neutral-800 bg-neutral-950/60">
            <CardContent className="overflow-x-auto p-2 sm:p-4">
              <ReceptorNetworkSVG
                receptors={receptors}
                onSelectReceptor={selectReceptor}
                selectedReceptor={selectedReceptor}
                isReceptorHighlighted={isReceptorHighlighted}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Side panel ── */}
      <SidePanel
        open={panelOpen}
        onClose={closePanel}
        selectedReceptor={selectedReceptor}
        selectedRegion={selectedRegion}
        receptorsByLabel={receptorsByLabel}
        substancesById={substancesById}
        onSelectReceptor={selectReceptor}
      />
    </div>
  );
}

/* ═══════════════════════════ Brain Map SVG ═══════════════════════════ */

function BrainMapSVG({
  onSelectRegion,
  selectedRegion,
  isRegionHighlighted,
}: {
  onSelectRegion: (r: BrainRegion) => void;
  selectedRegion: BrainRegion | null;
  isRegionHighlighted: (r: BrainRegion) => boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const isActive = (id: string) =>
    hovered === id || selectedRegion?.id === id;

  const regionDefs: {
    region: BrainRegion;
    shape: React.ReactNode;
    labelX: number;
    labelY: number;
    labelSize: number;
  }[] = [
    {
      region: BRAIN_REGIONS[0],
      shape: (
        <path d="M145,125 C150,58 200,28 265,28 C330,28 378,58 382,125 C382,158 350,175 265,175 C178,175 145,158 145,125Z" />
      ),
      labelX: 265,
      labelY: 108,
      labelSize: 12,
    },
    {
      region: BRAIN_REGIONS[1],
      shape: <ellipse cx="268" cy="222" rx="88" ry="46" />,
      labelX: 268,
      labelY: 218,
      labelSize: 10,
    },
    {
      region: BRAIN_REGIONS[2],
      shape: <ellipse cx="168" cy="282" rx="60" ry="36" />,
      labelX: 168,
      labelY: 278,
      labelSize: 10,
    },
    {
      region: BRAIN_REGIONS[3],
      shape: (
        <path d="M248,308 C248,292 254,284 265,284 C276,284 282,292 282,308 L286,382 C286,404 278,416 265,416 C252,416 244,404 244,382Z" />
      ),
      labelX: 265,
      labelY: 355,
      labelSize: 9,
    },
    {
      region: BRAIN_REGIONS[4],
      shape: <ellipse cx="385" cy="350" rx="60" ry="38" />,
      labelX: 385,
      labelY: 346,
      labelSize: 10,
    },
  ];

  return (
    <div className="flex justify-center">
      <svg
        viewBox="0 0 530 450"
        className="w-full max-w-2xl"
        role="img"
        aria-label="Interaktive Gehirnkarte mit klickbaren Regionen"
      >
        <defs>
          <filter id="rgGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="6"
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="brainBg" cx="50%" cy="42%" r="55%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background glow */}
        <rect width="530" height="450" fill="url(#brainBg)" />

        {/* Subtle grid */}
        <g stroke="#06b6d4" strokeOpacity="0.035" strokeWidth="0.5">
          {Array.from({ length: 10 }, (_, i) => (
            <line
              key={`h${i}`}
              x1="0"
              y1={i * 50}
              x2="530"
              y2={i * 50}
            />
          ))}
          {Array.from({ length: 11 }, (_, i) => (
            <line
              key={`v${i}`}
              x1={i * 53}
              y1="0"
              x2={i * 53}
              y2="450"
            />
          ))}
        </g>

        {/* Brain outline */}
        <path
          d="M265,22 C385,16 472,82 478,182 C484,268 452,330 398,358 C382,366 378,392 386,418 L368,422 C356,406 340,382 318,368 C294,352 272,344 258,344 C242,344 222,352 200,368 C178,384 164,404 152,370 C105,350 65,300 48,238 C26,160 56,65 142,30 C178,16 225,18 265,22Z"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="1.5"
          strokeOpacity="0.2"
        />

        {/* Neural pathway lines (decorative) */}
        <g
          stroke="#06b6d4"
          strokeOpacity="0.06"
          strokeWidth="0.5"
          strokeDasharray="4 4"
        >
          <line x1="265" y1="108" x2="268" y2="222" />
          <line x1="268" y1="222" x2="168" y2="282" />
          <line x1="268" y1="222" x2="265" y2="355" />
          <line x1="268" y1="222" x2="385" y2="350" />
          <line x1="168" y1="282" x2="265" y2="355" />
        </g>

        {/* Regions */}
        {regionDefs.map(({ region, shape, labelX, labelY, labelSize }) => {
          const active = isActive(region.id);
          const highlighted = isRegionHighlighted(region);
          return (
            <g
              key={region.id}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={region.name}
              onClick={() => onSelectRegion(region)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectRegion(region);
              }}
              onMouseEnter={() => setHovered(region.id)}
              onMouseLeave={() => setHovered(null)}
              opacity={highlighted ? 1 : 0.25}
              filter={active ? "url(#rgGlow)" : undefined}
              style={{ transition: "opacity 0.25s" }}
            >
              {/* Clone shape with fill/stroke */}
              <g
                fill={active ? `${region.color}30` : `${region.color}12`}
                stroke={region.color}
                strokeWidth={active ? 1.5 : 0.8}
                strokeOpacity={active ? 0.8 : 0.3}
                style={{ transition: "all 0.25s" }}
              >
                {shape}
              </g>
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                fill={region.color}
                fontSize={labelSize}
                fontWeight="500"
                opacity={0.9}
                style={{ pointerEvents: "none" }}
              >
                {region.name}
              </text>
            </g>
          );
        })}

        {/* Junction dots */}
        <g fill="#06b6d4" opacity="0.12">
          <circle cx="265" cy="178" r="2.5" />
          <circle cx="195" cy="252" r="2" />
          <circle cx="338" cy="252" r="2" />
          <circle cx="245" cy="308" r="2" />
          <circle cx="325" cy="340" r="2" />
        </g>
      </svg>
    </div>
  );
}

/* ═══════════════════════ Receptor Network SVG ═══════════════════════ */

function ReceptorNetworkSVG({
  receptors,
  onSelectReceptor,
  selectedReceptor,
  isReceptorHighlighted,
}: {
  receptors: ReceptorData[];
  onSelectReceptor: (label: string) => void;
  selectedReceptor: ReceptorData | null;
  isReceptorHighlighted: (label: string) => boolean;
}) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  return (
    <div className="flex justify-center">
      <svg
        viewBox="0 0 800 550"
        className="w-full min-w-[500px]"
        role="img"
        aria-label="Rezeptor-Netzwerk-Graph"
      >
        <defs>
          <filter
            id="ndGlow"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="8"
              result="blur"
            />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="netBg" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="800" height="550" fill="url(#netBg)" />

        {/* System cluster labels */}
        <g
          fontSize="10"
          fontWeight="400"
          opacity="0.2"
          style={{ pointerEvents: "none" }}
        >
          <text x="130" y="60" fill="#a855f7" textAnchor="middle">
            Serotonin
          </text>
          <text x="670" y="52" fill="#06b6d4" textAnchor="middle">
            Glutamat
          </text>
          <text x="260" y="325" fill="#22c55e" textAnchor="middle">
            Dopamin
          </text>
          <text x="470" y="180" fill="#eab308" textAnchor="middle">
            GABA
          </text>
          <text x="100" y="395" fill="#ef4444" textAnchor="middle">
            Opioid
          </text>
          <text x="685" y="340" fill="#10b981" textAnchor="middle">
            Cannabinoid
          </text>
        </g>

        {/* Edges */}
        <g>
          {EDGES.map(([a, b], i) => {
            const pa = NODE_POSITIONS[a];
            const pb = NODE_POSITIONS[b];
            if (!pa || !pb) return null;
            const hl =
              isReceptorHighlighted(a) && isReceptorHighlighted(b);
            const sel =
              selectedReceptor?.label === a ||
              selectedReceptor?.label === b;
            return (
              <line
                key={i}
                x1={pa.x}
                y1={pa.y}
                x2={pb.x}
                y2={pb.y}
                stroke={sel ? "#22d3ee" : "#334155"}
                strokeWidth={sel ? 1.5 : 0.7}
                strokeOpacity={hl ? (sel ? 0.6 : 0.25) : 0.06}
                style={{ transition: "all 0.3s" }}
              />
            );
          })}
        </g>

        {/* Nodes */}
        {receptors.map((r) => {
          const pos = NODE_POSITIONS[r.label];
          if (!pos) return null;
          const color = SYSTEM_COLORS[r.system] ?? "#666";
          const hl = isReceptorHighlighted(r.label);
          const sel = selectedReceptor?.label === r.label;
          const hov = hoveredNode === r.label;
          const radius = sel ? 24 : hov ? 21 : 18;

          return (
            <g
              key={r.id}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`Rezeptor ${r.label}`}
              onClick={() => onSelectReceptor(r.label)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  onSelectReceptor(r.label);
              }}
              onMouseEnter={() => setHoveredNode(r.label)}
              onMouseLeave={() => setHoveredNode(null)}
              opacity={hl ? 1 : 0.18}
              filter={sel || hov ? "url(#ndGlow)" : undefined}
              style={{ transition: "opacity 0.3s" }}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius}
                fill={color}
                fillOpacity={sel ? 0.35 : hov ? 0.25 : 0.12}
                stroke={color}
                strokeWidth={sel ? 2 : 1}
                strokeOpacity={sel ? 1 : 0.5}
                style={{ transition: "all 0.2s" }}
              />
              <text
                x={pos.x}
                y={pos.y + 4}
                textAnchor="middle"
                fill={color}
                fontSize="10"
                fontWeight="600"
                style={{ pointerEvents: "none" }}
              >
                {r.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ═══════════════════════════ Side Panel ══════════════════════════════ */

function SidePanel({
  open,
  onClose,
  selectedReceptor,
  selectedRegion,
  receptorsByLabel,
  substancesById,
  onSelectReceptor,
}: {
  open: boolean;
  onClose: () => void;
  selectedReceptor: ReceptorData | null;
  selectedRegion: BrainRegion | null;
  receptorsByLabel: Map<string, ReceptorData>;
  substancesById: Map<string, SubstanceData>;
  onSelectReceptor: (label: string) => void;
}) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Panel */}
      <aside
        aria-label="Detail-Panel"
        className={[
          "fixed z-50 overflow-y-auto border-neutral-800 bg-neutral-950/95 backdrop-blur-md transition-transform duration-300 ease-in-out",
          // Mobile: bottom sheet
          "inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl border-t p-6",
          // Desktop: right panel
          "md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:w-96 md:max-h-none md:rounded-t-none md:rounded-l-2xl md:border-l md:border-t-0",
          open
            ? "translate-y-0 md:translate-x-0"
            : "translate-y-full md:translate-y-0 md:translate-x-full",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="absolute right-4 top-4 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pr-8">
          {selectedReceptor ? (
            <ReceptorDetail
              receptor={selectedReceptor}
              substancesById={substancesById}
            />
          ) : selectedRegion ? (
            <RegionDetail
              region={selectedRegion}
              receptorsByLabel={receptorsByLabel}
              onSelectReceptor={onSelectReceptor}
            />
          ) : null}
        </div>
      </aside>
    </>
  );
}

/* ═══════════════════════════ Detail Views ════════════════════════════ */

function ReceptorDetail({
  receptor,
  substancesById,
}: {
  receptor: ReceptorData;
  substancesById: Map<string, SubstanceData>;
}) {
  const color = SYSTEM_COLORS[receptor.system] ?? "#666";

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          {receptor.label}
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-2 pt-1">
          <Badge variant="outline" className="text-xs">
            {receptor.type}
          </Badge>
          <Badge
            className="border text-xs"
            style={{
              backgroundColor: `${color}18`,
              color,
              borderColor: `${color}40`,
            }}
          >
            {SYSTEM_LABELS[receptor.system] ?? receptor.system}
          </Badge>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 px-0">
        <div>
          <h4 className="text-sm font-medium text-neutral-300">
            Beschreibung
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-neutral-400">
            {receptor.description}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-neutral-300">
            Risikohinweise
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-amber-400/80">
            {receptor.risk_notes}
          </p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-neutral-300">
            Verwandte Substanzen
          </h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {receptor.related_substances.map((subId) => {
              const sub = substancesById.get(subId);
              if (!sub) return null;
              return (
                <Link key={subId} href={`/articles/${sub.slug}`}>
                  <Badge
                    variant="secondary"
                    className="cursor-pointer transition-colors hover:bg-neutral-700"
                  >
                    {sub.title}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RegionDetail({
  region,
  receptorsByLabel,
  onSelectReceptor,
}: {
  region: BrainRegion;
  receptorsByLabel: Map<string, ReceptorData>;
  onSelectReceptor: (label: string) => void;
}) {
  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: region.color }}
          />
          {region.name}
        </CardTitle>
        <CardDescription>
          Klicke auf einen Rezeptor, um Details anzuzeigen.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0">
        <h4 className="mb-2 text-sm font-medium text-neutral-300">
          Assoziierte Rezeptoren
        </h4>
        <div className="flex flex-wrap gap-2">
          {region.receptorLabels.map((label) => {
            const r = receptorsByLabel.get(label);
            const c = r ? (SYSTEM_COLORS[r.system] ?? "#666") : "#666";
            return (
              <button
                key={label}
                type="button"
                onClick={() => onSelectReceptor(label)}
              >
                <Badge
                  variant="outline"
                  className="cursor-pointer transition-colors hover:bg-neutral-800"
                  style={{ borderColor: `${c}60`, color: c }}
                >
                  {label}
                </Badge>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
