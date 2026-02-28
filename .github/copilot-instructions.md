# Copilot Instructions for Synapedia

## Purpose

Guide Copilot coding agents to produce safe, idiomatic changes for Synapedia.

## Project Summary

Synapedia is a **scientific knowledge platform for psychoactive substances** (in German), built with Next.js App Router. It provides evidence-based information on pharmacology, risks, interactions, and research chemicals. It has no consumption guides, dosage recommendations, or procurement hints. Keep all user-facing copy in German and avoid adding consumption/dosage/procurement guidance.

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
| E2E Tests | Playwright (`@playwright/test`) |

## Environment Setup

- Always install dependencies before building: `npm install`
- Demo mode works without Supabase env vars; live mode needs Supabase credentials in `.env.local`.
- Do not add a `tailwind.config.js` (Tailwind v4 uses `@tailwindcss/postcss`).

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

## Quick Commands

- Dev server: `npm run dev`
- Lint: `npm run lint`
- Build (runs TS checks): `npm run build`
- Start production server: `npm run start`

## Testing

E2E tests use Playwright and are located in `e2e/`. They build the app and start a production server on port 3111.

```bash
# Run e2e tests (builds app first — takes ~60-120 seconds)
npx playwright test

# Run a single test file
npx playwright test e2e/mobile-responsive.spec.ts
```

There are **no unit tests** in this repository. The only automated tests are Playwright e2e tests.

## Workflow Expectations

- Run `npm run lint` and `npm run build` before and after changes; fix only issues related to your edits.
- If you touch pages/components covered by e2e flows (`/`, `/brain`, `/interactions`, `/compare`, `/glossary`), prefer running `npx playwright test`.
- Keep changes minimal; do not upgrade dependencies unless required for the task.
- Do not add secrets or modify files under `.github/agents/`.

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
│   ├── substances.json       # 20 substances with receptors, mechanisms, risk levels
│   ├── interactions.json     # 20 curated interaction pairs
│   ├── receptors.json        # 15 receptors/transporters
│   ├── glossary.json         # 10 scientific terms
│   └── categories.json       # Categories
├── e2e/                      # Playwright e2e tests
│   └── mobile-responsive.spec.ts
├── eslint.config.mjs         # ESLint configuration
├── next.config.ts            # Next.js configuration (minimal)
├── playwright.config.ts      # Playwright config (mobile-chrome, port 3111)
├── postcss.config.mjs        # PostCSS config (TailwindCSS v4)
├── scripts/
│   └── import-psychonautwiki.ts  # Data import script (run via tsx)
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── admin/            # Admin panel (gated by ADMIN_ENABLED env var)
│   │   ├── api/search/       # Search API route
│   │   ├── articles/[slug]/  # Article detail page
│   │   ├── brain/            # Receptor Explorer page
│   │   ├── categories/       # Categories overview
│   │   ├── compare/          # Substance comparison tool
│   │   ├── glossary/         # Glossary + [slug] detail pages
│   │   ├── interactions/     # Interaction checker
│   │   ├── globals.css       # Global styles (TailwindCSS imports)
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Homepage
│   │   ├── robots.ts         # robots.txt generation
│   │   └── sitemap.ts        # sitemap.xml generation
│   ├── components/
│   │   ├── ui/               # shadcn/ui base components (button, card, etc.)
│   │   ├── brain-explorer.tsx
│   │   ├── compare-tool.tsx
│   │   ├── glossary-list.tsx
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── interaction-checker.tsx
│   │   ├── json-ld.tsx
│   │   ├── risk-banner.tsx
│   │   ├── search-bar.tsx
│   │   ├── source-box.tsx
│   │   ├── table-of-contents.tsx
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   └── lib/
│       ├── ai/               # AI autofill utilities
│       ├── db/               # Database query helpers
│       ├── substances/       # Substance-related helpers
│       ├── supabase/
│       │   ├── client.ts     # Browser Supabase client
│       │   └── server.ts     # Server Supabase client (uses @supabase/ssr)
│       ├── demo-data.ts      # Fallback demo articles (no Supabase needed)
│       ├── types.ts          # All TypeScript interfaces and types
│       └── utils.ts          # Utility functions (cn, etc.)
├── supabase/
│   ├── migrations/
│   │   └── 00001_initial_schema.sql  # Full DB schema with RLS
│   └── seed/
│       └── demo_articles.sql         # Demo article seed data
└── tsconfig.json             # TypeScript config
```

## Key Architecture Notes

- **App Router only**: all pages use Next.js 13+ App Router conventions (`layout.tsx`, `page.tsx`, `loading.tsx`). No Pages Router.
- **Admin panel** is toggled by the `ADMIN_ENABLED` / `NEXT_PUBLIC_ADMIN_ENABLED` env vars and protected by `ADMIN_TOKEN` via `src/middleware.ts`.
- **Demo mode fallback**: when Supabase env vars are missing, `src/lib/demo-data.ts` provides mock articles. Data access functions in `src/lib/db/` handle this gracefully.
- **Static JSON data** (`data/*.json`) is imported directly in components/pages — no API calls needed for substances, interactions, receptors, or glossary.
- **TailwindCSS v4**: uses `@tailwindcss/postcss` in `postcss.config.mjs`, not the classic `tailwind.config.js`. Do not create a `tailwind.config.js` file.
- **shadcn/ui**: components are in `src/components/ui/`. Configuration is in `components.json`. Add new components via `npx shadcn@latest add <component>`.
- **Row Level Security (RLS)** is enabled on all Supabase tables. See `supabase/migrations/00001_initial_schema.sql`.
- **Article content** is MDX rendered via `next-mdx-remote`.
- **UI language**: all user-visible text is in **German**.

## Validation Checklist

Before submitting changes, ensure:
1. `npm run lint` passes with no errors.
2. `npm run build` completes successfully.
3. If you changed any page or component visible in the e2e tests (`/`, `/brain`, `/interactions`, `/compare`, `/glossary`), run `npx playwright test` to verify no regressions.
