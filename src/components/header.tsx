"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Lock, Menu, User, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SynapediaLogo } from "@/components/synapedia-logo";

function isSupabaseReady() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(url && key && !url.includes("your-project") && key !== "your-anon-key");
}

const navLinks = [
  { href: "/", label: "Startseite" },
  { href: "/articles", label: "Artikel" },
  { href: "/feed", label: "Feed" },
  { href: "/interactions", label: "Interaktionen" },
  { href: "/brain", label: "Gehirn" },
  { href: "/neuro", label: "NeuroMap" },
  { href: "/glossary", label: "Glossar" },
  { href: "/compare", label: "Vergleich" },
];

const adminEnabled = process.env.NEXT_PUBLIC_ADMIN_ENABLED === "true";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isSupabaseReady()) return;

    // Dynamic import to avoid errors when Supabase isn't configured
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        setIsLoggedIn(!!user);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsLoggedIn(!!session?.user);
      });

      // Store cleanup function
      cleanupRef.current = () => subscription.unsubscribe();
    });

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <SynapediaLogo className="h-7 w-7 text-cyan-500 transition-transform duration-300 group-hover:scale-105" />
          <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-cyan-50">
            Synapedia
          </span>
        </Link>
        <nav className="hidden items-center gap-4 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {adminEnabled && (
            <Link
              href="/admin"
              className="hidden items-center gap-1 text-xs text-neutral-400/50 transition-colors duration-200 hover:text-teal-300 dark:text-white/50 dark:hover:text-teal-300 lg:flex"
            >
              <Lock className="h-3 w-3" />
              Admin
            </Link>
          )}
          {isLoggedIn ? (
            <Link
              href="/account"
              className="hidden items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50 lg:flex"
            >
              <User className="h-4 w-4" />
              Konto
            </Link>
          ) : (
            <Link
              href="/auth/login"
              className="hidden rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700 lg:inline-flex"
            >
              Anmelden
            </Link>
          )}
          <ThemeToggle />
          <button
            type="button"
            aria-label="Menü öffnen"
            className="inline-flex items-center justify-center rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50 lg:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      {mobileOpen && (
        <nav className="border-t border-neutral-200 bg-white/95 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-950/95 lg:hidden">
          <div className="mx-auto max-w-7xl space-y-1 px-4 pb-4 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-md px-3 py-2 text-base font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
              >
                {link.label}
              </Link>
            ))}
            {isLoggedIn ? (
              <Link
                href="/account"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-1 rounded-md px-3 py-2 text-base font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
              >
                <User className="h-4 w-4" />
                Konto
              </Link>
            ) : (
              <Link
                href="/auth/login"
                onClick={() => setMobileOpen(false)}
                className="block rounded-md px-3 py-2 text-base font-medium text-cyan-600 transition-colors hover:bg-neutral-100 dark:text-cyan-400 dark:hover:bg-neutral-800"
              >
                Anmelden
              </Link>
            )}
            {adminEnabled && (
              <Link
                href="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-1 rounded-md px-3 py-2 text-xs text-neutral-400/50 transition-colors duration-200 hover:bg-neutral-100 hover:text-teal-300 dark:text-white/50 dark:hover:bg-neutral-800 dark:hover:text-teal-300"
              >
                <Lock className="h-3 w-3" />
                Admin
              </Link>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
