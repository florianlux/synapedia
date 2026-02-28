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

## Build & Development Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build (runs Next.js compiler + type checks)
npm run start    # Start production server
npm run lint     # Run ESLint (eslint-config-next/core-web-vitals + typescript)
```

Always run `npm install` before `npm run build`.

## Testing

E2E tests use Playwright and are located in `e2e/`. They build the app and start a production server on port 3111.

```bash
# Run e2e tests (builds app first — takes ~60-120 seconds)
npx playwright test

# Run a single test file
npx playwright test e2e/mobile-responsive.spec.ts
```

There are **no unit tests** in this repository. The only automated tests are Playwright e2e tests.

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

## Security and Safety Guidelines

### Sensitive Data Protection
- **Never commit secrets**: Do not commit API keys, tokens, or passwords. Use `.env.local` for local development (already gitignored).
- **Environment variables**: All secrets must be in `.env.example` (with placeholder values) and `.env.local` (actual values, gitignored).
- **Supabase credentials**: Service role keys must only be used server-side. Never expose them to the browser.
- **Admin panel**: The `/admin` route is protected by `ADMIN_TOKEN` via middleware (`src/middleware.ts`). Do not bypass this protection.

### Content Safety
- **No dosage recommendations**: Synapedia is strictly educational. Never add dosing guides, consumption instructions, or procurement information.
- **Scientific accuracy**: All pharmacological information must be evidence-based and cite reputable sources (PubMed, clinical trials, peer-reviewed journals).
- **Harm reduction**: When discussing risks, always frame content around harm reduction, not promotion.

### Database Security
- **Row Level Security (RLS)**: All Supabase tables have RLS enabled. Do not disable RLS policies.
- **User data isolation**: Users must only access their own data (`dosing_logs`, `user_profiles`). RLS policies enforce this.
- **SQL injection**: Use Supabase client parameterized queries. Never construct raw SQL from user input.

## Common Pitfalls and Troubleshooting

### Build Issues
- **`npm install` first**: Always run `npm install` before `npm run build`, especially after pulling changes.
- **TailwindCSS v4**: Do NOT create a `tailwind.config.js` file. TailwindCSS v4 uses `@tailwindcss/postcss` configured in `postcss.config.mjs`.
- **Type errors**: Run `npm run build` (not just `npm run dev`) to catch all TypeScript errors. Dev mode is more lenient.

### Environment Setup
- **Demo mode vs Live mode**: If Supabase env vars are missing, the app runs in demo mode (3 hardcoded articles). For full functionality, set up Supabase.
- **Admin panel not showing**: Set `NEXT_PUBLIC_ADMIN_ENABLED=true` and `ADMIN_ENABLED=true` in `.env.local`, and configure `ADMIN_TOKEN`.

### Data Handling
- **Static JSON data**: `data/*.json` files are imported directly (client-side). These are public data, not secrets.
- **Article content**: Articles are MDX rendered via `next-mdx-remote`. Test rendering locally before committing.

### Common Errors
- **"Cannot find module"**: Usually means `npm install` wasn't run or `node_modules` is corrupted. Delete `node_modules` and `.next`, then reinstall.
- **Supabase client errors**: Check that env vars are correct. For server-side code, use `src/lib/supabase/server.ts`. For browser code, use `src/lib/supabase/client.ts`.
- **Middleware not applying**: `src/middleware.ts` only runs on certain routes (see `matcher` in the file). Changes to middleware require a server restart.

## Contribution Workflow

### Making Changes
1. **Branch naming**: Use descriptive names like `feature/glossary-search` or `fix/mobile-nav`.
2. **Commit messages**: Write clear, concise messages in English. Use conventional commit format when possible (e.g., `feat:`, `fix:`, `docs:`).
3. **Testing**: Always test changes locally before pushing:
   - Run `npm run dev` and manually test the feature
   - Run `npm run lint` to catch style issues
   - Run `npm run build` to catch type errors
   - Run `npx playwright test` if you changed user-facing pages

### Pull Request Guidelines
- **Small, focused PRs**: Keep changes focused on a single feature or fix.
- **Description**: Explain what changed and why. Link to relevant issues.
- **Screenshots**: For UI changes, include before/after screenshots.
- **Checklist**: Confirm lint, build, and tests pass.

### Code Review
- **Respond to feedback**: Address review comments promptly.
- **Merge strategy**: Squash and merge is preferred to keep commit history clean.

## AI-Specific Development Patterns

### Using AI Autofill Features
The codebase includes AI autofill utilities in `src/lib/ai/`. These use OpenAI or Anthropic APIs to generate content.

- **Environment variables**: Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` in `.env.local`.
- **Server-side only**: AI API calls must happen server-side (API routes or Server Components) to protect API keys.
- **Rate limiting**: Consider rate limiting AI endpoints to prevent abuse.
- **Content validation**: Always validate and review AI-generated content before saving to the database.

### Best Practices for AI-Generated Content
- **Human review**: AI-generated article content should be reviewed by a human before publishing.
- **Source verification**: Always verify scientific claims and add proper citations.
- **Bias awareness**: Be aware of potential biases in AI-generated text, especially regarding substance use.

## Additional Resources

- **Next.js App Router Docs**: https://nextjs.org/docs/app
- **Supabase Docs**: https://supabase.com/docs
- **TailwindCSS v4 Docs**: https://tailwindcss.com/docs
- **shadcn/ui Components**: https://ui.shadcn.com/
- **Playwright Testing**: https://playwright.dev/

## Questions or Issues?

- **Bug reports**: Open an issue on GitHub with reproduction steps.
- **Feature requests**: Discuss in GitHub Discussions or open an issue with the `enhancement` label.
- **Security issues**: Report via GitHub Security Advisories, not public issues.
