/**
 * Minimalist neural-network logo for Synapedia.
 * Pure inline SVG – no external deps.
 * Static high-contrast base with optional subtle snake breathing motion.
 */
export function SynapediaLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={`brand-logo-glow ${className}`}
      aria-hidden="true"
    >
      {/* Connecting lines (neural paths) */}
      <line x1="16" y1="7" x2="9" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <line x1="16" y1="7" x2="23" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <line x1="9" y1="16" x2="16" y2="25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <line x1="23" y1="16" x2="16" y2="25" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
      <line x1="9" y1="16" x2="23" y2="16" stroke="currentColor" strokeWidth="1.0" strokeLinecap="round" opacity="0.45" />

      {/* Nodes (neural points) */}
      <circle cx="16" cy="7" r="2.2" fill="currentColor" opacity="0.95" className="brand-snake-breathe" />
      <circle cx="9" cy="16" r="2" fill="currentColor" opacity="0.9" />
      <circle cx="23" cy="16" r="2" fill="currentColor" opacity="0.9" />
      <circle cx="16" cy="25" r="2.2" fill="currentColor" opacity="0.95" />

      {/* Subtle outer accent dots */}
      <circle cx="5" cy="10" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="27" cy="10" r="1" fill="currentColor" opacity="0.6" />
      <circle cx="5" cy="22" r="0.8" fill="currentColor" opacity="0.5" />
      <circle cx="27" cy="22" r="0.8" fill="currentColor" opacity="0.5" />

      {/* Faint connecting lines to outer dots */}
      <line x1="9" y1="16" x2="5" y2="10" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
      <line x1="23" y1="16" x2="27" y2="10" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}
