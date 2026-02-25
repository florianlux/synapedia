"use client";

import { useState } from "react";
import Link from "next/link";
import { navLinks, siteConfig } from "@/content/portfolio";
import { Menu, X } from "lucide-react";

export function PortfolioNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-neutral-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/about"
          className="text-sm font-semibold tracking-tight text-white"
        >
          {siteConfig.name}
        </Link>

        {/* Desktop links */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Portfolio navigation">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-neutral-400 transition-colors hover:text-white focus:outline-none focus:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex items-center justify-center rounded-md p-2 text-neutral-400 transition-colors hover:text-white md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <nav className="border-t border-white/5 bg-neutral-950/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto max-w-6xl space-y-1 px-4 pb-4 pt-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-base text-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
