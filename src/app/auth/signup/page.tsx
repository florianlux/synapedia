"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate username
    if (username.length < 3 || username.length > 30) {
      setError("Benutzername muss zwischen 3 und 30 Zeichen lang sein.");
      setLoading(false);
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError("Benutzername darf nur Buchstaben, Zahlen, _ und - enthalten.");
      setLoading(false);
      return;
    }

    const supabase = createClient();

    // Check username uniqueness (escape ILIKE wildcards _ and % to avoid false matches)
    const escapedUsername = username.replace(/%/g, "\\%").replace(/_/g, "\\_");
    const { data: existing } = await supabase
      .from("user_profiles")
      .select("id")
      .ilike("username", escapedUsername)
      .maybeSingle();

    if (existing) {
      setError("Dieser Benutzername ist bereits vergeben.");
      setLoading(false);
      return;
    }

    // Sign up – pass metadata so the handle_new_user trigger creates the profile automatically
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          phone: phone || null,
          newsletter_opt_in: newsletter,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    // If email confirmation is not required, redirect
    if (authData.session) {
      router.push("/account");
      router.refresh();
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-4 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Registrierung erfolgreich!
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Bitte überprüfe dein E-Mail-Postfach und bestätige deine Adresse, um fortzufahren.
        </p>
        <Link
          href="/auth/login"
          className="mt-4 inline-block text-cyan-600 hover:underline dark:text-cyan-400"
        >
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Registrieren
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            E-Mail *
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder:text-neutral-500"
            placeholder="name@beispiel.de"
          />
        </div>

        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Benutzername *
          </label>
          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder:text-neutral-500"
            placeholder="dein_benutzername"
          />
          <p className="mt-1 text-xs text-neutral-500">3–30 Zeichen, Buchstaben, Zahlen, _ und -</p>
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Passwort *
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder:text-neutral-500"
            placeholder="Mindestens 6 Zeichen"
          />
        </div>

        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Handynummer <span className="text-neutral-400">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder:text-neutral-500"
            placeholder="+49 170 1234567"
          />
        </div>

        <div className="flex items-start gap-2">
          <input
            id="newsletter"
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-neutral-300 text-cyan-600 focus:ring-cyan-500 dark:border-neutral-600"
          />
          <label htmlFor="newsletter" className="text-sm text-neutral-600 dark:text-neutral-400">
            Ich möchte den Newsletter erhalten (optional)
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
        >
          {loading ? "Wird registriert…" : "Konto erstellen"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Bereits registriert?{" "}
        <Link href="/auth/login" className="text-cyan-600 hover:underline dark:text-cyan-400">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
