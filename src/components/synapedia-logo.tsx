/**
 * Minimalist neural-network logo for Synapedia.
 * Pure inline SVG – no external deps. Subtle twinkle on nodes via CSS.
 */
export function SynapediaLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={`brand-logo-glow ${className}`}
      aria-hidden="true"
      role="img"
    >
      {/* Connecting lines (neural paths) */}
      <line x1="16" y1="7" x2="9" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <line x1="16" y1="7" x2="23" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <line x1="9" y1="16" x2="16" y2="25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <line x1="23" y1="16" x2="16" y2="25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
      <line x1="9" y1="16" x2="23" y2="16" stroke="currentColor" strokeWidth="1.0" strokeLinecap="round" opacity="0.3" />

      {/* Nodes (neural points) */}
      <circle cx="16" cy="7" r="2.2" fill="currentColor" opacity="0.85" />
      <circle cx="9" cy="16" r="2" fill="currentColor" className="brand-twinkle" style={{ animationDuration: "var(--brand-twinkle-duration)", animationName: "brand-twinkle", animationIterationCount: "infinite", animationTimingFunction: "ease-in-out" }} />
      <circle cx="23" cy="16" r="2" fill="currentColor" className="brand-twinkle" style={{ animationDuration: "var(--brand-twinkle-duration)", animationDelay: "1.5s", animationName: "brand-twinkle", animationIterationCount: "infinite", animationTimingFunction: "ease-in-out" }} />
      <circle cx="16" cy="25" r="2.2" fill="currentColor" opacity="0.85" />

      {/* Subtle outer accent dots */}
      <circle cx="5" cy="10" r="1" fill="currentColor" className="brand-twinkle" style={{ animationDuration: "var(--brand-twinkle-duration)", animationDelay: "2.5s", animationName: "brand-twinkle", animationIterationCount: "infinite", animationTimingFunction: "ease-in-out" }} />
      <circle cx="27" cy="10" r="1" fill="currentColor" className="brand-twinkle" style={{ animationDuration: "var(--brand-twinkle-duration)", animationDelay: "3.2s", animationName: "brand-twinkle", animationIterationCount: "infinite", animationTimingFunction: "ease-in-out" }} />
      <circle cx="5" cy="22" r="0.8" fill="currentColor" opacity="0.4" />
      <circle cx="27" cy="22" r="0.8" fill="currentColor" opacity="0.4" />

      {/* Faint connecting lines to outer dots */}
      <line x1="9" y1="16" x2="5" y2="10" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" opacity="0.2" />
      <line x1="23" y1="16" x2="27" y2="10" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" opacity="0.2" />
    </svg>
  );
}
