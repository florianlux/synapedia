# Admin Content Studio

The Synapedia Admin Content Studio is a production cockpit for managing substance articles, templates, media, and AI-assisted content generation.

## Routes

| Route | Description |
|---|---|
| `/admin` | Dashboard with Content Coverage Map and widgets |
| `/admin/articles` | Article list with search and filter |
| `/admin/articles/new` | Create new article |
| `/admin/articles/[id]` | Edit article with AI Autofill and Knowledge Graph |
| `/admin/templates` | Template list (Neural Blueprints) |
| `/admin/templates/new` | Create new template |
| `/admin/templates/[id]` | Edit template |
| `/admin/sources` | Manage scientific sources |
| `/admin/media` | Media library (Visual Cortex) |
| `/admin/audit` | Audit log |
| `/admin/login` | Admin login (when ADMIN_TOKEN is set) |

## Authentication

- **Demo Mode**: If `ADMIN_TOKEN` is not set, the admin area is open without authentication
- **Token Mode**: Set `ADMIN_TOKEN` in `.env` to require authentication via `/admin/login`
- API routes under `/api/admin/*` check the same token via cookie or `Authorization: Bearer <token>` header

## AI Autofill

The AI Autofill feature generates structured article drafts from minimal inputs using either OpenAI or Anthropic.

### Configuration

Set one of these environment variables:
- `OPENAI_API_KEY` – Uses GPT-4o-mini with JSON response format
- `ANTHROPIC_API_KEY` – Uses Claude Sonnet

If neither is set, AI features are disabled with clear UI indicators.

### API Endpoints

- `POST /api/admin/ai/autofill` – Creates an AI job and returns structured output
- `GET /api/admin/ai/job?id=<uuid>` – Check job status
- `POST /api/admin/ai/apply` – Merge AI output into article and create graph edges

### Output Schema

```json
{
  "quickFacts": { "class": "...", "receptor": "...", "riskLevel": "...", "evidenceStrength": "..." },
  "sections": [{ "key": "...", "title": "...", "blocks": [{ "type": "markdown", "content": "..." }] }],
  "dosage": { "qualitative_only": true, "notes": ["..."] },
  "duration": { "onset": "...", "peak": "...", "total": "..." },
  "warnings": ["..."],
  "interactions": [{ "substance": "...", "severity": "...", "description": "..." }],
  "suggestedGraphEdges": [...],
  "suggestedMediaRoles": [...]
}
```

**Content rules**: No procurement tips, no consumption instructions, no specific dosage amounts. Scientific/neutral and harm-reduction oriented only.

## Database

### Migration: `00003_content_studio.sql`

New tables added to the `synapedia` schema:

- **templates** – Article structure blueprints with `schema_json`
- **media** – Media files with metadata (tags, alt text, dimensions)
- **article_media** – Many-to-many linking articles to media with roles
- **ai_jobs** – AI job queue with status tracking
- **graph_edges** – Knowledge graph edges between concepts

Extended `articles` table with: `template_id`, `content_json`, `meta_json`

### DB Layer (`src/lib/db/`)

- `templates.ts` – CRUD for templates
- `media.ts` – CRUD for media + assign/unassign to articles
- `jobs.ts` – Create, get, update, list AI jobs
- `graph.ts` – CRUD for graph edges + batch creation

## Template System (Neural Blueprints)

Templates define the structure of substance articles:

```json
{
  "sections": [
    { "key": "kurzfazit", "title": "Kurzfazit", "required": true },
    { "key": "wirkmechanismus", "title": "Wirkmechanismus", "required": true }
  ],
  "links": [
    { "from": "rezeptorprofil", "to": "wirkmechanismus", "relation": "explains" }
  ]
}
```

## Demo / Supabase Fallback

All admin pages check `isSupabaseConfigured()`:
- If Supabase is configured → load from database
- Otherwise → use demo data from `src/lib/demo-data.ts`

This ensures the admin UI works in demo mode without any database connection.
