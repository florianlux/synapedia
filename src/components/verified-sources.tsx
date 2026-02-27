import Image from "next/image";
import { BadgeCheck, ExternalLink } from "lucide-react";
import type { RankedAffiliateLink } from "@/lib/monetization/types";

/**
 * VerifiedSources – Clean "Verified Sources" module.
 *
 * Displays ranked affiliate provider links in a scientific, non-spammy style.
 * Designed to feel like "Verified labs / Lab-tested suppliers", not affiliate marketing.
 *
 * Returns null if no links are available (fallback: hide module entirely).
 */
export function VerifiedSources({
  links,
  entityName,
}: {
  links: RankedAffiliateLink[];
  entityName?: string;
}) {
  if (links.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50/50 p-6 dark:border-emerald-800/50 dark:bg-emerald-950/20">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-emerald-800 dark:text-emerald-300">
        <BadgeCheck className="h-5 w-5" />
        Verifizierte Bezugsquellen
        {entityName && (
          <span className="font-normal text-emerald-600 dark:text-emerald-400">
            {" "}– {entityName}
          </span>
        )}
      </h3>
      <p className="mb-4 text-xs text-emerald-700/70 dark:text-emerald-400/60">
        Unabhängig geprüfte Anbieter mit laboranalytischer Qualitätssicherung.
      </p>

      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.provider.id}>
            <a
              href={link.affiliate_url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="group flex items-center justify-between rounded-md border border-emerald-200 bg-white px-4 py-3 transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/40"
            >
              <div className="flex items-center gap-3">
                {link.provider.logo_url ? (
                  <Image
                    src={link.provider.logo_url}
                    alt={link.provider.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded object-contain"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                    {link.provider.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div>
                  <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {link.custom_label ?? link.provider.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {link.provider.verified && (
                      <span className="flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <BadgeCheck className="h-3 w-3" />
                        Verifiziert
                      </span>
                    )}
                    {link.provider.region && link.provider.region !== "global" && (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {link.provider.region}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <ExternalLink className="h-4 w-4 text-neutral-400 transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[10px] text-neutral-400 dark:text-neutral-500">
        Affiliate-Links. Wir erhalten möglicherweise eine Provision bei Käufen über diese Links.
      </p>
    </section>
  );
}
