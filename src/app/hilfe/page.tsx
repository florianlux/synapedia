import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Phone, HeartHandshake, ClipboardList } from "lucide-react";

export const metadata: Metadata = {
  title: "Hilfe bei Suchtproblemen – Beratung & Notfallkontakte | Synapedia",
  description:
    "Anlaufstellen für Suchtberatung, Notfallkontakte und Unterstützung bei Substanzproblemen. Neutral, vertraulich, wissenschaftlich fundiert.",
};

export default function HilfePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Hero */}
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl text-neutral-900 dark:text-neutral-50">
          Du bist nicht allein.
        </h1>
        <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
          Wenn Substanzkonsum zur Belastung wird, gibt es Unterstützung –
          vertraulich, kostenlos und ohne Vorwürfe. Hilfe zu suchen ist ein
          Zeichen von Stärke.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/hilfe/beratung"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
          >
            <HeartHandshake className="h-4 w-4" />
            Jetzt Hilfe finden
          </Link>
          <Link
            href="/hilfe/notfall"
            className="inline-flex items-center gap-2 rounded-lg border border-red-500 px-6 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Phone className="h-4 w-4" />
            Notfall kontaktieren
          </Link>
        </div>
      </section>

      {/* When is help useful? */}
      <section className="mb-12 rounded-xl border border-neutral-200 bg-neutral-50 p-8 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-4 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Wann ist Hilfe sinnvoll?
        </h2>
        <p className="mb-6 text-neutral-600 dark:text-neutral-400">
          Es gibt kein &bdquo;zu früh&ldquo; für Unterstützung. Jede dieser Situationen
          rechtfertigt, sich Hilfe zu holen:
        </p>
        <ul className="space-y-3">
          {[
            "Du hast das Gefühl, die Kontrolle über deinen Konsum verloren zu haben",
            "Du konsumierst täglich oder fast täglich",
            "Du erlebst körperliche oder psychische Entzugssymptome",
            "Der Konsum belastet deine psychische Gesundheit",
            "Du machst dir Sorgen, dass die Situation eskalieren könnte",
            "Arbeit, Studium oder Beziehungen leiden unter dem Konsum",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-neutral-700 dark:text-neutral-300">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-500" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* Emergency contacts */}
      <section
        className="mb-12 rounded-xl border-2 border-red-500 bg-red-50 p-8 dark:bg-red-950/20"
        aria-label="Sofortiger Notfallkontakt"
      >
        <h2 className="mb-4 text-2xl font-semibold text-red-700 dark:text-red-400">
          🚨 Sofort Hilfe
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 font-semibold text-neutral-900 dark:text-neutral-50">
              Medizinischer Notfall
            </h3>
            <a
              href="tel:112"
              className="flex items-center gap-2 text-2xl font-bold text-red-600 hover:underline dark:text-red-400"
              aria-label="Notruf 112 anrufen"
            >
              <Phone className="h-6 w-6" />
              112
            </a>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Europäischer Notruf – kostenlos, 24/7
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-neutral-900 dark:text-neutral-50">
              TelefonSeelsorge
            </h3>
            <a
              href="tel:08001110111"
              className="flex items-center gap-2 text-lg font-semibold text-red-600 hover:underline dark:text-red-400"
              aria-label="TelefonSeelsorge 0800 111 0 111 anrufen"
            >
              <Phone className="h-5 w-5" />
              0800 111 0 111
            </a>
            <a
              href="tel:08001110222"
              className="flex items-center gap-2 text-lg font-semibold text-red-600 hover:underline dark:text-red-400"
              aria-label="TelefonSeelsorge 0800 111 0 222 anrufen"
            >
              <Phone className="h-5 w-5" />
              0800 111 0 222
            </a>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Kostenlos, anonym, 24/7 –{" "}
              <a
                href="https://www.telefonseelsorge.de"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-neutral-900 dark:hover:text-neutral-200"
              >
                telefonseelsorge.de
              </a>
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-neutral-900 dark:text-neutral-50">
              Sucht &amp; Drogen Hotline (BZgA)
            </h3>
            <a
              href="tel:01806313031"
              className="flex items-center gap-2 text-lg font-semibold text-red-600 hover:underline dark:text-red-400"
              aria-label="BZgA Suchthotline anrufen"
            >
              <Phone className="h-5 w-5" />
              0180 6 31 30 31
            </a>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Bundeszentrale für gesundheitliche Aufklärung, Mo–Do 10–22 Uhr,
              Fr–So 10–18 Uhr
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-neutral-900 dark:text-neutral-50">
              Deutsche Hauptstelle für Suchtfragen (DHS)
            </h3>
            <a
              href="https://www.dhs.de"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cyan-600 underline hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-200"
            >
              www.dhs.de
            </a>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Umfangreiches Infomaterial &amp; Beratungsstellenfinder
            </p>
          </div>
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/hilfe/notfall"
            className="text-sm text-red-600 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
          >
            Alle Notfallkontakte anzeigen →
          </Link>
        </div>
      </section>

      {/* Sub-page cards */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Weitere Angebote
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <Link
            href="/hilfe/beratung"
            className="group rounded-xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
          >
            <HeartHandshake className="mb-3 h-8 w-8 text-cyan-500" aria-hidden="true" />
            <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Beratungsstellen finden
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Suche lokale Beratungseinrichtungen nach Stadt und Typ – ambulant
              oder stationär.
            </p>
          </Link>
          <Link
            href="/hilfe/selbsttest"
            className="group rounded-xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
          >
            <ClipboardList className="mb-3 h-8 w-8 text-cyan-500" aria-hidden="true" />
            <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              Selbstreflexions-Test
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Anonymer, nicht-diagnostischer Fragebogen zur persönlichen
              Einschätzung des eigenen Konsums.
            </p>
          </Link>
        </div>
      </section>

      {/* Disclaimer */}
      <div className="mt-10 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          <strong>Hinweis:</strong> Synapedia ersetzt keine ärztliche oder
          therapeutische Beratung. Die hier genannten Informationen dienen der
          Orientierung. Bei akuter Gefahr bitte sofort{" "}
          <a href="tel:112" className="font-semibold underline">
            112
          </a>{" "}
          anrufen.
        </p>
      </div>
    </div>
  );
}
