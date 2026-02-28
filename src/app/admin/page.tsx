import { allArticles } from "@/lib/articles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAiEnabled } from "@/lib/ai/provider";
import type { Article } from "@/lib/types";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

async function getArticlesData(): Promise<Article[]> {
  if (isSupabaseConfigured()) {
    try {
      const { getArticles } = await import("@/lib/db/articles");
      return await getArticles();
    } catch {
      // Fallback to demo
    }
  }
  return allArticles;
}

export default async function AdminDashboard() {
  const articles = await getArticlesData();
  const aiEnabled = isAiEnabled();
  const supabaseConfigured = isSupabaseConfigured();

  return (
    <AdminDashboardClient
      articles={articles}
      aiEnabled={aiEnabled}
      supabaseConfigured={supabaseConfigured}
    />
  );
}
