import { substances as substancesData } from "@/../data/substances";
import { CompareTool } from "@/components/compare-tool";

export const metadata = {
  title: "Substanz-Vergleich – Synapedia",
  description:
    "Vergleiche zwei psychoaktive Substanzen Seite an Seite – Klasse, Mechanismen, Rezeptoren und mehr.",
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;

  return (
    <CompareTool
      substances={substancesData}
      initialA={a}
      initialB={b}
    />
  );
}
