"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/login`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-4 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          E-Mail gesendet
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Falls ein Konto mit dieser E-Mail existiert, erhältst du eine Nachricht mit einem Link zum Zurücksetzen deines Passworts.
        </p>
        <Link
          href="/auth/login"
          className="mt-4 inline-block text-cyan-600 hover:underline dark:text-cyan-400"
        >
          Zurück zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Passwort zurücksetzen
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            E-Mail
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

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
        >
          {loading ? "Wird gesendet…" : "Link senden"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        <Link href="/auth/login" className="text-cyan-600 hover:underline dark:text-cyan-400">
          Zurück zur Anmeldung
        </Link>
      </p>
    </div>
  );
}
