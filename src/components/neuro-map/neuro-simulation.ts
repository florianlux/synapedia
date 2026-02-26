/* ------------------------------------------------------------------ */
/*  NeuroMap – force-directed graph simulation                        */
/* ------------------------------------------------------------------ */

import type { NeuroNode, NeuroLink } from "./neuro-types";

/** Tunable simulation parameters */
const REPULSION = 3000;
const ATTRACTION = 0.005;
const DAMPING = 0.85;
const CENTER_GRAVITY = 0.01;
const MAX_SPEED = 4;
const LINK_DISTANCE = 140;

/**
 * Run one tick of force-directed simulation.
 * Mutates node positions and velocities in-place.
 */
export function simulationTick(
  nodes: NeuroNode[],
  links: NeuroLink[],
  width: number,
  height: number,
): void {
  const cx = width / 2;
  const cy = height / 2;
  const nodeMap = new Map<string, NeuroNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  /* ---- repulsion (all pairs) ---- */
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = REPULSION / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }
  }

  /* ---- attraction along links ---- */
  for (const link of links) {
    const a = nodeMap.get(link.source);
    const b = nodeMap.get(link.target);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const displacement = dist - LINK_DISTANCE;
    const force = ATTRACTION * displacement;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }

  /* ---- center gravity ---- */
  for (const n of nodes) {
    n.vx += (cx - n.x) * CENTER_GRAVITY;
    n.vy += (cy - n.y) * CENTER_GRAVITY;
  }

  /* ---- integrate ---- */
  for (const n of nodes) {
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
    if (speed > MAX_SPEED) {
      n.vx = (n.vx / speed) * MAX_SPEED;
      n.vy = (n.vy / speed) * MAX_SPEED;
    }
    n.x += n.vx;
    n.y += n.vy;
    /* keep inside bounds with padding */
    const pad = n.radius + 10;
    n.x = Math.max(pad, Math.min(width - pad, n.x));
    n.y = Math.max(pad, Math.min(height - pad, n.y));
  }
}

/**
 * Find the node under a given (canvas) coordinate.
 * Returns undefined when nothing is hit.
 */
export function hitTest(
  nodes: NeuroNode[],
  px: number,
  py: number,
): NeuroNode | undefined {
  /* iterate in reverse so top-drawn nodes are checked first */
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    const dx = px - n.x;
    const dy = py - n.y;
    if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) return n;
  }
  return undefined;
}
