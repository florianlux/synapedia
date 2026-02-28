# Copilot Instructions for Synapedia

## Project Summary

Synapedia is a **scientific knowledge platform for psychoactive substances** (in German), built with Next.js App Router. It provides evidence-based information on pharmacology, risks, interactions, and research chemicals. It has no consumption guides, dosage recommendations, or procurement hints.

The site operates in two modes:
- **Demo mode** (default, no Supabase required): uses built-in demo data from `src/lib/demo-data.ts` (3 articles: Psilocybin, MDMA, Ketamin).
- **Live mode**: requires Supabase credentials in `.env.local`.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Language | TypeScript 5.9 |
| Styling | TailwindCSS v4 (PostCSS plugin: `@tailwindcss/postcss`) |
| UI Components | shadcn/ui (custom, located in `src/components/ui/`) |
| Database | Supabase (Postgres + Auth + Storage) |
| MDX | next-mdx-remote |
| Icons | lucide-react |
| Theming | next-themes (Dark/Light Mode) |
| Unit Tests | Vitest (`vitest.config.ts`) |
| E2E Tests | Playwright (`@playwright/test`) |

## Environment Setup

```bash
# Install dependencies (always run before building)
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local if you need Supabase or AI features; demo mode works without it
```

Required environment variables (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project credentials (optional for demo mode)
- `SUPABASE_SERVICE_ROLE_KEY` — server-side Supabase key
- `ADMIN_TOKEN` — secret token to protect the admin panel (optional)
- `NEXT_PUBLIC_ADMIN_ENABLED` / `ADMIN_ENABLED` — set to `"true"` to enable `/admin`
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — optional, for AI autofill features
- `NEXT_PUBLIC_APP_NAME` — optional, overrides app name (default: `Synapedia`)
- `NEXT_PUBLIC_APP_DOMAIN` — optional, overrides domain (default: `synapedia.de`)

## Build & Development Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build (runs Next.js compiler + type checks)
npm run start    # Start production server
npm run lint     # Run ESLint (eslint-config-next/core-web-vitals + typescript)
npm test         # Run Vitest unit tests
```

Always run `npm install` before `npm run build`.

### Data Import Scripts

```bash
npm run import:psychonautwiki  # Import substance data from PsychonautWiki
npm run import:wikidata        # Import substance data from Wikidata
npm run import:pubchem         # Import substance data from PubChem
npm run validate:substances    # Validate substances.json data
npm run gen:masterlist         # Generate master substance list
npm run import:masterlist      # Import master substance list
```

## Testing

### Unit Tests (Vitest)

Unit tests are in `src/**/__tests__/` directories and use Vitest.

```bash
npm test              # Run all unit tests
npx vitest run        # Run once (no watch mode)
npx vitest            # Run in watch mode
```

Unit test files follow the pattern `src/**/__tests__/**/*.test.ts`.

### E2E Tests (Playwright)

E2E tests use Playwright and are located in `e2e/`. They build the app and start a production server on port 3111.

```bash
# Run e2e tests (builds app first — takes ~60-120 seconds)
npx playwright test

# Run a single test file
npx playwright test e2e/mobile-responsive.spec.ts
npx playwright test e2e/smoke.spec.ts
```

## Lint

```bash
npm run lint     # ESLint with Next.js core-web-vitals + TypeScript rules
```

ESLint config is in `eslint.config.mjs`. It uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`. Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`.

## Project Layout

```
synapedia/
├── .env.example              # Environment variable template
├── .github/
│   └── copilot-instructions.md
├── components.json           # shadcn/ui config
├── data/                     # Static JSON data files
│   ├── substances.json       # Substances with receptors, mechanisms, risk levels
│   ├── substances.ts         # TypeScript re-export of substances data
│   ├── interactions.json     # Curated interaction pairs
│   ├── receptors.json        # Receptors/transporters
│   ├── glossary.json         # Scientific terms
│   ├── categories.json       # Categories
│   ├── counseling_centers.json  # Counseling center data
│   └── substance-seed.json   # Seed data for substance imports
├── e2e/                      # Playwright e2e tests
│   ├── mobile-responsive.spec.ts
│   └── smoke.spec.ts
├── eslint.config.mjs         # ESLint configuration
├── next.config.ts            # Next.js configuration (minimal)
├── playwright.config.ts      # Playwright config (mobile-chrome, port 3111)
├── postcss.config.mjs        # PostCSS config (TailwindCSS v4)
├── vitest.config.ts          # Vitest config (unit tests in src/**/__tests__/)
├── scripts/
│   └── import-psychonautwiki.ts  # Data import script (run via tsx)
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── account/          # Authenticated user account pages
│   │   │   ├── favorites/    # Saved/favorite substances
│   │   │   ├── logs/         # Dosing log entries
│   │   │   ├── risk/         # Risk overlay analysis
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── admin/            # Admin panel (gated by ADMIN_ENABLED env var)
│   │   ├── api/search/       # Search API route
│   │   ├── articles/[slug]/  # Article detail page
│   │   ├── auth/             # Authentication pages
│   │   │   ├── callback/     # OAuth callback handler
│   │   │   ├── login/        # Login page
│   │   │   ├── reset/        # Password reset
│   │   │   └── signup/       # Registration page
│   │   ├── brain/            # Receptor Explorer page
│   │   ├── categories/       # Categories overview
│   │   ├── compare/          # Substance comparison tool
│   │   ├── feed/             # Community/news feed
│   │   ├── glossary/         # Glossary + [slug] detail pages
│   │   ├── groups/           # User groups / [slug] detail pages
│   │   ├── hilfe/            # Help & counseling pages
│   │   │   ├── beratung/     # Counseling centers
│   │   │   ├── notfall/      # Emergency information
│   │   │   └── selbsttest/   # Self-assessment test
│   │   ├── interactions/     # Interaction checker
│   │   ├── neuro/            # NeuroCodex pages
│   │   ├── register/         # Registration redirect/entry
│   │   ├── safer-use/        # Harm reduction content
│   │   ├── globals.css       # Global styles (TailwindCSS imports)
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Homepage
│   │   ├── robots.ts         # robots.txt generation
│   │   └── sitemap.ts        # sitemap.xml generation
│   ├── components/
│   │   ├── ui/               # shadcn/ui base components (button, card, etc.)
│   │   ├── admin/            # Admin-specific components
│   │   ├── home/             # Homepage-specific components
│   │   ├── neuro-map/        # NeuroCodex map components
│   │   ├── risk/             # Risk overlay components
│   │   ├── admin-pharmacology-tabs.tsx
│   │   ├── article-browser.tsx
│   │   ├── brain-explorer.tsx
│   │   ├── compare-tool.tsx
│   │   ├── dose-response-chart.tsx
│   │   ├── footer.tsx
│   │   ├── glossary-list.tsx
│   │   ├── header.tsx
│   │   ├── interaction-checker.tsx
│   │   ├── json-ld.tsx
│   │   ├── no-autolink.tsx
│   │   ├── pkpd-curve.tsx
│   │   ├── receptor-heatmap.tsx
│   │   ├── risk-banner.tsx
│   │   ├── safer-use-chat.tsx
│   │   ├── science-mode-panel.tsx
│   │   ├── search-bar.tsx
│   │   ├── source-box.tsx
│   │   ├── substance-pharmacology.tsx
│   │   ├── synapedia-logo.tsx
│   │   ├── table-of-contents.tsx
│   │   ├── theme-provider.tsx
│   │   ├── theme-toggle.tsx
│   │   └── verified-sources.tsx
│   └── lib/
│       ├── __tests__/        # Vitest unit tests
│       ├── admin/            # Admin utility helpers
│       ├── ai/               # AI autofill utilities
│       ├── chat/             # Safer-use chat logic
│       ├── connectors/       # External data source connectors
│       ├── db/               # Database query helpers
│       ├── entities/         # Domain entity models
│       ├── generator/        # Content generation utilities
│       ├── monetization/     # Monetization utilities
│       ├── neurocodex/       # NeuroCodex feature logic
│       ├── risk/             # Risk analysis logic
│       ├── search/           # Search utilities
│       ├── substances/       # Substance-related helpers
│       ├── supabase/
│       │   ├── client.ts     # Browser Supabase client
│       │   └── server.ts     # Server Supabase client (uses @supabase/ssr)
│       ├── articles.ts       # Article data access
│       ├── auth.ts           # Auth helpers
│       ├── config.ts         # App-wide configuration constants
│       ├── demo-data.ts      # Fallback demo articles (no Supabase needed)
│       ├── fallbackGroups.ts # Fallback group data
│       ├── mdx-to-html.ts    # MDX → HTML conversion utility
│       ├── pkpd-math.ts      # PK/PD pharmacokinetics math
│       ├── slugify.ts        # Slug generation utility
│       ├── types.ts          # All TypeScript interfaces and types
│       └── utils.ts          # Utility functions (cn, etc.)
├── supabase/
│   ├── migrations/           # SQL migrations (numbered, applied in order)
│   └── seed/
│       └── demo_articles.sql # Demo article seed data
└── tsconfig.json             # TypeScript config
```

## Key Architecture Notes

- **App Router only**: all pages use Next.js 13+ App Router conventions (`layout.tsx`, `page.tsx`, `loading.tsx`). No Pages Router.
- **Admin panel** is toggled by the `ADMIN_ENABLED` / `NEXT_PUBLIC_ADMIN_ENABLED` env vars and protected by `ADMIN_TOKEN` via `src/middleware.ts`.
- **Demo mode fallback**: when Supabase env vars are missing, `src/lib/demo-data.ts` provides mock articles. Data access functions in `src/lib/db/` handle this gracefully.
- **Static JSON data** (`data/*.json`) is imported directly in components/pages — no API calls needed for substances, interactions, receptors, or glossary.
- **TailwindCSS v4**: uses `@tailwindcss/postcss` in `postcss.config.mjs`, not the classic `tailwind.config.js`. Do not create a `tailwind.config.js` file.
- **shadcn/ui**: components are in `src/components/ui/`. Configuration is in `components.json`. Add new components via `npx shadcn@latest add <component>`.
- **Row Level Security (RLS)** is enabled on all Supabase tables. See `supabase/migrations/`.
- **Article content** is MDX rendered via `next-mdx-remote`.
- **UI language**: all user-visible text is in **German**.
- **App name / branding**: controlled via `src/lib/config.ts` (`APP_NAME`, `APP_DOMAIN`). Use these constants instead of hardcoding "Synapedia".
- **Auth**: Supabase Auth is used for user registration and login. Auth pages are at `/auth/signup`, `/auth/login`, `/auth/reset`. User profiles are stored in `user_profiles` with an auto-insert trigger on `auth.users`.
- **Dosing logs**: authenticated users can log substance intake at `/account/logs`. API endpoints: `GET/POST /api/dosing-logs`. Data is stored in the `dosing_logs` table (RLS-protected).
- **Risk overlay**: `/account/risk` computes a harm-reduction analysis from the last 24 hours of dosing logs. Demo available at `/account/risk?demo=1`.

## Validation Checklist

Before submitting changes, ensure:
1. `npm run lint` passes with no errors.
2. `npm run build` completes successfully.
3. `npm test` (Vitest) passes if you modified files under `src/lib/`.
4. If you changed any page or component visible in the e2e tests (`/`, `/brain`, `/interactions`, `/compare`, `/glossary`), run `npx playwright test` to verify no regressions.
