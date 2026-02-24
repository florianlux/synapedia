import { NeuroMap } from "@/components/neuro-map/neuro-map";
import { substances as substancesData } from "@/../data/substances";
import interactionsData from "@/../data/interactions.json";
import receptorsData from "@/../data/receptors.json";

export const metadata = {
  title: "NeuroMap – The Substance Brain | Synapedia",
  description:
    "Interaktives neuronales Netzwerk, das Substanzen wie ein Gehirn darstellt – mit Rezeptor-Overlays, Gefahrenmodus und Vergleichsfunktion.",
};

export default function NeuroPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        NeuroMap{" "}
        <span className="text-cyan-500">– The Substance Brain</span>
      </h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">
        Interaktives neuronales Netzwerk: Substanzen, Rezeptoren und Interaktionen als
        Force-Directed Graph.
      </p>
      <div className="mt-6">
        <NeuroMap
          substances={substancesData}
          interactions={interactionsData}
          receptors={receptorsData}
        />
      </div>
    </div>
  );
}
