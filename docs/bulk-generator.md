# Bulk Substance Generator

## Overview

The Bulk Substance Generator enables mass-creation of substance database entries with high-quality, source-based data. It enforces strict content safety policies: **no dosage instructions, no consumption guides, no purchase information**.

## Architecture

### Data Flow

```
Admin UI (/admin/substances)
  → POST /api/admin/substances/bulk
    → Validate & deduplicate names
    → For each substance:
      1. Normalize name → slug
      2. Create draft entry (status='draft')
      3. Generate source references (PsychonautWiki, drugcom.de, PubMed, Reddit)
      4. Store in synapedia.substances + synapedia.substance_sources
    → Return summary + per-item results
```

### Database Schema

#### `synapedia.substances`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Unique substance name |
| slug | text | URL-safe unique slug |
| categories | text[] | Classification categories |
| summary | text | Scientific short profile |
| mechanism | text | Mechanism of action (if evidence exists) |
| effects | jsonb | `{positive[], neutral[], negative[]}` |
| risks | jsonb | `{acute[], chronic[], contraindications[]}` |
| interactions | jsonb | `{high_risk_pairs[], notes[]}` |
| dependence | jsonb | `{potential: low\|medium\|high\|unknown, notes[]}` |
| legality | jsonb | `{germany: legal\|controlled\|unknown, notes[]}` |
| citations | jsonb | Section → source_id[] mapping |
| confidence | jsonb | Section → 0..1 score |
| status | text | draft \| review \| published |
| created_at | timestamptz | Creation timestamp |

#### `synapedia.substance_sources`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| substance_id | uuid | FK → substances |
| source_name | text | Human-readable source name |
| source_url | text | Reference URL |
| source_type | text | psychonautwiki \| drugcom \| pubmed \| reddit \| other |
| retrieved_at | timestamptz | When reference was created |
| snippet | text | Short excerpt ≤200 characters (if permitted) |
| snippet_hash | text | Hash of snippet for verification |
| license_note | text | ToS/robots compliance note |
| confidence | float | 0..1 source reliability proxy |

#### `synapedia.reddit_reports`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| substance_id | uuid | FK → substances |
| reddit_post_id | text | Reddit post ID |
| title | text | Post title |
| subreddit | text | Subreddit name |
| url | text | Post URL |
| created_utc | timestamptz | Post creation time |
| upvotes | int | Upvote count |
| sentiment | float | Sentiment score |
| themes | text[] | Identified themes |
| risk_flags | text[] | Risk indicators |

## Admin UI

### Route: `/admin/substances`

#### Table View
- Lists all substances with status, categories, and confidence score
- Search by name or slug
- Filter by status (draft/review/published)
- Confidence bar visualization per substance
- Warning icons for missing citations

#### Bulk Import Modal
1. Open via "Bulk Import (HQ)" button
2. Enter substance names (one per line) or load the 120-item seed list
3. Options:
   - ☑ Fetch source references
   - ☑ Generate draft
   - ☑ Queue Reddit scan
4. Click "Run HQ Bulk Import"
5. View results summary (created/skipped/errors)

#### Review UI
- Click any substance name to open review modal
- Shows:
  - Confidence scores per section (visual bars)
  - Missing citations warnings
  - All data sections (summary, mechanism, effects, risks, interactions, dependence, legality)
  - Citation mapping
- Actions:
  - "Promote to Review" (draft → review)
  - "Publish" (→ published)

## Content Safety

### Prohibited Content (automatically filtered)
- Dosage information (mg/kg, threshold doses, etc.)
- Consumption instructions (how to take/use/inject/smoke)
- Administration routes as instructions
- Purchase/sourcing information (buy, order, vendor, darknet)
- Synthesis/preparation instructions

### Quality Gates
A substance draft fails validation if:
1. Non-empty mechanism/risks/interactions sections lack citations
2. Confidence scores are missing
3. Prohibited content is detected in any text field

## Source Connectors

### Policy
- **No aggressive scraping** — only URLs + minimal metadata are stored
- Each source includes a `license_note` field documenting ToS compliance
- Snippets are limited to ≤20 words and only stored if explicitly permitted

### Connectors
| Source | Type | Confidence | Notes |
|--------|------|-----------|-------|
| PsychonautWiki | psychonautwiki | 0.7 | URL reference only, manual review required |
| drugcom.de | drugcom | 0.8 | URL reference only, no scraping per ToS |
| PubMed/NCBI | pubmed | 0.9 | Search URL, abstracts via E-utilities API |
| Reddit | reddit | 0.3 | Community reports only, never used as facts |

## API Reference

### `POST /api/admin/substances/bulk`

**Request Body:**
```json
{
  "names": ["Psilocybin", "LSD", "MDMA", ...],
  "options": {
    "fetchSources": true,
    "generateDraft": true,
    "queueRedditScan": true
  }
}
```

**Response:**
```json
{
  "summary": {
    "total": 120,
    "created": 118,
    "skipped": 2,
    "errors": 0
  },
  "results": [
    { "name": "Psilocybin", "slug": "psilocybin", "status": "created", "id": "uuid..." },
    { "name": "LSD", "slug": "lsd", "status": "skipped", "message": "Existiert bereits." }
  ]
}
```

## Troubleshooting

### "Substanzen konnten nicht geladen werden"
- Check Supabase connection (env vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- Verify migration `00004_substances.sql` has been applied

### Bulk import returns errors for all items
- Verify the `synapedia.substances` table exists
- Check RLS policies are in place
- Verify Supabase service role key if using authenticated requests

### Missing citations warnings
- This is expected for newly created drafts (confidence = 0)
- Manually add citations via the review UI or by updating the database

### Content safety filter false positives
- The filter uses regex patterns and may flag legitimate scientific text
- Review flagged content manually; the filter errs on the side of caution
- Patterns can be adjusted in `src/lib/substances/content-safety.ts`

## File Structure

```
src/
├── lib/substances/
│   ├── schema.ts           # Zod schemas + TypeScript types
│   ├── seed-list.ts        # 120 substance names
│   ├── connectors.ts       # Source connector modules
│   ├── content-safety.ts   # Content safety filter + quality gates
│   └── db.ts               # Database CRUD functions
├── app/
│   ├── admin/substances/
│   │   └── page.tsx         # Admin UI (table + bulk import + review)
│   └── api/admin/substances/
│       └── bulk/route.ts    # Bulk import API endpoint
supabase/
└── migrations/
    └── 00004_substances.sql # Database migration
docs/
└── bulk-generator.md        # This file
```
