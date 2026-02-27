/**
 * Stack Builder Algorithm
 * Generates evidence-based nootropic stacks based on goals and preferences
 */

import type {
  Entity,
  EntityWithRelations,
  Stack,
  StackGoal,
  StackBuilderInput,
  StackBuilderOutput,
  StackComponentWithEntity,
  AffiliateLinkWithProvider,
} from "@/lib/types";

// Entity compatibility matrix for interaction checking
interface EntityInteraction {
  entity1_slug: string;
  entity2_slug: string;
  interaction_type: "synergistic" | "safe" | "caution" | "dangerous";
  notes: string;
}

/**
 * Goal-to-entity mapping priorities
 * Higher priority = more relevant for the goal
 */
const GOAL_ENTITY_PRIORITIES: Record<StackGoal, Record<string, number>> = {
  focus: {
    // Example mappings - to be populated with actual entity slugs
    default: 50,
  },
  sleep: {
    default: 50,
  },
  stress: {
    default: 50,
  },
  neuroprotection: {
    default: 50,
  },
  memory: {
    default: 50,
  },
  mood: {
    default: 50,
  },
  energy: {
    default: 50,
  },
  general: {
    default: 50,
  },
};

/**
 * Score an entity for a specific goal
 */
function scoreEntityForGoal(
  entity: Entity,
  goal: StackGoal,
  mechanisms: EntityWithRelations["mechanisms"]
): number {
  let score = 0;

  // Base score from evidence
  score += (entity.evidence_score || 0) * 0.5;

  // Goal-specific priority
  const goalPriorities = GOAL_ENTITY_PRIORITIES[goal];
  const goalPriority = goalPriorities[entity.slug] || goalPriorities.default;
  score += goalPriority * 0.3;

  // Mechanism relevance (placeholder - would need goal-mechanism mapping)
  if (mechanisms && mechanisms.length > 0) {
    score += mechanisms.length * 5;
  }

  // Type bonus (nootropics get priority)
  if (entity.entity_type === "nootropic") {
    score += 10;
  }

  return score;
}

/**
 * Check for dangerous interactions between entities
 */
function checkInteractions(
  entities: Entity[],
  interactions: EntityInteraction[]
): string[] {
  const warnings: string[] = [];
  const entitySlugs = entities.map((e) => e.slug);

  for (const interaction of interactions) {
    if (
      entitySlugs.includes(interaction.entity1_slug) &&
      entitySlugs.includes(interaction.entity2_slug)
    ) {
      if (
        interaction.interaction_type === "dangerous" ||
        interaction.interaction_type === "caution"
      ) {
        warnings.push(
          `⚠️ ${interaction.entity1_slug} + ${interaction.entity2_slug}: ${interaction.notes}`
        );
      }
    }
  }

  return warnings;
}

/**
 * Build a stack based on user preferences
 */
export async function buildStack(
  input: StackBuilderInput,
  availableEntities: EntityWithRelations[],
  interactions: EntityInteraction[] = []
): Promise<StackBuilderOutput> {
  const { goal, budget_range, sensitivity, exclude_entities = [] } =
    input;

  // Filter entities
  const candidateEntities = availableEntities
    .filter((e) => !exclude_entities.includes(e.slug))
    .filter((e) => e.entity_type === "nootropic" || e.entity_type === "compound")
    .filter((e) => (e.evidence_score || 0) >= 40); // Minimum evidence threshold

  // Score entities for this goal
  const scoredEntities = candidateEntities
    .map((entity) => ({
      entity,
      score: scoreEntityForGoal(entity, goal, entity.mechanisms),
    }))
    .sort((a, b) => b.score - a.score);

  // Select top entities based on sensitivity
  const maxComponents = sensitivity === "high" ? 3 : sensitivity === "medium" ? 5 : 7;
  const selectedEntities = scoredEntities
    .slice(0, maxComponents)
    .map((s) => s.entity);

  // Check for interactions
  const warnings = checkInteractions(selectedEntities, interactions);

  // Build stack components
  const components: StackComponentWithEntity[] = selectedEntities.map(
    (entity, index) => ({
      id: "", // Will be generated on insert
      stack_id: "", // Will be set when stack is created
      entity_id: entity.id,
      dose_range: null, // To be determined from entity data
      timing: null,
      priority: index,
      notes: null,
      created_at: new Date().toISOString(),
      entity,
    })
  );

  // Calculate total evidence score
  const totalEvidenceScore = Math.round(
    selectedEntities.reduce((sum, e) => sum + (e.evidence_score || 0), 0) /
      selectedEntities.length
  );

  // Create stack object
  const stack: Stack = {
    id: "", // Will be generated on insert
    name: `${goal.charAt(0).toUpperCase() + goal.slice(1)} Stack`,
    slug: `${goal}-stack-${Date.now()}`,
    goal,
    description: `Evidence-based stack for ${goal}`,
    evidence_score: totalEvidenceScore,
    evidence_grade: null,
    target_budget_range: budget_range || null,
    sensitivity_level: sensitivity || null,
    status: "draft",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Get affiliate links (will be populated by separate function)
  const affiliate_links: AffiliateLinkWithProvider[] = [];

  return {
    stack,
    components,
    total_evidence_score: totalEvidenceScore,
    warnings,
    affiliate_links,
  };
}

/**
 * Get recommended dose ranges for a stack component
 * Placeholder - would need pharmacokinetic data
 */
export function getRecommendedDoseRange(_entity: Entity): string {
  // This would query pharmacokinetic_routes table in real implementation
  return "Consult research";
}

/**
 * Validate stack for safety
 */
export function validateStack(
  components: Entity[],
  interactions: EntityInteraction[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for dangerous interactions
  const warnings = checkInteractions(components, interactions);
  errors.push(...warnings.filter((w) => w.includes("dangerous")));

  // Check for excessive component count
  if (components.length > 10) {
    errors.push("Stack contains too many components (max 10 recommended)");
  }

  // Check for duplicate mechanisms (overstimulation)
  // Placeholder - would need mechanism analysis

  return {
    valid: errors.length === 0,
    errors,
  };
}
