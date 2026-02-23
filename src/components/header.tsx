import Link from "next/link";
import { Brain } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const navLinks = [
  { href: "/", label: "Startseite" },
  { href: "/articles", label: "Artikel" },
  { href: "/interactions", label: "Interaktionen" },
  { href: "/brain", label: "Gehirn" },
  { href: "/glossary", label: "Glossar" },
  { href: "/compare", label: "Vergleich" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-white/80 backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Brain className="h-7 w-7 text-cyan-500" />
          <span className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
