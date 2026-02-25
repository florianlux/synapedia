"use client";

import { useState } from "react";
import { Settings } from "lucide-react";

type GlowLevel = "low" | "med" | "high";

const glowValues: Record<GlowLevel, string> = {
  low: "0.08",
  med: "0.15",
  high: "0.25",
};

export function ThemeControls() {
  const [open, setOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [glow, setGlow] = useState<GlowLevel>("med");

  const applyGlow = (level: GlowLevel) => {
    setGlow(level);
    document.documentElement.style.setProperty(
      "--portfolio-glow-alpha",
      glowValues[level]
    );
  };

  const toggleMotion = () => {
    const next = !reduceMotion;
    setReduceMotion(next);
    document.documentElement.style.setProperty(
      "--portfolio-reduce-motion",
      next ? "1" : "0"
    );
  };

  return (
    <div className="fixed right-4 top-20 z-50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Theme controls"
        className="rounded-full border border-white/10 bg-neutral-900/80 p-2 text-neutral-400 backdrop-blur-sm transition-colors hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
      >
        <Settings className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-52 rounded-xl border border-white/10 bg-neutral-900/95 p-4 backdrop-blur-xl shadow-xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Display
          </p>

          {/* Reduce motion */}
          <label className="mb-3 flex cursor-pointer items-center justify-between">
            <span className="text-sm text-neutral-300">Reduce motion</span>
            <button
              type="button"
              role="switch"
              aria-checked={reduceMotion}
              onClick={toggleMotion}
              className={`relative h-5 w-9 rounded-full transition-colors ${
                reduceMotion ? "bg-cyan-500" : "bg-neutral-700"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                  reduceMotion ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </label>

          {/* Glow intensity */}
          <div>
            <span className="mb-2 block text-sm text-neutral-300">
              Glow intensity
            </span>
            <div className="flex gap-1">
              {(["low", "med", "high"] as GlowLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => applyGlow(level)}
                  className={`flex-1 rounded-md px-2 py-1 text-xs capitalize transition-colors ${
                    glow === level
                      ? "bg-cyan-500/20 text-cyan-300"
                      : "bg-white/5 text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
