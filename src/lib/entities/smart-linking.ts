/**
 * Smart Contextual Linking Engine
 * Automatically links entity mentions in content based on evidence scores
 */

import type {
  Entity,
  SmartLinkingConfig,
} from "@/lib/types";
import { meetsEvidenceThreshold } from "./evidence-score";

// Default smart linking configuration
export const DEFAULT_SMART_LINKING_CONFIG: SmartLinkingConfig = {
  global_threshold: 50,
  category_thresholds: {
    compound: 50,
    nootropic: 60, // Higher threshold for nootropics
    neurotransmitter: 40,
    pathway: 40,
  },
  entity_overrides: {},
  enabled: true,
};

/**
 * Get effective threshold for an entity
 */
export function getEntityThreshold(
  entity: Entity,
  config: SmartLinkingConfig
): number {
  // Check for entity-specific override
  if (config.entity_overrides[entity.slug]) {
    return config.entity_overrides[entity.slug];
  }

  // Check for category-specific threshold
  if (config.category_thresholds[entity.entity_type]) {
    return config.category_thresholds[entity.entity_type];
  }

  // Fall back to global threshold
  return config.global_threshold;
}

/**
 * Check if entity should be linked based on evidence score
 */
export function shouldLinkEntity(
  entity: Entity,
  config: SmartLinkingConfig
): boolean {
  if (!config.enabled) return false;

  const threshold = getEntityThreshold(entity, config);
  return meetsEvidenceThreshold(entity.evidence_score, threshold);
}

/**
 * Parse content and identify entity mentions
 * Returns positions and entity info for first mention only
 */
export interface EntityMention {
  entity: Entity;
  position: number;
  text: string;
}

export function findEntityMentions(
  content: string,
  entities: Entity[],
  config: SmartLinkingConfig
): EntityMention[] {
  const mentions: EntityMention[] = [];
  const linkedEntities = new Set<string>(); // Track which entities we've already linked

  // Sort entities by name length (longest first) to handle overlaps
  const sortedEntities = [...entities].sort(
    (a, b) => b.name.length - a.name.length
  );

  for (const entity of sortedEntities) {
    // Skip if already linked or doesn't meet threshold
    if (linkedEntities.has(entity.slug)) continue;
    if (!shouldLinkEntity(entity, config)) continue;

    // Create case-insensitive regex for the entity name
    const regex = new RegExp(`\\b${escapeRegex(entity.name)}\\b`, "i");
    const match = content.match(regex);

    if (match && match.index !== undefined) {
      mentions.push({
        entity,
        position: match.index,
        text: match[0],
      });
      linkedEntities.add(entity.slug);
    }
  }

  // Sort by position
  return mentions.sort((a, b) => a.position - b.position);
}

/**
 * Replace entity mentions with smart links in HTML/MDX content
 */
export function injectSmartLinks(
  content: string,
  entities: Entity[],
  config: SmartLinkingConfig,
  linkGenerator: (entity: Entity) => string
): string {
  const mentions = findEntityMentions(content, entities, config);

  if (mentions.length === 0) return content;

  // Build the new content by replacing mentions
  let result = "";
  let lastIndex = 0;

  for (const mention of mentions) {
    // Add content before the mention
    result += content.slice(lastIndex, mention.position);

    // Add the smart link
    const link = linkGenerator(mention.entity);
    result += `<a href="${link}" class="smart-link" data-entity-id="${mention.entity.id}" data-evidence-score="${mention.entity.evidence_score || 0}">${mention.text}</a>`;

    lastIndex = mention.position + mention.text.length;
  }

  // Add remaining content
  result += content.slice(lastIndex);

  return result;
}

/**
 * Generate tooltip content for smart link
 */
export function generateSmartLinkTooltip(entity: Entity): string {
  const evidenceScore = entity.evidence_score || 0;
  const evidenceGrade = entity.evidence_grade || "N/A";

  return `
    <div class="smart-link-tooltip">
      <h4>${entity.name}</h4>
      <p>${entity.description || "Keine Beschreibung verfügbar"}</p>
      <div class="evidence-info">
        <span class="evidence-score">Evidence Score: ${evidenceScore}</span>
        <span class="evidence-grade">${evidenceGrade}</span>
      </div>
      <div class="actions">
        <a href="/entities/${entity.slug}">View Research</a>
        ${entity.entity_type === "nootropic" ? '<a href="/entities/${entity.slug}#sources">Verified Sources</a>' : ""}
      </div>
    </div>
  `.trim();
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
