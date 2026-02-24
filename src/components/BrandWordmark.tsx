/**
 * Refined Synapedia brand wordmark.
 *
 * Renders:
 * - A watermark Aesculapius staff (Rod of Asclepius) centered behind the text.
 * - The letter "S" as a snake-shaped inline SVG with a subtle shimmer animation.
 * - The remaining letters "ynapedia" as clean text.
 */
export function BrandWordmark({
  as: Tag = "span",
  className = "",
}: {
  as?: "span" | "h1" | "h2" | "h3" | "div" | "p";
  className?: string;
}) {
  return (
    <Tag className={`brand-wrap ${className}`}>
      {/* Aesculapius staff watermark behind text */}
      <svg
        className="brand-emblem"
        viewBox="0 0 40 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <line
          x1="20" y1="6" x2="20" y2="114"
          stroke="currentColor" strokeWidth="3" strokeLinecap="round"
        />
        <path
          d="M20 16 C34 24,34 32,20 40 C6 48,6 56,20 64 C34 72,34 80,20 88"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        />
        <ellipse cx="20" cy="14" rx="3.5" ry="2.5" fill="currentColor" />
      </svg>

      {/* Snake "S" letterform */}
      <svg
        className="brand-snake"
        viewBox="0 0 20 26"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="S"
      >
        <path
          className="brand-snake-body"
          d="M15 4.5 C16 1,4 0.5,4 5.5 C4 11,16 13,16 18.5 C16 24.5,4 25,4 21.5"
          stroke="var(--brand-accent)"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          className="brand-snake-shimmer"
          d="M15 4.5 C16 1,4 0.5,4 5.5 C4 11,16 13,16 18.5 C16 24.5,4 25,4 21.5"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeDasharray="8 80"
        />
        <path
          d="M15 4 L17.5 1.5 M15 4 L18 3"
          stroke="var(--brand-accent)"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>

      <span className="brand-text">ynapedia</span>
    </Tag>
  );
}
