"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClientSafe } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types";

export default function AccountPage() {
  const router = useRouter();
  const supabase = createClientSafe();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form state
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [favoriteTags, setFavoriteTags] = useState("");

  useEffect(() => {
    async function load() {
      if (!supabase) { router.push("/auth/login"); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setProfile(data as UserProfile);
        setUsername(data.username || "");
        setBio(data.bio || "");
        setPhone(data.phone || "");
        setNewsletter(data.newsletter_opt_in || false);
        setFavoriteTags((data.favorite_tags || []).join(", "));
      }
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setMessage(null);

    const tags = favoriteTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("user_profiles")
      .update({
        username,
        bio: bio || null,
        phone: phone || null,
        newsletter_opt_in: newsletter,
        favorite_tags: tags,
      })
      .eq("user_id", profile!.user_id);

    if (error) {
      setMessage("Fehler: " + error.message);
    } else {
      setMessage("Profil gespeichert!");
    }
    setSaving(false);
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <p className="text-neutral-500">Laden…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Mein Konto
        </h1>
        <button
          onClick={handleLogout}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          Abmelden
        </button>
      </div>

      <nav className="mb-8 flex gap-4 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <span className="border-b-2 border-cyan-500 pb-3 text-sm font-medium text-cyan-600 dark:text-cyan-400">
          Profil
        </span>
        <Link
          href="/account/favorites"
          className="pb-3 text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Favoriten
        </Link>
        <Link
          href="/account/logs"
          className="pb-3 text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Protokoll
        </Link>
        <Link
          href="/account/risk"
          className="pb-3 text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Risiko-Overlay
        </Link>
      </nav>

      <div className="mb-8">
        <Link
          href="/account/risk"
          className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
        >
          🛡️ Risiko-Overlay anzeigen
        </Link>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {message && (
          <div className={`rounded-md border p-3 text-sm ${message.startsWith("Fehler") ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300" : "border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"}`}>
            {message}
          </div>
        )}

        <div>
          <label htmlFor="username" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Benutzername
          </label>
          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </div>

        <div>
          <label htmlFor="bio" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Bio <span className="text-neutral-400">(optional)</span>
          </label>
          <textarea
            id="bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
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
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </div>

        <div>
          <label htmlFor="tags" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Lieblingskategorien <span className="text-neutral-400">(kommagetrennt)</span>
          </label>
          <input
            id="tags"
            type="text"
            value={favoriteTags}
            onChange={(e) => setFavoriteTags(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            placeholder="Psychedelika, Dissoziativa, Empathogene"
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
            Newsletter erhalten
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
        >
          {saving ? "Speichern…" : "Profil speichern"}
        </button>
      </form>
    </div>
  );
}
