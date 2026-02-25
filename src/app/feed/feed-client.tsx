"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ThumbsUp, Send, MessageSquare } from "lucide-react";
import { createClientSafe } from "@/lib/supabase/client";
import type { FeedPost } from "@/lib/types";

type FeedMode = "new" | "for_you";

export default function FeedPage() {
  const supabase = useMemo(() => createClientSafe(), []);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(!!supabase);
  const [mode, setMode] = useState<FeedMode>("new");
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Composer state
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    const sb = supabase;
    let cancelled = false;

    async function fetchPosts() {
      setLoading(true);

      const { data: { user } } = await sb.auth.getUser();
      if (cancelled) return;
      setUserId(user?.id ?? null);

      const query = sb
        .from("feed_posts")
        .select("*, user_profiles!feed_posts_author_id_fkey(username, avatar_url), feed_post_votes(value)")
        .eq("status", "published")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(50);

      if (mode === "for_you" && user) {
        const { data: profile } = await sb
          .from("user_profiles")
          .select("favorite_tags")
          .eq("user_id", user.id)
          .single();

        const { data: favorites } = await sb
          .from("substance_favorites")
          .select("substance_id")
          .eq("user_id", user.id);

        const { data: rawPosts } = await query;

        if (cancelled) return;

        if (rawPosts) {
          const favTags = profile?.favorite_tags || [];
          const favSubstances = (favorites || []).map((f: { substance_id: string }) => f.substance_id);

          const scored = rawPosts.map((post: Record<string, unknown>) => {
            const authorProfile = post.user_profiles as Record<string, string> | null;
            const votes = post.feed_post_votes as Array<{ value: number }> | null;
            const postTags = (post.tags as string[]) || [];
            const voteCount = votes?.reduce((sum: number, v: { value: number }) => sum + v.value, 0) ?? 0;
            const userVoted = user ? votes?.some((v: Record<string, unknown>) => v.user_id === user.id) ?? false : false;

            let score = 0;
            for (const tag of postTags) {
              if (favTags.includes(tag)) score += 2;
            }
            if (post.substance_id && favSubstances.includes(post.substance_id as string)) {
              score += 3;
            }

            return {
              ...(post as object),
              author_username: authorProfile?.username,
              author_avatar_url: authorProfile?.avatar_url,
              vote_count: voteCount,
              user_voted: userVoted,
              _score: score,
            } as FeedPost & { _score: number };
          });

          scored.sort((a, b) => b._score - a._score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setPosts(scored);
        }
      } else {
        const { data: rawPosts } = await query;
        if (cancelled) return;

        if (rawPosts) {
          setPosts(
            rawPosts.map((post: Record<string, unknown>) => {
              const authorProfile = post.user_profiles as Record<string, string> | null;
              const votes = post.feed_post_votes as Array<{ value: number }> | null;
              const voteCount = votes?.reduce((sum: number, v: { value: number }) => sum + v.value, 0) ?? 0;
              const userVoted = user ? votes?.some((v: Record<string, unknown>) => v.user_id === user.id) ?? false : false;

              return {
                ...(post as object),
                author_username: authorProfile?.username,
                author_avatar_url: authorProfile?.avatar_url,
                vote_count: voteCount,
                user_voted: userVoted,
              } as FeedPost;
            })
          );
        }
      }

      setLoading(false);
    }

    fetchPosts();

    return () => { cancelled = true; };
  }, [supabase, mode, refreshKey]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !supabase) return;
    setPosting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const { error } = await supabase.from("feed_posts").insert({
      author_id: user.id,
      title: title || null,
      body,
      tags: tagList,
    });

    if (!error) {
      setTitle("");
      setBody("");
      setTags("");
      setShowComposer(false);
      setRefreshKey((k) => k + 1);
    }
    setPosting(false);
  }

  async function handleVote(postId: string) {
    if (!userId || !supabase) return;

    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    if (post.user_voted) {
      await supabase
        .from("feed_post_votes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);
    } else {
      await supabase.from("feed_post_votes").insert({
        post_id: postId,
        user_id: userId,
      });
    }

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              user_voted: !p.user_voted,
              vote_count: (p.vote_count || 0) + (p.user_voted ? -1 : 1),
            }
          : p
      )
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Feed
        </h1>
        {userId ? (
          <button
            onClick={() => setShowComposer(!showComposer)}
            className="flex items-center gap-1.5 rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
          >
            <Send className="h-4 w-4" />
            Beitrag
          </button>
        ) : (
          <Link
            href="/auth/login"
            className="rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
          >
            Anmelden um zu posten
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-900">
        <button
          onClick={() => setMode("new")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "new"
              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-50"
              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
          }`}
        >
          Neu
        </button>
        <button
          onClick={() => setMode("for_you")}
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "for_you"
              ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-800 dark:text-neutral-50"
              : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
          }`}
        >
          Für dich
        </button>
      </div>

      {/* Composer */}
      {showComposer && (
        <form
          onSubmit={handlePost}
          className="mb-6 space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titel (optional)"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
          <textarea
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            placeholder="Was möchtest du teilen?"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (kommagetrennt, optional)"
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={posting}
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
            >
              {posting ? "Posten…" : "Posten"}
            </button>
            <button
              type="button"
              onClick={() => setShowComposer(false)}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {/* Posts */}
      {loading ? (
        <p className="text-neutral-500">Laden…</p>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
          <p className="text-neutral-500 dark:text-neutral-400">
            Noch keine Beiträge. Sei der Erste!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
                  {(post.author_username || "?")[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {post.author_username || "Anonym"}
                </span>
                <span className="text-xs text-neutral-400">
                  {new Date(post.created_at).toLocaleDateString("de-DE")}
                </span>
              </div>
              {post.title && (
                <h2 className="mb-1 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  {post.title}
                </h2>
              )}
              <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                {post.body}
              </p>
              {post.tags && post.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => handleVote(post.id)}
                  disabled={!userId}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors ${
                    post.user_voted
                      ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300"
                      : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                  title={userId ? "Abstimmen" : "Anmelden um abzustimmen"}
                >
                  <ThumbsUp className="h-4 w-4" />
                  {post.vote_count || 0}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
