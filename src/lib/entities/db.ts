/**
 * Entity Database Queries
 * Server-side functions for querying entity-related data
 */

import { createClient } from "@/lib/supabase/server";
import type {
  Entity,
  EntityWithRelations,
  EvidenceSource,
  AffiliateLinkWithProvider,
  AffiliateProvider,
  Stack,
  StackWithComponents,
  EntityType,
  StackGoal,
} from "@/lib/types";
import {
  calculateAggregateEvidenceScore,
  evidenceScoreToGrade,
} from "@/lib/entities/evidence-score";

/**
 * Get all entities
 */
export async function getEntities(
  filters?: {
    entity_type?: EntityType;
    min_evidence_score?: number;
  }
): Promise<Entity[]> {
  const supabase = await createClient();

  let query = supabase.from("entities").select("*");

  if (filters?.entity_type) {
    query = query.eq("entity_type", filters.entity_type);
  }

  if (filters?.min_evidence_score) {
    query = query.gte("evidence_score", filters.min_evidence_score);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching entities:", error);
    return [];
  }

  return data || [];
}

/**
 * Get entity by slug with all relations
 */
export async function getEntityBySlug(
  slug: string
): Promise<EntityWithRelations | null> {
  const supabase = await createClient();

  const { data: entity, error: entityError } = await supabase
    .from("entities")
    .select("*")
    .eq("slug", slug)
    .single();

  if (entityError || !entity) {
    console.error("Error fetching entity:", entityError);
    return null;
  }

  // Fetch mechanisms
  const { data: mechanisms } = await supabase
    .from("mechanisms")
    .select("*")
    .eq("entity_id", entity.id);

  // Fetch evidence sources
  const { data: evidence_sources } = await supabase
    .from("evidence_sources")
    .select("*")
    .eq("entity_id", entity.id);

  // Fetch affiliate links
  const { data: affiliate_links } = await supabase
    .from("affiliate_links")
    .select("*")
    .eq("entity_id", entity.id)
    .eq("active", true);

  return {
    ...entity,
    mechanisms: mechanisms || [],
    evidence_sources: evidence_sources || [],
    affiliate_links: affiliate_links || [],
  };
}

/**
 * Create or update entity
 */
export async function upsertEntity(entity: Partial<Entity>): Promise<Entity | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("entities")
    .upsert(entity)
    .select()
    .single();

  if (error) {
    console.error("Error upserting entity:", error);
    return null;
  }

  return data;
}

/**
 * Recalculate and update evidence score for an entity
 */
export async function recalculateEntityEvidenceScore(
  entityId: string
): Promise<boolean> {
  const supabase = await createClient();

  // Fetch all evidence sources
  const { data: sources, error: sourcesError } = await supabase
    .from("evidence_sources")
    .select("*")
    .eq("entity_id", entityId);

  if (sourcesError || !sources) {
    console.error("Error fetching evidence sources:", sourcesError);
    return false;
  }

  // Calculate score
  const evidenceScore = calculateAggregateEvidenceScore(sources);
  const evidenceGrade = evidenceScoreToGrade(evidenceScore);

  // Update entity
  const { error: updateError } = await supabase
    .from("entities")
    .update({
      evidence_score: evidenceScore,
      evidence_grade: evidenceGrade,
      updated_at: new Date().toISOString(),
    })
    .eq("id", entityId);

  if (updateError) {
    console.error("Error updating evidence score:", updateError);
    return false;
  }

  return true;
}

/**
 * Add evidence source to entity
 */
export async function addEvidenceSource(
  source: Partial<EvidenceSource>
): Promise<EvidenceSource | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("evidence_sources")
    .insert(source)
    .select()
    .single();

  if (error) {
    console.error("Error adding evidence source:", error);
    return null;
  }

  // Recalculate entity evidence score
  if (source.entity_id) {
    await recalculateEntityEvidenceScore(source.entity_id);
  }

  return data;
}

/**
 * Get affiliate providers
 */
export async function getAffiliateProviders(
  filters?: {
    region?: string;
    verified_only?: boolean;
  }
): Promise<AffiliateProvider[]> {
  const supabase = await createClient();

  let query = supabase.from("affiliate_providers").select("*");

  if (filters?.region) {
    query = query.eq("region", filters.region);
  }

  if (filters?.verified_only) {
    query = query.eq("verified", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching affiliate providers:", error);
    return [];
  }

  return data || [];
}

/**
 * Get affiliate links for entity with provider details
 */
export async function getEntityAffiliateLinks(
  entityId: string
): Promise<AffiliateLinkWithProvider[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("affiliate_links")
    .select(
      `
      *,
      provider:affiliate_providers(*)
    `
    )
    .eq("entity_id", entityId)
    .eq("active", true);

  if (error) {
    console.error("Error fetching affiliate links:", error);
    return [];
  }

  return (data || []) as unknown as AffiliateLinkWithProvider[];
}

/**
 * Get stacks
 */
export async function getStacks(
  filters?: {
    goal?: StackGoal;
    status?: "draft" | "review" | "published";
  }
): Promise<Stack[]> {
  const supabase = await createClient();

  let query = supabase.from("stacks").select("*");

  if (filters?.goal) {
    query = query.eq("goal", filters.goal);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching stacks:", error);
    return [];
  }

  return data || [];
}

/**
 * Get stack by slug with components
 */
export async function getStackBySlug(
  slug: string
): Promise<StackWithComponents | null> {
  const supabase = await createClient();

  const { data: stack, error: stackError } = await supabase
    .from("stacks")
    .select("*")
    .eq("slug", slug)
    .single();

  if (stackError || !stack) {
    console.error("Error fetching stack:", stackError);
    return null;
  }

  // Fetch components with entities
  const { data: components, error: componentsError } = await supabase
    .from("stack_components")
    .select(
      `
      *,
      entity:entities(*)
    `
    )
    .eq("stack_id", stack.id)
    .order("priority");

  if (componentsError) {
    console.error("Error fetching stack components:", componentsError);
    return { ...stack, components: [] };
  }

  return {
    ...stack,
    components: (components || []) as unknown as StackWithComponents["components"],
  };
}

/**
 * Get admin configuration
 */
export async function getAdminConfig(
  key: string
): Promise<unknown | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_config")
    .select("config_value")
    .eq("config_key", key)
    .single();

  if (error) {
    console.error(`Error fetching admin config ${key}:`, error);
    return null;
  }

  return data?.config_value;
}

/**
 * Set admin configuration
 */
export async function setAdminConfig(
  key: string,
  value: unknown
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("admin_config")
    .upsert({
      config_key: key,
      config_value: value,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error(`Error setting admin config ${key}:`, error);
    return false;
  }

  return true;
}

/**
 * Track affiliate event
 */
export async function trackAffiliateEvent(
  event: {
    entity_id?: string;
    provider_id?: string;
    affiliate_link_id?: string;
    event_type: "click" | "view" | "conversion";
    page_url?: string;
    region?: string;
  }
): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from("affiliate_analytics").insert({
    ...event,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error tracking affiliate event:", error);
    return false;
  }

  return true;
}
