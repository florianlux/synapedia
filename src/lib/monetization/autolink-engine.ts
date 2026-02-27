/**
 * Smart Contextual Linking Engine
 *
 * Parses MDX/text content and wraps the FIRST occurrence of each known entity
 * name with a link/tooltip trigger.
 *
 * Rules:
 * 1. Only the first occurrence per entity per page is linked.
 * 2. Never auto-link inside: headings, code blocks, existing anchors, or
 *    sections wrapped with the <NoAutoLink> escape hatch.
 * 3. Entity must have evidence_score >= threshold AND monetization_enabled = true.
 * 4. High-risk / controlled entities are never auto-linked unless explicitly
 *    whitelisted (autolink_whitelisted = true).
 *
 * Algorithm overview (deterministic, no regex on untrusted HTML):
 * - Work on the MDX *source* (Markdown text), not rendered HTML.
 * - Split content into lines. Classify each line as "linkable" or "protected".
 * - For linkable lines, do case-insensitive substring scanning using a sorted
 *   (longest-first) list of entity names/synonyms.
 * - Replace the first match per entity with a Markdown link
 *   `[EntityName](/entities/slug)` or a custom component marker.
 */

import type { EntityDictionaryEntry, AutolinkConfig } from "./types";
import { DEFAULT_AUTOLINK_CONFIG } from "./types";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AutolinkResult {
  /** The transformed MDX source with auto-links injected */
  content: string;
  /** Entity IDs that were linked (for downstream use, e.g. prefetch providers) */
  linkedEntityIds: string[];
}

/**
 * Process MDX source and auto-link entity mentions.
 *
 * @param mdxSource     - Raw MDX/Markdown content
 * @param dictionary    - Map of lowercase name/synonym → entity entry
 * @param config        - Autolink thresholds and rules
 * @returns Transformed MDX and list of linked entity IDs
 */
export function autolinkEntities(
  mdxSource: string,
  dictionary: Map<string, EntityDictionaryEntry>,
  config: AutolinkConfig = DEFAULT_AUTOLINK_CONFIG,
): AutolinkResult {
  if (!mdxSource || dictionary.size === 0) {
    return { content: mdxSource, linkedEntityIds: [] };
  }

  // Build a sorted list of candidate terms (longest first for greedy matching)
  const candidates = buildCandidateList(dictionary, config);
  if (candidates.length === 0) {
    return { content: mdxSource, linkedEntityIds: [] };
  }

  const linkedEntityIds = new Set<string>();
  const lines = mdxSource.split("\n");
  let inCodeBlock = false;
  let inNoAutoLink = false;
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Toggle fenced code block state
    if (trimmed.startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }

    // Track <NoAutoLink> wrapper boundaries
    if (trimmed === "<NoAutoLink>" || trimmed.startsWith("<NoAutoLink>")) {
      inNoAutoLink = true;
      result.push(line);
      continue;
    }
    if (trimmed === "</NoAutoLink>" || trimmed.startsWith("</NoAutoLink>")) {
      inNoAutoLink = false;
      result.push(line);
      continue;
    }

    // Protected zones: code blocks, headings, NoAutoLink sections
    if (inCodeBlock || inNoAutoLink || isProtectedLine(trimmed)) {
      result.push(line);
      continue;
    }

    // Process linkable line
    const processed = linkLine(line, candidates, linkedEntityIds);
    result.push(processed);
  }

  return {
    content: result.join("\n"),
    linkedEntityIds: Array.from(linkedEntityIds),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface Candidate {
  term: string; // lowercase search term
  originalTerm: string; // original casing for display
  entry: EntityDictionaryEntry;
}

/**
 * Build a sorted (longest-first) list of terms eligible for autolinking.
 */
function buildCandidateList(
  dictionary: Map<string, EntityDictionaryEntry>,
  config: AutolinkConfig,
): Candidate[] {
  const seen = new Set<string>(); // deduplicate by entity_id
  const candidates: Candidate[] = [];

  for (const [term, entry] of dictionary) {
    // Skip if entity doesn't meet thresholds
    if (!entry.monetization_enabled) continue;
    if (entry.evidence_score < config.minEvidenceScore) continue;

    // High-risk gate: only link if explicitly whitelisted
    if (entry.risk_level === "high" && !config.allowHighRisk && !entry.autolink_whitelisted) {
      continue;
    }

    // Skip very short terms (< 2 chars) to avoid false positives
    if (term.length < 2) continue;

    candidates.push({
      term,
      originalTerm: entry.name,
      entry,
    });
  }

  // Sort longest first → greedy matching
  candidates.sort((a, b) => b.term.length - a.term.length);

  // Deduplicate: keep only the first (longest) candidate per entity_id
  const deduped: Candidate[] = [];
  for (const c of candidates) {
    if (!seen.has(c.entry.entity_id)) {
      seen.add(c.entry.entity_id);
      deduped.push(c);
    }
  }

  return deduped;
}

/**
 * Check if a line is protected from autolinking.
 */
function isProtectedLine(trimmed: string): boolean {
  // Headings (# ... ######)
  if (/^#{1,6}\s/.test(trimmed)) return true;

  // HTML headings
  if (/^<h[1-6][\s>]/i.test(trimmed)) return true;

  // Import statements
  if (trimmed.startsWith("import ")) return true;

  // JSX component tags (uppercase first letter)
  if (/^<[A-Z]/.test(trimmed)) return true;

  return false;
}

/**
 * Scan a single line for entity mentions and replace the FIRST occurrence
 * of each not-yet-linked entity.
 *
 * Uses indexOf-based scanning (not regex) to avoid ReDoS and broken HTML.
 */
function linkLine(
  line: string,
  candidates: Candidate[],
  linkedEntityIds: Set<string>,
): string {
  let result = line;

  for (const candidate of candidates) {
    // Skip if this entity was already linked on a previous line
    if (linkedEntityIds.has(candidate.entry.entity_id)) continue;

    const idx = findEntityMention(result, candidate.term);
    if (idx === -1) continue;

    // Extract the original-cased text from the content at the match position
    const matchedText = result.slice(idx, idx + candidate.term.length);

    // Verify match is not inside an existing Markdown link [...](...) or inline code
    if (isInsideLink(result, idx) || isInsideInlineCode(result, idx)) {
      continue;
    }

    // Replace with Markdown link
    const link = `[${matchedText}](/entities/${candidate.entry.slug})`;
    result = result.slice(0, idx) + link + result.slice(idx + candidate.term.length);

    linkedEntityIds.add(candidate.entry.entity_id);
  }

  return result;
}

/**
 * Case-insensitive indexOf that respects word boundaries.
 * Uses simple character scanning (no regex).
 */
function findEntityMention(text: string, term: string): number {
  const lowerText = text.toLowerCase();
  let startPos = 0;

  while (startPos <= lowerText.length - term.length) {
    const idx = lowerText.indexOf(term, startPos);
    if (idx === -1) return -1;

    // Check word boundaries
    const charBefore = idx > 0 ? lowerText[idx - 1] : " ";
    const charAfter = idx + term.length < lowerText.length ? lowerText[idx + term.length] : " ";

    if (isWordBoundary(charBefore) && isWordBoundary(charAfter)) {
      return idx;
    }

    startPos = idx + 1;
  }

  return -1;
}

/** Characters that count as word boundaries */
function isWordBoundary(ch: string): boolean {
  return /[\s,.:;!?()\[\]{}"'\/\-—–]/.test(ch) || ch === " ";
}

/**
 * Check if position `idx` falls inside an existing Markdown link.
 * Simple heuristic: scan backwards for unmatched `[` and forward for `](`
 */
function isInsideLink(text: string, idx: number): boolean {
  // Look backwards for `[`
  let bracketDepth = 0;
  for (let i = idx - 1; i >= 0; i--) {
    if (text[i] === "]") bracketDepth++;
    if (text[i] === "[") {
      if (bracketDepth > 0) {
        bracketDepth--;
      } else {
        // Found unmatched `[` – we're inside link text
        // Verify there's a closing `](...)` after idx
        const afterIdx = text.indexOf("](", idx);
        if (afterIdx !== -1) return true;
        break;
      }
    }
  }
  return false;
}

/**
 * Check if position `idx` falls inside inline code (backticks).
 */
function isInsideInlineCode(text: string, idx: number): boolean {
  let backtickCount = 0;
  for (let i = 0; i < idx; i++) {
    if (text[i] === "`") backtickCount++;
  }
  // If odd number of backticks before position, we're inside code
  return backtickCount % 2 === 1;
}
