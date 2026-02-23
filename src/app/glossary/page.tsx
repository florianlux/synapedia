import { GlossaryList } from "@/components/glossary-list";
import glossaryData from "@/../data/glossary.json";

export const metadata = {
  title: "Glossar – Synapedia",
  description:
    "Wissenschaftliches Glossar: Fachbegriffe aus Pharmakologie, Neurochemie und verwandten Disziplinen verständlich erklärt.",
};

export default function GlossaryPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Glossar
      </h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">
        Wissenschaftliches Glossar – Fachbegriffe aus Pharmakologie und
        Neurochemie verständlich erklärt.
      </p>

      <div className="mt-8">
        <GlossaryList entries={glossaryData} />
      </div>
    </div>
  );
}
