# Synapedia

**Wissenschaftliche Aufklärungsplattform für psychoaktive Substanzen**

Eine moderne, evidenzbasierte Wissensdatenbank mit Fokus auf Pharmakologie, Risiken, Interaktionen und Research Chemicals.

> ⚠️ **Hinweis:** Synapedia dient ausschließlich der wissenschaftlichen Aufklärung. Diese Plattform bietet keine Konsumanleitungen, keine Dosierungsempfehlungen und keine Beschaffungshinweise.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Sprache:** TypeScript
- **Styling:** TailwindCSS v4
- **UI-Komponenten:** shadcn/ui (Custom)
- **Datenbank:** [Supabase](https://supabase.com/) (Postgres + Auth + Storage)
- **MDX:** next-mdx-remote
- **Icons:** lucide-react
- **Theming:** next-themes (Dark/Light Mode)

## Features

### Öffentlich
- 🔍 Startseite mit Suchfunktion
- 📂 Kategorien-Übersicht
- 🏷️ Tag-System
- 📄 Artikel-Seiten mit:
  - Sticky Inhaltsverzeichnis
  - Quellenbox mit DOI-Links
  - Risiko-Badges (niedrig/moderat/hoch)
  - Evidenzstärke-Badges
  - Warnbanner je nach Risikolevel
- 🌙 Dark/Light Mode

### Synapedia 2.0 Features

- ⚗️ **Interaktions-Checker** (`/interactions`) – Zwei Substanzen auswählen, um kuratierte Wechselwirkungen mit Risikobewertung, Mechanismus-Erklärung und Quellen anzuzeigen. Symmetrische Normalisierung (A+B = B+A).
- 🧠 **Rezeptor-Explorer / Digitales Gehirn** (`/brain`) – Interaktive SVG-Hirnkarte mit klickbaren Regionen und Rezeptor-Netzwerk-Graph. Side-Panel zeigt Rezeptordetails und verknüpfte Substanzen.
- 📖 **Glossar** (`/glossary`) – Alphabetische A–Z-Navigation, Client-seitige Suche, Detail-Seiten pro Begriff mit Quellenangaben. Route: `/glossary/[slug]`.
- ⚖️ **Substanz-Vergleich** (`/compare`) – Side-by-side-Vergleich zweier Substanzen (Klasse, Mechanismen, Rezeptoren, Risiko). Teilbar per URL-Parameter (`?a=ketamin&b=lsd`).
- 🔍 **SEO-Optimierung** – Automatisch generierte `/sitemap.xml` und `/robots.txt`, JSON-LD Schema (WebSite, BreadcrumbList), OpenGraph + Twitter Card Meta-Tags.

**Datenmodelle** (`/data/`):
- `substances.json` – 20 Substanzen mit Rezeptoren, Mechanismen und Risikostufen
- `interactions.json` – 20 kuratierte Interaktionspaare
- `receptors.json` – 15 Rezeptoren/Transporter mit Beschreibung
- `glossary.json` – 10 wissenschaftliche Fachbegriffe

### Admin-Bereich (/admin)
- 📊 Dashboard mit Statistiken
- ✍️ Artikel erstellen/bearbeiten (MDX Editor mit Live-Preview)
- 📝 Draft → Review → Publish Workflow
- 📚 Quellenverwaltung
- 🖼️ Medien-Upload (Platzhalter)
- 📋 Audit-Log

## Schnellstart

### Voraussetzungen

- Node.js 18+
- npm oder yarn
- Supabase-Projekt (optional für Demo-Modus)

### Installation

```bash
# Repository klonen
git clone https://github.com/florianlux/synapedia.git
cd synapedia

# Abhängigkeiten installieren
npm install

# Umgebungsvariablen konfigurieren
cp .env.example .env.local

# Entwicklungsserver starten
npm run dev
```

Die App läuft unter [http://localhost:3000](http://localhost:3000).

### Demo-Modus

Die App funktioniert ohne Supabase-Verbindung mit eingebauten Demo-Daten (3 Artikel: Psilocybin, MDMA, Ketamin).

### Supabase einrichten

1. Erstelle ein neues Projekt auf [supabase.com](https://supabase.com/)
2. Trage die Credentials in `.env.local` ein
3. Führe die Migration aus:

```bash
# Schema erstellen
psql -h your-project.supabase.co -U postgres -d postgres -f supabase/migrations/00001_initial_schema.sql

# Demo-Daten einfügen
psql -h your-project.supabase.co -U postgres -d postgres -f supabase/seed/demo_articles.sql
```

Alternativ über das Supabase Dashboard → SQL Editor.

## Datenmodell

| Tabelle | Beschreibung |
|---------|-------------|
| `articles` | Haupttabelle für Artikel (Slug, Titel, MDX-Inhalt, Status, Risiko) |
| `tags` | Tags/Schlagwörter |
| `article_tags` | Verknüpfung Artikel ↔ Tags |
| `sources` | Wissenschaftliche Quellen (Autor, Journal, DOI) |
| `article_sources` | Verknüpfung Artikel ↔ Quellen |
| `article_versions` | Versionshistorie der Artikel |
| `audit_log` | Protokoll aller Änderungen |

Alle Tabellen haben Row Level Security (RLS) aktiviert.

## Artikel-Template

Jeder Artikel folgt einer standardisierten Struktur:

1. **Kurzfazit** – Zusammenfassung in 2-3 Sätzen
2. **Was ist die Substanz?** – Grundlegende Einordnung
3. **Chemische Struktur / Klasse** – Chemische Klassifikation
4. **Wirkmechanismus** – Pharmakologische Wirkweise
5. **Rezeptorprofil** – Rezeptorbindung und Affinitäten
6. **Wirkprofil** – Subjektive Effekte (qualitativ)
7. **Risiken & Nebenwirkungen** – Bekannte Risiken
8. **Interaktionen** – Wechselwirkungen mit anderen Substanzen
9. **Kreuztoleranz** – Toleranzmechanismen (konzeptionell)
10. **Rechtsstatus** – Rechtliche Einordnung (Disclaimer)
11. **Quellenlage** – Bewertung der Evidenz + Quellenliste

## Projektstruktur

```
synapedia/
├── data/
│   ├── substances.json    # Substanz-Datenmodell (20 Einträge)
│   ├── interactions.json  # Interaktions-Paare (20 Einträge)
│   ├── receptors.json     # Rezeptoren/Transporter (15 Einträge)
│   ├── glossary.json      # Glossarbegriffe (10 Einträge)
│   └── categories.json    # Kategorien
├── src/
│   ├── app/
│   │   ├── admin/          # Admin-Bereich
│   │   │   ├── articles/   # Artikelverwaltung
│   │   │   ├── sources/    # Quellenverwaltung
│   │   │   ├── media/      # Medienverwaltung
│   │   │   ├── audit/      # Audit-Log
│   │   │   ├── layout.tsx  # Admin-Layout mit Sidebar
│   │   │   └── page.tsx    # Dashboard
│   │   ├── articles/
│   │   │   └── [slug]/     # Artikel-Detailseite
│   │   ├── brain/          # Rezeptor-Explorer
│   │   ├── categories/     # Kategorien-Übersicht
│   │   ├── compare/        # Substanz-Vergleich
│   │   ├── glossary/       # Glossar + [slug]-Seiten
│   │   ├── interactions/   # Interaktions-Checker
│   │   ├── api/
│   │   │   └── search/     # Such-API
│   │   ├── layout.tsx      # Root-Layout
│   │   ├── page.tsx        # Startseite
│   │   ├── sitemap.ts      # Auto-generierte Sitemap
│   │   ├── robots.ts       # Robots.txt
│   │   └── globals.css     # Globale Styles
│   ├── components/
│   │   ├── ui/             # shadcn/ui Basiskomponenten
│   │   ├── brain-explorer.tsx       # Gehirn-/Rezeptor-Explorer
│   │   ├── compare-tool.tsx         # Vergleichstool
│   │   ├── glossary-list.tsx        # Glossar-Interaktive Liste
│   │   ├── interaction-checker.tsx  # Interaktions-Checker
│   │   ├── json-ld.tsx     # JSON-LD Schema-Komponente
│   │   ├── header.tsx      # Seitenheader
│   │   ├── footer.tsx      # Seitenfooter
│   │   ├── search-bar.tsx  # Suchleiste
│   │   ├── risk-banner.tsx # Risiko-Warnbanner
│   │   ├── source-box.tsx  # Quellenbox
│   │   ├── table-of-contents.tsx # Inhaltsverzeichnis
│   │   ├── theme-provider.tsx    # Theme-Provider
│   │   └── theme-toggle.tsx      # Dark/Light Toggle
│   └── lib/
│       ├── demo-data.ts    # Demo-Daten
│       ├── types.ts        # TypeScript-Typen
│       ├── utils.ts        # Utility-Funktionen
│       └── supabase/       # Supabase-Client
│           ├── client.ts   # Browser-Client
│           └── server.ts   # Server-Client
├── supabase/
│   ├── migrations/
│   │   └── 00001_initial_schema.sql  # Datenbankschema
│   └── seed/
│       └── demo_articles.sql         # Demo-Daten
├── .env.example
└── README.md
```

## Skripte

```bash
npm run dev      # Entwicklungsserver starten
npm run build    # Production Build erstellen
npm run start    # Production Server starten
npm run lint     # ESLint ausführen
```

## Registrierung & Dosing Tracker

### Registrierung

Nutzer können sich unter `/auth/signup` registrieren (E-Mail, Passwort, optionaler Benutzername, Newsletter-Opt-in). Die Registrierung nutzt Supabase Auth. Ein `user_profiles`-Eintrag wird automatisch per Trigger erstellt.

### Dosing Tracker & Risiko-Overlay

- **Dosing-Logs**: Unter `/account/logs` können authentifizierte Nutzer Substanzeinnahmen protokollieren.
- **Dosing-Logs API**: `GET/POST/DELETE /api/dosing-logs` – CRUD-Endpunkte für die `dosing_logs`-Tabelle (RLS-geschützt).
- **Risiko-Overlay**: Unter `/account/risk` wird ein automatisches Harm-Reduction-Overlay berechnet:
  - Stack Counter (Stimulanzien, Opioide, GABAerg, Cannabis, Nikotin)
  - Kreuz-Kategorie-Warnungen (z.B. Opioid + GABAerg → Atemdepression)
  - Rebound-Zeitfenster
  - Notfall-Hinweise (Red Flags)
- **Demo-Modus**: `/account/risk?demo=1` lädt Beispieldaten zum Testen.

### Migration ausführen

```bash
# SQL-Migration anwenden (Supabase CLI)
supabase db push
# oder manuell: supabase/migrations/00017_dosing_logs_and_profile_trigger.sql
```

### Relevante Umgebungsvariablen

| Variable | Beschreibung |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (serverseitig) |

## Lizenz

MIT

## Disclaimer

Diese Plattform wurde ausschließlich zu Bildungs- und Forschungszwecken entwickelt. Die bereitgestellten Informationen ersetzen keine professionelle medizinische Beratung. Die Inhalte enthalten keine Konsumanleitungen, Dosierungsempfehlungen oder Beschaffungshinweise.
