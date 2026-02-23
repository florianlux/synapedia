export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
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
