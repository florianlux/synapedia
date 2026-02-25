import { siteConfig } from "@/content/portfolio";

export function PortfolioFooter() {
  return (
    <footer className="border-t border-white/5 py-8">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-neutral-600 sm:px-6">
        © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </div>
    </footer>
  );
}
