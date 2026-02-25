import type { Metadata } from "next";
import { SaferUseChat } from "@/components/safer-use-chat";
import { Shield, Phone } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Safer-Use Companion – Risikoeinschätzung | Synapedia",
  description:
    "Empathischer Harm-Reduction-Assistent: Risikoeinschätzung, Interaktionswarnungen und Schadensminimierung bei aktuellem Substanzkonsum.",
};

export default function SaferUsePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Hero */}
      <section className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/40">
          <Shield className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-neutral-900 dark:text-neutral-50">
          Safer-Use Companion
        </h1>
        <p className="mt-3 text-base text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
          Empathische Risikoeinschätzung und Harm-Reduction – keine Urteile,
          keine Dosierungsfreigaben, keine Konsumanleitungen.
        </p>
      </section>

      {/* Emergency quick-link */}
      <div className="mb-8 flex justify-center">
        <Link
          href="/hilfe/notfall"
          className="inline-flex items-center gap-2 rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <Phone className="h-4 w-4" />
          Notfallkontakte anzeigen
        </Link>
      </div>

      {/* Chat */}
      <SaferUseChat />
    </div>
  );
}
