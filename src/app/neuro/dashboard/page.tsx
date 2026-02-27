import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Brain,
  Activity,
  Shield,
  Search,
  MousePointerClick,
  BookOpen,
} from "lucide-react";
import { substances } from "@/../data/substances";
import receptorsData from "@/../data/receptors.json";
import { buildBrainGraph } from "@/lib/neurocodex/brain-graph";
import type { ReceptorInput } from "@/lib/neurocodex/brain-graph";

export const metadata = {
  title: "Neurocodex Dashboard – Persönliche Übersicht",
  description:
    "Dein persönliches Dashboard: Brain-Graph-Statistiken, Substanz-Übersicht und Risiko-Trends.",
};

export default function DashboardPage() {
  const receptors = receptorsData as ReceptorInput[];
  const graph = buildBrainGraph(substances, receptors);

  const substanceNodes = graph.nodes.filter((n) => n.type === "substance");
  const receptorNodes = graph.nodes.filter((n) => n.type === "receptor");
  const effectNodes = graph.nodes.filter((n) => n.type === "effect");
  const riskNodes = graph.nodes.filter((n) => n.type === "risk");

  const highRiskSubstances = substanceNodes.filter(
    (n) => n.meta.risk_level === "high",
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Neurocodex{" "}
        <span className="text-cyan-500">Dashboard</span>
      </h1>
      <p className="mt-2 text-neutral-500 dark:text-neutral-400">
        Dein persönliches Neurocodex-Dashboard mit Brain-Graph-Statistiken und
        Harm-Reduction-Übersicht.
      </p>

      {/* Stats grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Substanzen</CardTitle>
            <Brain className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{substanceNodes.length}</div>
            <CardDescription>Im Brain-Graph erfasst</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rezeptoren</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{receptorNodes.length}</div>
            <CardDescription>Kartierte Zielstrukturen</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Effekte</CardTitle>
            <MousePointerClick className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{effectNodes.length}</div>
            <CardDescription>Abgeleitete Wirkungen</CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Hohes Risiko</CardTitle>
            <Shield className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {highRiskSubstances.length}
            </div>
            <CardDescription>Substanzen mit hohem Risikoprofil</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Brain Graph Overview */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-cyan-500" />
              Brain-Graph-Übersicht
            </CardTitle>
            <CardDescription>
              {graph.nodes.length} Knoten, {graph.edges.length} Verbindungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Substanzen
                </span>
                <span className="font-mono">{substanceNodes.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Rezeptoren
                </span>
                <span className="font-mono">{receptorNodes.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Neurotransmitter
                </span>
                <span className="font-mono">
                  {graph.nodes.filter((n) => n.type === "neurotransmitter").length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Effekte
                </span>
                <span className="font-mono">{effectNodes.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">
                  Risiko-Stufen
                </span>
                <span className="font-mono">{riskNodes.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Harm-Reduction-Hinweise
            </CardTitle>
            <CardDescription>
              Substanzen mit hohem Risikoprofil
            </CardDescription>
          </CardHeader>
          <CardContent>
            {highRiskSubstances.length > 0 ? (
              <ul className="space-y-2">
                {highRiskSubstances.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950"
                  >
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">{s.label}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Hohes Risiko – Bei Fragen medizinische Hilfe in Anspruch
                        nehmen.
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Keine Substanzen mit hohem Risikoprofil im aktuellen Graph.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics placeholder */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-500" />
              Letzte Suchen
            </CardTitle>
            <CardDescription>
              Deine letzten Suchanfragen (wird bei Nutzung befüllt)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Noch keine Suchanfragen gespeichert. Nutze die Suchleiste um
              Substanzen zu finden.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-500" />
              Aktivitäts-Übersicht
            </CardTitle>
            <CardDescription>
              Deine Interaktionen mit der Plattform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Noch keine Aktivitätsdaten vorhanden. Besuche den Brain-Graph
              oder die Interaktions-Prüfung um Daten zu generieren.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Hinweis:</strong> Neurocodex dient ausschließlich der
          wissenschaftlichen Information und Harm Reduction. Keine
          Konsumanleitungen, keine Dosierungsempfehlungen, keine
          Beschaffungshinweise. Bei gesundheitlichen Fragen wende dich an
          medizinisches Fachpersonal.
        </p>
      </div>
    </div>
  );
}
