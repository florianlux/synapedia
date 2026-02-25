import { CheckCircle2, XCircle } from "lucide-react";

interface SecretMeta {
  name: string;
  category: string;
  configured: boolean;
  hint: string;
}

/** Known environment variables the platform cares about. */
const SECRET_DEFS: { name: string; category: string; hint: string }[] = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", category: "Supabase", hint: "Supabase project URL" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", category: "Supabase", hint: "Supabase anonymous key" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", category: "Supabase", hint: "Server-side service-role key (bypasses RLS)" },
  { name: "ADMIN_TOKEN", category: "Auth", hint: "Shared admin authentication token" },
  { name: "OPENAI_API_KEY", category: "AI", hint: "OpenAI API key for AI features" },
  { name: "ANTHROPIC_API_KEY", category: "AI", hint: "Anthropic API key for AI features" },
  { name: "GITHUB_TOKEN", category: "GitHub", hint: "GitHub PAT for Dev-Activity feed" },
];

function isConfigured(name: string): boolean {
  const val = process.env[name];
  if (!val) return false;
  const placeholders = [
    "your-project",
    "your-anon-key",
    "your-service-role-key",
    "your-secret-admin-token",
    "sk-your-openai-key",
    "sk-ant-your-anthropic-key",
  ];
  return !placeholders.some((p) => val.includes(p));
}

function getSecrets(): SecretMeta[] {
  return SECRET_DEFS.map((d) => ({
    name: d.name,
    category: d.category,
    configured: isConfigured(d.name),
    hint: d.hint,
  }));
}

export default function SecretsPage() {
  const secrets = getSecrets();
  const categories = [...new Set(secrets.map((s) => s.category))];
  const configuredCount = secrets.filter((s) => s.configured).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Secrets Register
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Übersicht aller Umgebungsvariablen – nur Metadaten, keine Werte.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          <strong>{configuredCount}</strong> von {secrets.length} Variablen konfiguriert
        </p>
      </div>

      {categories.map((cat) => (
        <div key={cat} className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">{cat}</h2>
          <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {secrets
              .filter((s) => s.category === cat)
              .map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="font-mono text-sm text-neutral-900 dark:text-neutral-100">
                      {s.name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{s.hint}</p>
                  </div>
                  {s.configured ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Konfiguriert
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-neutral-400 dark:text-neutral-500">
                      <XCircle className="h-4 w-4" />
                      Nicht gesetzt
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
