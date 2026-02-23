import type { RiskLevel } from "@/lib/types";
import { AlertTriangle, ShieldAlert, ShieldCheck } from "lucide-react";

const riskConfig: Record<
  RiskLevel,
  { className: string; text: string; Icon: typeof ShieldCheck }
> = {
  low: {
    className:
      "border-l-4 border-green-500 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300",
    text: "Niedriges Risikoprofil",
    Icon: ShieldCheck,
  },
  moderate: {
    className:
      "border-l-4 border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
    text: "Moderates Risikoprofil – Besondere Vorsicht geboten",
    Icon: AlertTriangle,
  },
  high: {
    className:
      "border-l-4 border-red-500 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300",
    text: "Hohes Risikoprofil – Erhebliche gesundheitliche Risiken",
    Icon: ShieldAlert,
  },
};

export function RiskBanner({ riskLevel }: { riskLevel: RiskLevel }) {
  const { className, text, Icon } = riskConfig[riskLevel];

  return (
    <div className={`flex items-center gap-3 rounded-r-lg p-4 ${className}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}
