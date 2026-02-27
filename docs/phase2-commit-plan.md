# Phase 2 – Smart Monetization Layer: Commit Plan

## File-by-File Changes

### New Files

| # | File | Purpose |
|---|------|---------|
| 1 | `supabase/migrations/00020_affiliate_providers.sql` | DB migration: `entities`, `affiliate_providers`, `entity_provider_links` tables with RLS |
| 2 | `src/lib/monetization/types.ts` | TypeScript interfaces: `Entity`, `AffiliateProvider`, `EntityProviderLink`, `AffiliateLinkQuery`, `RankedAffiliateLink`, `EntityDictionaryEntry`, `AutolinkConfig` |
| 3 | `src/lib/monetization/entity-dictionary.ts` | In-memory TTL-cached entity dictionary (name/synonym → entity lookup) |
| 4 | `src/lib/monetization/autolink-engine.ts` | Deterministic MDX autolink: first-occurrence linking, heading/code/anchor skip, evidence threshold, high-risk gate |
| 5 | `src/lib/monetization/affiliate-routing.ts` | `getBestAffiliateLinks()` – ranked provider selection with composite scoring |
| 6 | `src/lib/monetization/index.ts` | Barrel re-export for the monetization module |
| 7 | `src/components/no-autolink.tsx` | `<NoAutoLink>` MDX escape hatch (pass-through wrapper) |
| 8 | `src/components/verified-sources.tsx` | "Verifizierte Bezugsquellen" UI module (emerald, scientific, non-spammy) |
| 9 | `src/lib/monetization/__tests__/autolink-engine.test.ts` | 17 unit tests for the autolink engine |
| 10 | `src/lib/monetization/__tests__/affiliate-routing.test.ts` | 12 unit tests for the affiliate routing algorithm |
| 11 | `src/lib/monetization/__tests__/entity-dictionary.test.ts` | 10 unit tests for entity dictionary + caching |

### Modified Files

_None._ Phase 2 is fully additive — no existing files were modified.

---

## Migration Filenames

| Order | Filename | Tables Created | Indexes | RLS Policies |
|-------|----------|---------------|---------|-------------|
| 20 | `00020_affiliate_providers.sql` | `entities`, `affiliate_providers`, `entity_provider_links` | 5 indexes | 6 policies (public read + service_role full) |

### Table Schema Summary

**`entities`** – Linkable substances/compounds with monetization metadata
- `id` (uuid PK), `name`, `slug` (unique), `synonyms` (text[]), `entity_type`, `evidence_score` (0–100), `risk_level`, `monetization_enabled`, `autolink_whitelisted`

**`affiliate_providers`** – Verified vendors/labs
- `id` (uuid PK), `name`, `slug` (unique), `website_url`, `logo_url`, `description`, `verified`, `active`, `quality_score` (0–100), `region`, `price_range`, `affiliate_tag`

**`entity_provider_links`** – Junction with affiliate URLs
- `id` (uuid PK), `entity_id` (FK → entities), `provider_id` (FK → affiliate_providers), `affiliate_url`, `custom_label`, `priority`, `active`
- Unique constraint on `(entity_id, provider_id)`

---

## Test Checklist

### Autolink Engine (`autolink-engine.test.ts`) – 17 tests

- [x] Returns unchanged content when dictionary is empty
- [x] Returns unchanged content when source is empty
- [x] Links the first occurrence of an entity in plain text
- [x] Links multiple different entities on the same line
- [x] Does NOT link inside headings (`##`, `###`, etc.)
- [x] Does NOT link inside fenced code blocks (```)
- [x] Does NOT link inside existing Markdown links `[text](url)`
- [x] Does NOT link inside inline code backticks
- [x] Respects `<NoAutoLink>` escape hatch boundaries
- [x] Skips entities below evidence score threshold
- [x] Skips entities with `monetization_enabled = false`
- [x] Skips high-risk entities unless `autolink_whitelisted = true`
- [x] Links whitelisted high-risk entities
- [x] Case-insensitive matching
- [x] Respects word boundaries (no partial-word matches)
- [x] Returns `linkedEntityIds` for all linked entities
- [x] Handles multiline content with mixed protected/linkable zones

### Affiliate Routing (`affiliate-routing.test.ts`) – 12 tests

- [x] Returns empty array when no links exist
- [x] Returns empty array when no providers are active
- [x] Filters out inactive links
- [x] Returns ranked links sorted by score descending
- [x] Applies region match bonus (+15 match / -10 mismatch)
- [x] Respects `requireVerified` filter
- [x] Respects `minQuality` filter
- [x] Respects `limit` parameter
- [x] Defaults limit to 3
- [x] Accounts for manual priority in link
- [x] Ignores links for different entities
- [x] Includes `price_range` in score computation (budget > premium)

### Entity Dictionary (`entity-dictionary.test.ts`) – 10 tests

- [x] Maps entity name (lowercased) to entry
- [x] Maps entity slug to entry
- [x] Maps synonyms to entity
- [x] Prefers higher `evidence_score` on key collision
- [x] Returns empty map for empty input
- [x] Skips blank synonyms
- [x] Returns empty map when no loader and no cache
- [x] Invokes loader on first call
- [x] Returns cached dictionary on second call within TTL
- [x] Clears cache when `clearEntityDictionaryCache()` is called

---

## Rollout Steps with Feature Flags

### Feature Flag Design

Follow the existing project pattern: `process.env.VARIABLE === "true"` checks.

| Flag | Scope | Default | Purpose |
|------|-------|---------|---------|
| `NEXT_PUBLIC_MONETIZATION_ENABLED` | Client + Server | `"false"` | Master switch: show/hide VerifiedSources UI |
| `MONETIZATION_ENABLED` | Server only | `"false"` | Server-side master switch for autolink engine |
| `AUTOLINK_ENABLED` | Server only | `"false"` | Enable/disable MDX entity autolinking |
| `AUTOLINK_MIN_EVIDENCE_SCORE` | Server only | `"40"` | Minimum evidence score for autolinking |

### .env.example additions

```env
# --- Smart Monetization (Phase 2) ---
NEXT_PUBLIC_MONETIZATION_ENABLED=false
MONETIZATION_ENABLED=false
AUTOLINK_ENABLED=false
AUTOLINK_MIN_EVIDENCE_SCORE=40
```

### Rollout Phases

#### Phase 2a – Database & Backend (Silent Deploy)
1. **Deploy migration** `00020_affiliate_providers.sql` to Supabase
2. **Deploy code** with all flags set to `"false"` (default)
3. **Seed test entities** and providers via Supabase dashboard or service-role API
4. **Verify**: no user-facing changes, all existing tests pass

#### Phase 2b – Autolink Engine (Internal Testing)
1. Set `MONETIZATION_ENABLED=true` and `AUTOLINK_ENABLED=true` in staging
2. Verify autolink output on demo articles with known entity seeds
3. Test edge cases: headings, code blocks, `<NoAutoLink>`, high-risk filtering
4. Monitor for regressions in article rendering

#### Phase 2c – Verified Sources UI (Controlled Rollout)
1. Set `NEXT_PUBLIC_MONETIZATION_ENABLED=true` in staging
2. Add 2–3 verified providers with real affiliate URLs
3. QA the VerifiedSources component across light/dark mode, mobile/desktop
4. Validate `rel="noopener noreferrer nofollow sponsored"` on all affiliate links

#### Phase 2d – Production Launch
1. Enable all flags in production `.env`
2. Monitor: page load performance, click-through rates, zero broken links
3. **Rollback plan**: set any flag to `"false"` to instantly disable the feature

### Integration Points (Future)

```
Article page (src/app/articles/[slug]/page.tsx)
├─ if AUTOLINK_ENABLED:
│   ├─ Load entity dictionary (cached)
│   └─ Run autolinkEntities(content_mdx, dict, config)
│       └─ Returns { content, linkedEntityIds }
│
├─ if MONETIZATION_ENABLED && linkedEntityIds.length > 0:
│   ├─ For each linked entity: getBestAffiliateLinks(...)
│   └─ Render <VerifiedSources links={...} /> after article content
│
└─ MDX compile uses autolinked content (if enabled)
```

### Middleware / Security Considerations

- All affiliate URLs use `rel="nofollow sponsored"` per Google guidelines
- No PII is sent to affiliate providers (links are simple URL redirects)
- High-risk entities are blocked from autolinking by default
- Affiliate disclosure text is always visible ("Affiliate-Links...")
- RLS policies ensure public read-only access to provider data
