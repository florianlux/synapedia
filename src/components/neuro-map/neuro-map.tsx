"use client";

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Search, ZapOff, Zap, Layers, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import type {
  SubstanceRaw,
  InteractionRaw,
  ReceptorRaw,
  NeuroNode,
  NeuroLink,
  LayerFilter,
  ReceptorOverlay,
} from "./neuro-types";
import {
  CLASS_COLORS,
  DEFAULT_NODE_COLOR,
  RECEPTOR_COLORS,
  LAYER_FILTERS,
  RECEPTOR_OVERLAYS,
} from "./neuro-types";
import { simulationTick, hitTest } from "./neuro-simulation";
import { NeuroPanel } from "./neuro-panel";

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

/** Build graph nodes from raw substance data */
function buildNodes(substances: SubstanceRaw[], w: number, h: number): NeuroNode[] {
  return substances.map((s, i) => {
    const angle = (2 * Math.PI * i) / substances.length;
    const spread = Math.min(w, h) * 0.35;
    return {
      id: s.id,
      slug: s.slug,
      label: s.title,
      classPrimary: s.class_primary,
      receptors: s.receptors,
      mechanisms: s.mechanisms,
      riskLevel: s.risk_level,
      summary: s.summary,
      sources: s.sources,
      radius: Math.max(10, 8 + s.receptors.length * 3),
      x: w / 2 + Math.cos(angle) * spread + (Math.random() - 0.5) * 40,
      y: h / 2 + Math.sin(angle) * spread + (Math.random() - 0.5) * 40,
      vx: 0,
      vy: 0,
    };
  });
}

/** Build links between nodes */
function buildLinks(
  substances: SubstanceRaw[],
  interactions: InteractionRaw[],
): NeuroLink[] {
  const links: NeuroLink[] = [];
  const seen = new Set<string>();
  const addOnce = (s: string, t: string, type: NeuroLink["type"], risk?: string) => {
    const key = [s, t].sort().join("|") + type;
    if (seen.has(key)) return;
    seen.add(key);
    links.push({ source: s, target: t, type, risk });
  };

  /* same class */
  for (let i = 0; i < substances.length; i++) {
    for (let j = i + 1; j < substances.length; j++) {
      if (substances[i].class_primary === substances[j].class_primary) {
        addOnce(substances[i].id, substances[j].id, "class");
      }
    }
  }

  /* shared receptor */
  for (let i = 0; i < substances.length; i++) {
    for (let j = i + 1; j < substances.length; j++) {
      const shared = substances[i].receptors.filter((r) =>
        substances[j].receptors.includes(r),
      );
      if (shared.length > 0) {
        addOnce(substances[i].id, substances[j].id, "receptor");
      }
    }
  }

  /* known interactions */
  for (const ix of interactions) {
    addOnce(ix.a, ix.b, "interaction", ix.risk);
  }

  return links;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface NeuroMapProps {
  substances: SubstanceRaw[];
  interactions: InteractionRaw[];
  receptors: ReceptorRaw[];
}

export function NeuroMap({ substances, interactions }: NeuroMapProps) {
  /* refs */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<NeuroNode[]>([]);
  const linksRef = useRef<NeuroLink[]>([]);
  const rafRef = useRef<number>(0);
  const tickRef = useRef(0);

  /* state */
  const [selected, setSelected] = useState<NeuroNode | null>(null);
  const [compareNode, setCompareNode] = useState<NeuroNode | null>(null);
  const [hovered, setHovered] = useState<NeuroNode | null>(null);
  const [search, setSearch] = useState("");
  const [activeLayers, setActiveLayers] = useState<Set<LayerFilter>>(
    new Set(LAYER_FILTERS),
  );
  const [activeReceptors, setActiveReceptors] = useState<Set<ReceptorOverlay>>(
    new Set(),
  );
  const [dangerMode, setDangerMode] = useState(false);
  const [pulseMode, setPulseMode] = useState(true);
  const [showLayers, setShowLayers] = useState(false);
  const [showReceptors, setShowReceptors] = useState(false);

  /* drag state (refs to avoid re-render) */
  const dragNode = useRef<NeuroNode | null>(null);

  /* zoom / pan state */
  const camRef = useRef({ x: 0, y: 0, scale: 1 });
  const panStart = useRef<{ x: number; y: number } | null>(null);

  /* ---- initialise graph data ---- */
  useEffect(() => {
    const w = containerRef.current?.clientWidth ?? 900;
    const h = containerRef.current?.clientHeight ?? 600;
    nodesRef.current = buildNodes(substances, w, h);
    linksRef.current = buildLinks(substances, interactions);
  }, [substances, interactions]);

  /* ---- canvas to world coords ---- */
  const canvasToWorld = useCallback((cx: number, cy: number) => {
    const cam = camRef.current;
    return {
      x: (cx - cam.x) / cam.scale,
      y: (cy - cam.y) / cam.scale,
    };
  }, []);

  /* ---- render loop ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const w = containerRef.current?.clientWidth ?? 900;
      const h = containerRef.current?.clientHeight ?? 600;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const w = containerRef.current?.clientWidth ?? 900;
      const h = containerRef.current?.clientHeight ?? 600;
      const cam = camRef.current;

      /* physics tick */
      const visibleIds = new Set(
        nodesRef.current
          .filter((n) => activeLayers.has(n.classPrimary as LayerFilter))
          .map((n) => n.id),
      );
      const visibleNodes = nodesRef.current.filter((n) => visibleIds.has(n.id));
      const visibleLinks = linksRef.current.filter(
        (l) => visibleIds.has(l.source) && visibleIds.has(l.target),
      );

      simulationTick(visibleNodes, visibleLinks, w, h);
      tickRef.current++;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.scale, cam.scale);

      const nodeMap = new Map<string, NeuroNode>();
      for (const n of visibleNodes) nodeMap.set(n.id, n);

      const pulse = pulseMode ? 0.5 + 0.5 * Math.sin(tickRef.current * 0.02) : 1;

      /* ---- draw links ---- */
      for (const link of visibleLinks) {
        const a = nodeMap.get(link.source);
        const b = nodeMap.get(link.target);
        if (!a || !b) continue;

        let alpha = 0.15;
        let color = "#555";
        let lineWidth = 0.5;

        if (link.type === "interaction") {
          color = link.risk === "high" ? "#ef4444" : "#f59e0b";
          alpha = dangerMode && link.risk === "high" ? 0.8 : 0.25;
          lineWidth = dangerMode && link.risk === "high" ? 2 : 1;
        } else if (link.type === "receptor") {
          color = "#06b6d4";
          alpha = 0.1;
        }

        /* highlight links for selected node */
        if (selected && (link.source === selected.id || link.target === selected.id)) {
          alpha = 0.6;
          lineWidth = 1.5;
        }

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      /* ---- draw nodes ---- */
      const searchLower = search.toLowerCase();
      for (const node of visibleNodes) {
        const isSelected = selected?.id === node.id || compareNode?.id === node.id;
        const isHovered = hovered?.id === node.id;
        const matchesSearch =
          searchLower.length > 0 && node.label.toLowerCase().includes(searchLower);
        const dimmed =
          searchLower.length > 0 && !matchesSearch;

        /* receptor overlay colouring */
        let nodeColor = CLASS_COLORS[node.classPrimary] ?? DEFAULT_NODE_COLOR;
        if (activeReceptors.size > 0) {
          const matched = node.receptors.filter((r) =>
            activeReceptors.has(r as ReceptorOverlay),
          );
          if (matched.length > 0) {
            nodeColor = RECEPTOR_COLORS[matched[0]] ?? nodeColor;
          } else {
            nodeColor = "#333";
          }
        }

        const r = node.radius * (isHovered ? 1.3 : 1) * (isSelected ? 1.2 : 1);

        /* glow */
        if (isSelected || isHovered || matchesSearch) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2);
          ctx.fillStyle = nodeColor;
          ctx.globalAlpha = 0.25 * pulse;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        /* danger ring */
        if (dangerMode && node.riskLevel === "high") {
          ctx.beginPath();
          ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "#ef4444";
          ctx.globalAlpha = 0.6 * pulse;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }

        /* main circle */
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.globalAlpha = dimmed ? 0.15 : 0.85 * (pulseMode ? 0.7 + 0.3 * pulse : 1);
        ctx.fill();
        ctx.globalAlpha = 1;

        /* border */
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? "#fff" : nodeColor;
        ctx.globalAlpha = dimmed ? 0.1 : 0.6;
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.stroke();
        ctx.globalAlpha = 1;

        /* label */
        if (!dimmed || isHovered) {
          ctx.font = `${isHovered || isSelected ? "bold " : ""}${Math.max(9, r * 0.8)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = "#e5e5e5";
          ctx.globalAlpha = dimmed ? 0.3 : 0.9;
          ctx.fillText(node.label, node.x, node.y + r + 4);
          ctx.globalAlpha = 1;
        }
      }

      /* ---- hover tooltip ---- */
      if (hovered && !dragNode.current) {
        const tt = hovered;
        const tx = tt.x;
        const ty = tt.y - tt.radius - 38;
        const lines = [
          tt.label,
          tt.classPrimary,
          `Rezeptoren: ${tt.receptors.join(", ")}`,
        ];
        ctx.font = "11px sans-serif";
        const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
        const boxH = lines.length * 16 + 12;
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.beginPath();
        ctx.roundRect(tx - maxW / 2, ty - boxH, maxW, boxH, 6);
        ctx.fill();
        ctx.fillStyle = "#e5e5e5";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        lines.forEach((line, i) => {
          ctx.font = i === 0 ? "bold 11px sans-serif" : "11px sans-serif";
          ctx.fillText(line, tx, ty - boxH + 8 + i * 16);
        });
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [
    activeLayers,
    activeReceptors,
    dangerMode,
    pulseMode,
    search,
    selected,
    compareNode,
    hovered,
  ]);

  /* ---- pointer handlers ---- */
  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const { x, y } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const hit = hitTest(
        nodesRef.current.filter((n) =>
          activeLayers.has(n.classPrimary as LayerFilter),
        ),
        x,
        y,
      );
      if (hit) {
        dragNode.current = hit;
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      } else {
        panStart.current = { x: e.clientX - camRef.current.x, y: e.clientY - camRef.current.y };
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      }
    },
    [canvasToWorld, activeLayers],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (dragNode.current) {
        const { x, y } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
        dragNode.current.x = x;
        dragNode.current.y = y;
        dragNode.current.vx = 0;
        dragNode.current.vy = 0;
        return;
      }

      if (panStart.current) {
        camRef.current.x = e.clientX - panStart.current.x;
        camRef.current.y = e.clientY - panStart.current.y;
        return;
      }

      /* hover detection */
      const { x, y } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const hit = hitTest(
        nodesRef.current.filter((n) =>
          activeLayers.has(n.classPrimary as LayerFilter),
        ),
        x,
        y,
      );
      setHovered(hit ?? null);
    },
    [canvasToWorld, activeLayers],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (dragNode.current) {
        /* if the drag was tiny, treat as a click */
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const { x, y } = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top);
          const hit = hitTest(
            nodesRef.current.filter((n) =>
              activeLayers.has(n.classPrimary as LayerFilter),
            ),
            x,
            y,
          );
          if (hit) {
            if (selected && selected.id !== hit.id) {
              setCompareNode(hit);
            } else {
              setSelected(hit);
              setCompareNode(null);
            }
          }
        }
        dragNode.current = null;
        return;
      }
      panStart.current = null;
    },
    [canvasToWorld, activeLayers, selected],
  );

  /* mouse wheel zoom */
  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const cam = camRef.current;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const zoom = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.3, Math.min(4, cam.scale * zoom));
      cam.x = mx - ((mx - cam.x) / cam.scale) * newScale;
      cam.y = my - ((my - cam.y) / cam.scale) * newScale;
      cam.scale = newScale;
    },
    [],
  );

  /* toggle helpers */
  const toggleLayer = (layer: LayerFilter) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) next.delete(layer);
      else next.add(layer);
      return next;
    });
  };

  const toggleReceptor = (r: ReceptorOverlay) => {
    setActiveReceptors((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  };

  /* interactions for selected node */
  const nodeInteractions = selected
    ? interactions.filter((ix) => ix.a === selected.id || ix.b === selected.id)
    : [];

  return (
    <div ref={containerRef} className="relative h-[calc(100vh-12rem)] w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
      {/* ---- controls bar ---- */}
      <div className="absolute left-3 top-3 z-20 flex flex-wrap items-start gap-2">
        {/* search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-neutral-500" />
          <Input
            placeholder="Substanz suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-48 border-neutral-700 bg-neutral-900/90 pl-8 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-cyan-600 sm:w-56"
          />
        </div>

        {/* layer toggle */}
        <button
          onClick={() => setShowLayers((v) => !v)}
          className={`flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors ${
            showLayers
              ? "border-cyan-600 bg-cyan-950/60 text-cyan-400"
              : "border-neutral-700 bg-neutral-900/90 text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Layer
        </button>

        {/* receptor overlay toggle */}
        <button
          onClick={() => setShowReceptors((v) => !v)}
          className={`flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors ${
            showReceptors
              ? "border-purple-600 bg-purple-950/60 text-purple-400"
              : "border-neutral-700 bg-neutral-900/90 text-neutral-400 hover:text-neutral-200"
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          Rezeptoren
        </button>

        {/* pulse mode */}
        <button
          onClick={() => setPulseMode((v) => !v)}
          className={`flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors ${
            pulseMode
              ? "border-cyan-600 bg-cyan-950/60 text-cyan-400"
              : "border-neutral-700 bg-neutral-900/90 text-neutral-400 hover:text-neutral-200"
          }`}
          title="Neural Pulse Mode"
        >
          <Zap className="h-3.5 w-3.5" />
          Pulse
        </button>

        {/* danger mode */}
        <button
          onClick={() => setDangerMode((v) => !v)}
          className={`flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors ${
            dangerMode
              ? "border-red-600 bg-red-950/60 text-red-400"
              : "border-neutral-700 bg-neutral-900/90 text-neutral-400 hover:text-neutral-200"
          }`}
          title="Interaction Danger Mode"
        >
          <ZapOff className="h-3.5 w-3.5" />
          Danger
        </button>
      </div>

      {/* ---- layer filter dropdown ---- */}
      {showLayers && (
        <div className="absolute left-3 top-14 z-20 rounded-lg border border-neutral-700 bg-neutral-900/95 p-3 backdrop-blur-sm">
          <p className="mb-2 text-xs font-semibold text-neutral-500">
            Stoffgruppen-Layer
          </p>
          <div className="flex flex-wrap gap-1.5">
            {LAYER_FILTERS.map((layer) => (
              <button
                key={layer}
                onClick={() => toggleLayer(layer)}
                className="transition-opacity"
              >
                <Badge
                  style={{
                    backgroundColor: activeLayers.has(layer)
                      ? CLASS_COLORS[layer] ?? "#555"
                      : "transparent",
                    color: activeLayers.has(layer) ? "#000" : "#666",
                    borderColor: CLASS_COLORS[layer] ?? "#555",
                    borderWidth: 1,
                  }}
                >
                  {layer}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- receptor overlay dropdown ---- */}
      {showReceptors && (
        <div className="absolute left-3 top-14 z-20 rounded-lg border border-neutral-700 bg-neutral-900/95 p-3 backdrop-blur-sm">
          <p className="mb-2 text-xs font-semibold text-neutral-500">
            Rezeptor-Overlay
          </p>
          <div className="flex flex-wrap gap-1.5">
            {RECEPTOR_OVERLAYS.map((r) => (
              <button key={r} onClick={() => toggleReceptor(r)}>
                <Badge
                  style={{
                    backgroundColor: activeReceptors.has(r)
                      ? RECEPTOR_COLORS[r] ?? "#555"
                      : "transparent",
                    color: activeReceptors.has(r) ? "#000" : "#666",
                    borderColor: RECEPTOR_COLORS[r] ?? "#555",
                    borderWidth: 1,
                  }}
                >
                  {r}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- legend (bottom-left) ---- */}
      <div className="absolute bottom-3 left-3 z-10 rounded-lg border border-neutral-800 bg-neutral-950/80 px-3 py-2 backdrop-blur-sm">
        <p className="mb-1 text-[10px] uppercase tracking-wider text-neutral-600">
          Legende
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(CLASS_COLORS).map(([cls, col]) => (
            <span key={cls} className="flex items-center gap-1 text-[10px] text-neutral-400">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: col }} />
              {cls}
            </span>
          ))}
        </div>
      </div>

      {/* ---- canvas ---- */}
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      />

      {/* ---- side panel ---- */}
      {selected && (
        <NeuroPanel
          node={selected}
          interactions={nodeInteractions}
          compareNode={compareNode ?? undefined}
          onClose={() => {
            setSelected(null);
            setCompareNode(null);
          }}
        />
      )}

      {/* ---- compare hint ---- */}
      {selected && !compareNode && (
        <div className="absolute bottom-3 right-3 z-10 rounded-lg border border-cyan-900 bg-cyan-950/60 px-3 py-2 text-xs text-cyan-400 backdrop-blur-sm">
          Klicke eine zweite Substanz für den Vergleichsmodus
        </div>
      )}
    </div>
  );
}
