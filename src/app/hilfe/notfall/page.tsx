import type { Metadata } from "next";
import Link from "next/link";
import { Phone, ExternalLink, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Notfallkontakte – Hilfe & Beratung | Synapedia",
  description:
    "Notfallnummern und Krisentelefone bei akuter Gefährdung durch Substanzkonsum. Kostenlos, anonym, 24/7 erreichbar.",
};

const emergencyContacts = [
  {
    name: "Europäischer Notruf",
    number: "112",
    tel: "tel:112",
    description: "Bei lebensbedrohlichen Situationen sofort anrufen.",
    availability: "24/7 – kostenlos",
    highlight: true,
  },
  {
    name: "TelefonSeelsorge",
    number: "0800 111 0 111",
    tel: "tel:08001110111",
    description:
      "Professionelle psychologische Begleitung in Krisensituationen. Anonym und kostenlos.",
    availability: "24/7 – kostenlos",
    extra: {
      number: "0800 111 0 222",
      tel: "tel:08001110222",
    },
    website: "https://www.telefonseelsorge.de",
  },
  {
    name: "Sucht & Drogen Hotline (BZgA)",
    number: "0180 6 31 30 31",
    tel: "tel:01806313031",
    description:
      "Beratung zu Sucht und Drogen durch Fachkräfte der Bundeszentrale für gesundheitliche Aufklärung.",
    availability: "Mo–Do 10–22 Uhr, Fr–So 10–18 Uhr",
    website: "https://www.bzga.de",
  },
  {
    name: "Deutsche Hauptstelle für Suchtfragen (DHS)",
    number: null,
    tel: null,
    description:
      "Umfassende Informationen, Selbsthilfe-Materialien und ein bundesweiter Beratungsstellenfinder.",
    availability: null,
    website: "https://www.dhs.de",
  },
  {
    name: "Narcotics Anonymous Deutschland",
    number: "01803 576 900",
    tel: "tel:01803576900",
    description:
      "Selbsthilfegruppen für Menschen mit Suchterkrankungen. Keine Gebühren, keine Aufnahmevoraussetzungen.",
    availability: "Hotline: Mo–Fr 9–18 Uhr",
    website: "https://www.na-germany.org",
  },
];

export default function NotfallPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/hilfe"
        className="mb-6 inline-flex text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        aria-label="Zurück zur Hilfe-Übersicht"
      >
        ← Zurück zur Hilfe-Übersicht
      </Link>

      <h1 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl text-neutral-900 dark:text-neutral-50">
        Notfallkontakte
      </h1>
      <p className="mb-8 text-neutral-600 dark:text-neutral-400">
        Alle Anlaufstellen bei akuter Gefährdung. Kostenlos, vertraulich,
        rund um die Uhr erreichbar.
      </p>

      {/* Emergency banner */}
      <div
        className="mb-8 rounded-xl border-2 border-red-500 bg-red-50 p-6 dark:bg-red-950/20"
        role="alert"
        aria-live="polite"
      >
        <p className="text-center text-lg font-semibold text-red-700 dark:text-red-400">
          Bei akuter Lebensgefahr sofort:
        </p>
        <a
          href="tel:112"
          className="mt-2 flex items-center justify-center gap-3 text-4xl font-bold text-red-600 hover:underline dark:text-red-400"
          aria-label="Notruf 112 anrufen"
        >
          <Phone className="h-8 w-8" />
          112
        </a>
      </div>

      {/* Contacts list */}
      <div className="space-y-4">
        {emergencyContacts.map((contact) => (
          <div
            key={contact.name}
            className={`rounded-xl border p-6 ${
              contact.highlight
                ? "border-red-400 bg-red-50 dark:bg-red-950/20"
                : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
            }`}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                  {contact.name}
                </h2>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {contact.description}
                </p>
                {contact.availability && (
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                    🕐 {contact.availability}
                  </p>
                )}
              </div>
              <div className="mt-3 flex flex-col items-start gap-2 sm:mt-0 sm:items-end">
                {contact.tel && contact.number && (
                  <a
                    href={contact.tel}
                    className="flex items-center gap-2 font-semibold text-red-600 hover:underline dark:text-red-400"
                    aria-label={`${contact.name} anrufen: ${contact.number}`}
                  >
                    <Phone className="h-4 w-4" />
                    {contact.number}
                  </a>
                )}
                {contact.extra && (
                  <a
                    href={contact.extra.tel}
                    className="flex items-center gap-2 font-semibold text-red-600 hover:underline dark:text-red-400"
                    aria-label={`${contact.name} anrufen: ${contact.extra.number}`}
                  >
                    <Phone className="h-4 w-4" />
                    {contact.extra.number}
                  </a>
                )}
                {contact.website && (
                  <a
                    href={contact.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-cyan-600 underline hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-200"
                    aria-label={`${contact.name} Website öffnen (öffnet in neuem Tab)`}
                  >
                    Website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          <strong>Hinweis:</strong> Synapedia ersetzt keine ärztliche Beratung.
          Diese Seite dient der Weitervermittlung zu professionellen Stellen.
        </p>
      </div>
    </div>
  );
}
