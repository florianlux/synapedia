import { getSubstancePharmacology } from "@/lib/db/pharmacology";
import { ReceptorHeatmap } from "@/components/receptor-heatmap";
import { PKPDCurve } from "@/components/pkpd-curve";
import { DoseResponseChart } from "@/components/dose-response-chart";

interface SubstancePharmacologyProps {
  substanceId: string;
  substanceName?: string;
}

export async function SubstancePharmacologySection({
  substanceId,
  substanceName,
}: SubstancePharmacologyProps) {
  const pharmacology = await getSubstancePharmacology(substanceId);

  const hasData =
    pharmacology.targets.length > 0 ||
    pharmacology.pkRoutes.length > 0 ||
    pharmacology.pdParams.length > 0;

  if (!hasData) return null;

  return (
    <section className="mt-10 space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Pharmakologie</h2>

      {pharmacology.targets.length > 0 && (
        <ReceptorHeatmap affinities={pharmacology.targets} />
      )}

      {pharmacology.pkRoutes.length > 0 && (
        <PKPDCurve
          pkRoutes={pharmacology.pkRoutes}
          pdParams={pharmacology.pdParams}
          substanceName={substanceName}
        />
      )}

      {pharmacology.pdParams.length > 0 && (
        <DoseResponseChart pdParams={pharmacology.pdParams} />
      )}
    </section>
  );
}
