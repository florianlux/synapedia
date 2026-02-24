import { substances as substancesData } from "@/../data/substances";
import interactionsData from "@/../data/interactions.json";
import { InteractionChecker } from "@/components/interaction-checker";

export const metadata = {
  title: "Interaktions-Checker – Synapedia",
  description:
    "Prüfe mögliche Wechselwirkungen zwischen psychoaktiven Substanzen.",
};

export default function InteractionsPage() {
  return (
    <InteractionChecker
      substances={substancesData}
      interactions={interactionsData}
    />
  );
}
