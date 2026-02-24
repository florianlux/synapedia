import { NeuroAdmin } from "@/components/neuro-map/neuro-admin";
import { substances as substancesData } from "@/../data/substances";
import interactionsData from "@/../data/interactions.json";

export const metadata = {
  title: "NeuroMap Admin – Synapedia",
  description: "Verwaltung von neuronalen Verbindungen, Risikoleveln und Rezeptorprofilen.",
};

export default function NeuroAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          NeuroMap Admin
        </h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          Verbindungen erstellen, Risikolevel setzen und Rezeptorprofile bearbeiten.
        </p>
      </div>
      <NeuroAdmin substances={substancesData} interactions={interactionsData} />
    </div>
  );
}
