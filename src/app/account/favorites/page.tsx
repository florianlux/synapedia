"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FavoriteWithSubstance {
  substance_id: string;
  created_at: string;
  substance_name?: string;
  substance_slug?: string;
}

export default function FavoritesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [favorites, setFavorites] = useState<FavoriteWithSubstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data } = await supabase
        .from("substance_favorites")
        .select("substance_id, created_at, substances(name, slug)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setFavorites(
          data.map((f: Record<string, unknown>) => {
            const sub = f.substances as Record<string, string> | null;
            return {
              substance_id: f.substance_id as string,
              created_at: f.created_at as string,
              substance_name: sub?.name,
              substance_slug: sub?.slug,
            };
          })
        );
      }
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function removeFavorite(substanceId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("substance_favorites")
      .delete()
      .eq("substance_id", substanceId)
      .eq("user_id", user.id);

    setFavorites((prev) => prev.filter((f) => f.substance_id !== substanceId));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Mein Konto
      </h1>

      <nav className="mb-8 flex gap-4 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <Link
          href="/account"
          className="pb-3 text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Profil
        </Link>
        <span className="border-b-2 border-cyan-500 pb-3 text-sm font-medium text-cyan-600 dark:text-cyan-400">
          Favoriten
        </span>
        <Link
          href="/account/logs"
          className="pb-3 text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Protokoll
        </Link>
      </nav>

      {loading ? (
        <p className="text-neutral-500">Laden…</p>
      ) : favorites.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <Heart className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
          <p className="text-neutral-500 dark:text-neutral-400">
            Du hast noch keine Substanzen favorisiert.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {favorites.map((fav) => (
            <li
              key={fav.substance_id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div>
                <p className="font-medium text-neutral-900 dark:text-neutral-50">
                  {fav.substance_name || fav.substance_id}
                </p>
                {fav.substance_slug && (
                  <p className="text-xs text-neutral-500">{fav.substance_slug}</p>
                )}
              </div>
              <button
                onClick={() => removeFavorite(fav.substance_id)}
                className="rounded-md p-2 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
                title="Entfernen"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
