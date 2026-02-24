# AI Article Generator — Runbook

## Überblick

Das AI Article Generator System erzeugt aus Substanz-Daten und konfigurierbaren Templates
wissenschaftliche Artikel-Entwürfe. Alle Entwürfe durchlaufen einen Content-Filter und
werden nur als Draft gespeichert — Publish ist nur manuell nach Review möglich.

## Umgebungsvariablen

```env
# Pflicht für AI-Generierung
OPENAI_API_KEY=sk-...

# Pflicht für DB-Zugang
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # nur server-side

# Optional — Admin Auth
ADMIN_TOKEN=your-secret-admin-token
NEXT_PUBLIC_ADMIN_ENABLED=true
ADMIN_ENABLED=true
```

## Migration anwenden

Die Migration `00009_article_templates.sql` erstellt:
- `article_templates` — Template-Definitionen für die AI-Generierung
- `generated_articles` — Gespeicherte AI-Entwürfe mit Status-Tracking

### Via Supabase CLI
```bash
supabase db push
```

### Via SQL Editor (Supabase Dashboard)
Kopiere den Inhalt von `supabase/migrations/00009_article_templates.sql` in den
SQL Editor deines Supabase-Projekts und führe ihn aus.

## Lokal testen

### 1. Substanz auswählen
- Navigiere zu `/admin/substances`
- Klicke auf eine vorhandene Substanz (oder importiere neue via Bulk Import)
- Du landest auf `/admin/substances/[id]`

### 2. Template wählen
- Im „Artikelgenerator"-Bereich wähle ein Template aus dem Dropdown
- Optionen: Sprache (de/en), Ton (wissenschaftlich/verständlich/klinisch), Länge

### 3. Generieren
- Klicke „Mit ChatGPT generieren"
- Der Entwurf wird über die OpenAI API generiert
- Nach der Generierung durchläuft der Text den Content-Filter

### 4. Review
- **Draft**: Entwurf kann geprüft und übernommen werden
- **Blocked**: Content-Filter hat problematische Inhalte erkannt — Gründe werden angezeigt

### 5. In Artikel übernehmen
- Klicke „In Artikel übernehmen"
- Ein neuer Artikel wird als Draft in der articles-Tabelle erstellt
- Der generierte Artikel wird als „mapped" markiert
- Audit-Log-Einträge werden geschrieben

### 6. Manual Publish
- Navigiere zum erstellten Artikel via `/admin/articles/[id]`
- Prüfe den Inhalt
- Setze den Status manuell auf „Veröffentlicht"

## Content-Filter

Der Content-Filter prüft den generierten Text auf:
- Konsum-/Dosierungsanleitungen
- Beschaffungs-/Vendor-Referenzen
- Synthese-/Extraktionsanleitungen
- Injektions-/Inhalations-/Rauch-Anleitungen

Bei einem Treffer wird der Draft als **blocked** markiert.

## API Endpoints

### POST `/api/admin/ai/generate-article`
Generiert einen Artikel-Entwurf.

**Request:**
```json
{
  "substanceId": "uuid",
  "templateKey": "substance_overview_v1",
  "language": "de",
  "tone": "scientific",
  "length": "medium"
}
```

**Response:**
```json
{
  "id": "uuid",
  "content_mdx": "# Artikel...",
  "status": "draft",
  "blocked_reasons": [],
  "citations": [...]
}
```

### POST `/api/admin/ai/map-to-article`
Übernimmt einen Draft in die articles-Tabelle.

**Request:**
```json
{
  "generatedArticleId": "uuid"
}
```

**Response:**
```json
{
  "article_id": "uuid",
  "title": "Substanz – Overview",
  "slug": "substanz-overview",
  "status": "draft"
}
```

## Verfügbare Templates

| Key | Name | Beschreibung |
|-----|------|-------------|
| `substance_overview_v1` | Substanz – Überblick | Neutraler wissenschaftlicher Überblick |
| `harm_reduction_v1` | Harm Reduction – Fokus | Risikominimierung und Hilfsangebote |
| `pharmacology_v1` | Pharmakologie – High Level | Wirkmechanismus und Neurowissenschaft |
| `risk_interactions_v1` | Risiko & Wechselwirkungen | Risikoprofil und Interaktionen |
| `legal_status_v1` | Recht & Einordnung | Rechtliche Einordnung (neutral) |
| `myths_facts_v1` | Mythen & Fakten | Aufklärung über Mythen |
