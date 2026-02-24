"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SynapediaLogo } from "@/components/synapedia-logo";
import { BrandWordmark } from "@/components/BrandWordmark";

const navLinks = [
  { href: "/", label: "Startseite" },
  { href: "/articles", label: "Artikel" },
  { href: "/interactions", label: "Interaktionen" },
  { href: "/brain", label: "Gehirn" },
  { href: "/glossary", label: "Glossar" },
  { href: "/compare", label: "Vergleich" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <SynapediaLogo className="h-7 w-7 text-cyan-500 transition-transform duration-300 group-hover:scale-105" />
          <BrandWordmark className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50" />
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
          </div>
        </nav>
      )}
    </header>
  );
}
