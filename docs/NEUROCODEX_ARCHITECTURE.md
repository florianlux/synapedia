# Neurocodex Entity-Based Architecture

## Overview

This document describes the Neurocodex entity-based architecture implementation, which provides a shared core system for managing nootropics, compounds, and cognitive enhancement information with evidence-based scoring, smart linking, and affiliate monetization.

## Key Features

### 1. Entity System
- **Unified data model** for compounds, nootropics, neurotransmitters, and pathways
- **Evidence-based scoring** (0-100 scale) with automatic grade assignment (A+, A, B, C, N/A)
- **Mechanism tracking** for pharmacological actions
- **Rich metadata** support via jsonb fields

### 2. Evidence Score Calculation
- **Study type weighting**: Meta-analysis (40), RCT (30), Animal (15), In-vitro (10), Anecdotal (5)
- **Sample size scoring**: Logarithmic scale (log10(n) * 5, capped at 20)
- **Quality normalization**: 0-10 quality scores normalized to 0-40 scale
- **Aggregate scoring**: Multiple sources with diminishing returns (first 100%, second 50%, third 25%, etc.)

### 3. Smart Contextual Linking Engine
- **First-mention linking**: Only links the first occurrence of each entity in content
- **Evidence thresholds**: Configurable per entity type, category, or individual entity
- **Automatic injection**: Processes MDX/HTML content and injects smart links
- **Tooltip generation**: Rich hover information with evidence scores and grades

### 4. Stack Builder Algorithm
- **Goal-based selection**: Focus, sleep, stress, neuroprotection, memory, mood, energy
- **Evidence filtering**: Minimum threshold of 40 for inclusion
- **Interaction checking**: Safety validation for entity combinations
- **Sensitivity levels**: Low (7 components), Medium (5), High (3)

### 5. Affiliate Routing System
- **Region-based selection**: EU, US, UK, CA, AU priority
- **Provider verification**: Lab-tested and verified provider badges
- **Quality sorting**: Automatic ranking by verification, lab testing, quality score
- **Tracking**: URL generation with entity, user, and session parameters
- **Analytics**: Event tracking for clicks, views, and conversions

## Database Schema

### Core Tables

#### entities
```sql
CREATE TABLE entities (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    entity_type text CHECK (entity_type IN ('compound', 'nootropic', 'neurotransmitter', 'pathway')),
    description text,
    scientific_level text,
    risk_level text CHECK (risk_level IN ('low', 'moderate', 'high', 'unknown')),
    evidence_score numeric CHECK (evidence_score >= 0 AND evidence_score <= 100),
    evidence_grade text CHECK (evidence_grade IN ('A+', 'A', 'B', 'C', 'N/A')),
    meta_data jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

#### evidence_sources
```sql
CREATE TABLE evidence_sources (
    id uuid PRIMARY KEY,
    entity_id uuid REFERENCES entities(id),
    study_type text CHECK (study_type IN ('meta', 'rct', 'animal', 'in-vitro', 'anecdotal')),
    sample_size integer,
    summary text,
    pubmed_id text,
    doi text,
    url text,
    quality_score numeric CHECK (quality_score >= 0 AND quality_score <= 10),
    confidence_level text CHECK (confidence_level IN ('high', 'medium', 'low')),
    year integer,
    authors text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

#### stacks
```sql
CREATE TABLE stacks (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    goal text CHECK (goal IN ('focus', 'sleep', 'stress', 'neuroprotection', 'memory', 'mood', 'energy', 'general')),
    description text,
    evidence_score numeric CHECK (evidence_score >= 0 AND evidence_score <= 100),
    evidence_grade text CHECK (evidence_grade IN ('A+', 'A', 'B', 'C', 'N/A')),
    target_budget_range text,
    sensitivity_level text CHECK (sensitivity_level IN ('low', 'medium', 'high')),
    status text CHECK (status IN ('draft', 'review', 'published')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
```

#### affiliate_providers & affiliate_links
```sql
CREATE TABLE affiliate_providers (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    website text NOT NULL,
    region text NOT NULL,
    verified boolean DEFAULT false,
    lab_tested boolean DEFAULT false,
    quality_rating numeric CHECK (quality_rating >= 0 AND quality_rating <= 5),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE affiliate_links (
    id uuid PRIMARY KEY,
    entity_id uuid REFERENCES entities(id),
    provider_id uuid REFERENCES affiliate_providers(id),
    affiliate_url text NOT NULL,
    price_range text,
    quality_score numeric CHECK (quality_score >= 0 AND quality_score <= 5),
    active boolean DEFAULT true,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (entity_id, provider_id)
);
```

## TypeScript API

### Evidence Score Calculation

```typescript
import {
  calculateSingleEvidenceScore,
  calculateAggregateEvidenceScore,
  evidenceScoreToGrade
} from "@/lib/entities";

// Calculate score for a single evidence source
const score = calculateSingleEvidenceScore({
  study_type: "rct",
  sample_size: 120,
  quality_score: 8.5
});

// Calculate aggregate score from multiple sources
const aggregateScore = calculateAggregateEvidenceScore(evidenceSources);

// Convert score to grade
const grade = evidenceScoreToGrade(85); // Returns "A+"
```

### Smart Linking

```typescript
import {
  injectSmartLinks,
  findEntityMentions,
  DEFAULT_SMART_LINKING_CONFIG
} from "@/lib/entities";

// Find entity mentions in content
const mentions = findEntityMentions(content, entities, config);

// Inject smart links into content
const linkedContent = injectSmartLinks(
  content,
  entities,
  config,
  (entity) => `/entities/${entity.slug}`
);
```

### Stack Builder

```typescript
import { buildStack } from "@/lib/entities";

const result = await buildStack(
  {
    goal: "focus",
    budget_range: "€50-100",
    sensitivity: "medium",
    region: "EU",
    exclude_entities: ["caffeine"]
  },
  availableEntities,
  interactions
);

// result.stack - Generated stack
// result.components - Selected entities with dosing
// result.total_evidence_score - Average evidence score
// result.warnings - Interaction warnings
```

### Affiliate Routing

```typescript
import {
  getAffiliateLinkForEntity,
  detectUserRegion,
  generateTrackingUrl
} from "@/lib/entities";

// Detect user region
const region = detectUserRegion(request);

// Get best affiliate link for region
const link = getAffiliateLinkForEntity(
  entity,
  affiliateLinks,
  region,
  regionalPriority
);

// Generate tracking URL
const trackingUrl = generateTrackingUrl(
  link.affiliate_url,
  entity.id,
  userId,
  sessionId
);
```

## Database Queries

```typescript
import {
  getEntities,
  getEntityBySlug,
  upsertEntity,
  recalculateEntityEvidenceScore,
  addEvidenceSource,
  getStacks,
  trackAffiliateEvent
} from "@/lib/entities";

// Fetch entities with filters
const nootropics = await getEntities({
  entity_type: "nootropic",
  min_evidence_score: 60
});

// Get entity with all relations
const entity = await getEntityBySlug("l-theanine");

// Add evidence source and recalculate score
await addEvidenceSource({
  entity_id: entity.id,
  study_type: "rct",
  sample_size: 200,
  quality_score: 9.0,
  summary: "RCT showing improved focus"
});

// Track affiliate click
await trackAffiliateEvent({
  entity_id: entity.id,
  provider_id: provider.id,
  event_type: "click",
  page_url: "/entities/l-theanine",
  region: "EU"
});
```

## Admin Configuration

The system uses the `admin_config` table for global settings:

```typescript
import { getAdminConfig, setAdminConfig } from "@/lib/entities";

// Get configuration
const threshold = await getAdminConfig("smart_linking_threshold");

// Set configuration
await setAdminConfig("affiliate_enabled", true);
await setAdminConfig("regional_priority", ["EU", "US", "UK"]);
```

### Default Configuration Keys

- `smart_linking_threshold`: Global evidence score threshold (default: 50)
- `affiliate_enabled`: Toggle affiliate links globally (default: false)
- `stack_builder_enabled`: Enable stack builder feature (default: true)
- `regional_priority`: Regional priority array (default: ["EU", "US", "UK"])

## Evidence Grading System

| Score Range | Grade | Description |
|-------------|-------|-------------|
| 80-100 | A+ | Multiple RCTs + Meta-Analysis |
| 60-79 | A | RCT |
| 40-59 | B | Mechanistic + Animal |
| 20-39 | C | Anecdotal |
| 0-19 | N/A | Insufficient Evidence |

## Migration

Apply the migration to create all tables:

```bash
# Via Supabase CLI
supabase db push

# Or manually via SQL editor
# Run: supabase/migrations/00020_neurocodex_entities.sql
```

## Row Level Security

All tables have RLS enabled with these policies:

- **Public read**: Entities, mechanisms, evidence_sources, published stacks
- **Verified providers only**: Only verified affiliate providers visible
- **Active links only**: Only active affiliate links visible
- **Insert-only analytics**: Public can insert analytics events but not read
- **Admin full access**: Admin role has full CRUD on all tables (requires auth)

## Next Steps

### Admin Dashboard
- Entity CRUD interface
- Evidence source management
- Affiliate provider/link management
- Monetization controls
- Analytics dashboard

### Frontend Integration
- Entity detail pages with smart linking
- Stack builder UI
- Affiliate "Verified Sources" module
- Evidence score visualization
- Interaction checker integration

## Design Principles

1. **Minimalist & Scientific**: No spammy affiliate appearance
2. **Evidence-First**: All decisions based on evidence scores
3. **Contextual Monetization**: Smart linking instead of banner ads
4. **Region-Aware**: Automatic provider selection by location
5. **Transparent**: Clear evidence grades and lab-tested badges
6. **Modular**: Separate concerns (Synapedia vs Neurocodex)

## File Structure

```
src/lib/entities/
├── index.ts                # Main exports
├── evidence-score.ts       # Evidence calculation
├── smart-linking.ts        # Content linking engine
├── stack-builder.ts        # Stack generation
├── affiliate-routing.ts    # Region-based routing
└── db.ts                   # Database queries

supabase/migrations/
└── 00020_neurocodex_entities.sql  # Database schema
```

## License

MIT
