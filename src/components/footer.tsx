export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      {/* Emergency bar */}
      <div className="border-b border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-6 py-2 text-xs text-amber-800 dark:text-amber-300">
          <span>
            ⚠️ Synapedia ersetzt keine ärztliche Beratung. Bei akuter Gefahr bitte{" "}
            <a
              href="tel:112"
              className="font-bold underline hover:text-amber-900 dark:hover:text-amber-200"
              aria-label="Notruf 112 anrufen"
            >
              112
            </a>{" "}
            kontaktieren.
          </span>
          <a
            href="/hilfe"
            className="font-medium underline hover:text-amber-900 dark:hover:text-amber-200"
          >
            Hilfe &amp; Beratung →
          </a>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-4 max-w-2xl text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          <strong className="text-neutral-700 dark:text-neutral-300">Hinweis:</strong>{" "}
          Synapedia dient ausschließlich der wissenschaftlichen Aufklärung. Diese Plattform
          bietet keine Konsumanleitungen, keine Dosierungsempfehlungen und keine
          Beschaffungshinweise. Alle Inhalte sind rein informativ und evidenzbasiert.
        </div>
        <div className="text-xs text-neutral-400 dark:text-neutral-500">
          © {new Date().getFullYear()} Synapedia. Alle Rechte vorbehalten.
        </div>
      </div>
    </footer>
  );
}
