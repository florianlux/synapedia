import { BrainExplorer } from "@/components/brain-explorer";
import receptorsData from "@/../data/receptors.json";
import { substances as substancesData } from "@/../data/substances";

export const metadata = {
  title: "Brain Explorer – Synapedia",
  description:
    "Interaktive Karte der wichtigsten Neurorezeptoren und ihrer Verteilung im Gehirn.",
};

export default function BrainPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl font-[family-name:var(--ds-font-heading)]">
        Brain Explorer
      </h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">
        Interaktive Karte der wichtigsten Neurorezeptoren und ihrer Verteilung
        im Gehirn.
      </p>
      <div className="mt-8">
        <BrainExplorer receptors={receptorsData} substances={substancesData} />
      </div>
    </div>
  );
}
