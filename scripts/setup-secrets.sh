#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

# sicher eingeben (nicht echoen)
prompt_secret () {
  local var_name="$1"
  local hint="$2"
  local val=""
  echo ""
  echo "$var_name  ($hint)"
  read -r -s -p "Wert eingeben (hidden): " val
  echo ""
  if [[ -z "$val" ]]; then
    echo "❌ $var_name ist leer – abgebrochen."
    exit 1
  fi
  printf "%s" "$val"
}

prompt_plain () {
  local var_name="$1"
  local hint="$2"
  local val=""
  echo ""
  echo "$var_name  ($hint)"
  read -r -p "Wert eingeben: " val
  if [[ -z "$val" ]]; then
    echo "❌ $var_name ist leer – abgebrochen."
    exit 1
  fi
  printf "%s" "$val"
}

upsert_env () {
  local key="$1"
  local value="$2"

  # .env.local anlegen falls nicht vorhanden
  touch "$ENV_FILE"

  # Key maskieren in Output
  local masked="***"
  echo "→ set $key=$masked in .env.local"

  # existiert? dann ersetzen, sonst anhängen
  if grep -qE "^${key}=" "$ENV_FILE"; then
    # macOS + linux kompatibel
    perl -0777 -i -pe "s/^${key}=.*$/\Q${key}\E=${value}/m" "$ENV_FILE"
  else
    echo "${key}=${value}" >> "$ENV_FILE"
  fi
}

echo "🔐 Synapedia Secrets Setup"
echo "Schreibt nach: $ENV_FILE"
echo "Keys werden NICHT im Klartext ausgegeben."

SUPABASE_URL="$(prompt_plain  NEXT_PUBLIC_SUPABASE_URL        "Supabase Project URL")"
SUPABASE_ANON="$(prompt_secret NEXT_PUBLIC_SUPABASE_ANON_KEY  "Supabase anon key (public, aber trotzdem nicht posten)")"
SUPABASE_SRVC="$(prompt_secret SUPABASE_SERVICE_ROLE_KEY      "Supabase service_role key (SEHR sensibel)")"
ADMIN_TOKEN="$(prompt_secret  ADMIN_TOKEN                    "Shared Admin Token (lang & zufällig)")"

OPENAI_KEY="$(prompt_secret    OPENAI_API_KEY                "OpenAI API Key")"
ANTHROPIC_KEY="$(prompt_secret ANTHROPIC_API_KEY             "Anthropic API Key")"
GITHUB_TOKEN="$(prompt_secret  GITHUB_TOKEN                  "GitHub PAT (read-only reicht)")"

upsert_env "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
upsert_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON"
upsert_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SRVC"
upsert_env "ADMIN_TOKEN" "$ADMIN_TOKEN"
upsert_env "OPENAI_API_KEY" "$OPENAI_KEY"
upsert_env "ANTHROPIC_API_KEY" "$ANTHROPIC_KEY"
upsert_env "GITHUB_TOKEN" "$GITHUB_TOKEN"

echo ""
echo "✅ .env.local aktualisiert."

echo ""
read -r -p "Willst du die Variablen auch in Netlify setzen (netlify CLI)? (y/N): " DO_NETLIFY
if [[ "${DO_NETLIFY:-N}" =~ ^[Yy]$ ]]; then
  if ! command -v netlify >/dev/null 2>&1; then
    echo "❌ netlify CLI nicht gefunden. Install: npm i -g netlify-cli"
    exit 1
  fi

  echo "→ Netlify env:set (Keys werden nicht geloggt)"
  netlify env:set NEXT_PUBLIC_SUPABASE_URL "$SUPABASE_URL"
  netlify env:set NEXT_PUBLIC_SUPABASE_ANON_KEY "$SUPABASE_ANON"
  netlify env:set SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SRVC"
  netlify env:set ADMIN_TOKEN "$ADMIN_TOKEN"
  netlify env:set OPENAI_API_KEY "$OPENAI_KEY"
  netlify env:set ANTHROPIC_API_KEY "$ANTHROPIC_KEY"
  netlify env:set GITHUB_TOKEN "$GITHUB_TOKEN"

  echo "✅ Netlify Variablen gesetzt."
  echo "ℹ️ Jetzt redeployen (oder automatisch per Git Push)."
fi

echo ""
echo "Done."
