"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/select";
import { Plus, Trash2, Save, Link2, ShieldAlert, Activity } from "lucide-react";
import type { SubstanceRaw, InteractionRaw, LinkType } from "./neuro-types";
import { CLASS_COLORS, DEFAULT_NODE_COLOR, RECEPTOR_COLORS } from "./neuro-types";

/* ---- local neural link type ---- */
interface NeuralLink {
  id: string;
  sourceId: string;
  targetId: string;
  linkType: LinkType;
}

/* ---- component props ---- */
interface NeuroAdminProps {
  substances: SubstanceRaw[];
  interactions: InteractionRaw[];
}

export function NeuroAdmin({ substances, interactions }: NeuroAdminProps) {
  const [activeTab, setActiveTab] = useState<"links" | "risk" | "receptors">("links");

  /* ---- Neural Links state ---- */
  const [neuralLinks, setNeuralLinks] = useState<NeuralLink[]>([]);
  const [newLinkSource, setNewLinkSource] = useState("");
  const [newLinkTarget, setNewLinkTarget] = useState("");
  const [newLinkType, setNewLinkType] = useState<LinkType>("receptor");

  const addLink = () => {
    if (!newLinkSource || !newLinkTarget || newLinkSource === newLinkTarget) return;
    setNeuralLinks((prev) => [
      ...prev,
      {
        id: `nl-${Date.now()}`,
        sourceId: newLinkSource,
        targetId: newLinkTarget,
        linkType: newLinkType,
      },
    ]);
    setNewLinkSource("");
    setNewLinkTarget("");
  };

  const removeLink = (id: string) => {
    setNeuralLinks((prev) => prev.filter((l) => l.id !== id));
  };

  /* ---- Risk Levels state ---- */
  const [riskEdits, setRiskEdits] = useState<Record<string, string>>({});
  const setRisk = (id: string, level: string) => {
    setRiskEdits((prev) => ({ ...prev, [id]: level }));
  };

  /* ---- Receptor edits state ---- */
  const [receptorEdits, setReceptorEdits] = useState<Record<string, string>>({});
  const setReceptorEdit = (id: string, value: string) => {
    setReceptorEdits((prev) => ({ ...prev, [id]: value }));
  };

  const getName = (id: string) =>
    substances.find((s) => s.id === id)?.title ?? id;

  const tabs = [
    { key: "links" as const, label: "Verbindungen", icon: Link2 },
    { key: "risk" as const, label: "Risikolevel", icon: ShieldAlert },
    { key: "receptors" as const, label: "Rezeptorprofile", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      {/* tab navigation */}
      <div className="flex gap-2 border-b border-neutral-200 pb-2 dark:border-neutral-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-cyan-500 text-cyan-500"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ======== Links Tab ======== */}
      {activeTab === "links" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Neue Verbindung erstellen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-4">
                <NativeSelect value={newLinkSource} onValueChange={setNewLinkSource}>
                  <option value="" disabled>Quelle</option>
                  {substances.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </NativeSelect>

                <NativeSelect value={newLinkTarget} onValueChange={setNewLinkTarget}>
                  <option value="" disabled>Ziel</option>
                  {substances.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </NativeSelect>

                <NativeSelect
                  value={newLinkType}
                  onValueChange={(v) => setNewLinkType(v as LinkType)}
                >
                  <option value="class">Stoffgruppe</option>
                  <option value="receptor">Rezeptor</option>
                  <option value="interaction">Interaktion</option>
                  <option value="structure">Struktur</option>
                </NativeSelect>

                <Button onClick={addLink} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Hinzufügen
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* existing links list */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Manuelle Verbindungen ({neuralLinks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {neuralLinks.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Noch keine manuellen Verbindungen erstellt.
                </p>
              ) : (
                <div className="space-y-2">
                  {neuralLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <Badge
                          style={{
                            backgroundColor:
                              CLASS_COLORS[
                                substances.find((s) => s.id === link.sourceId)
                                  ?.class_primary ?? ""
                              ] ?? DEFAULT_NODE_COLOR,
                            color: "#000",
                          }}
                        >
                          {getName(link.sourceId)}
                        </Badge>
                        <span className="text-neutral-500">→</span>
                        <Badge
                          style={{
                            backgroundColor:
                              CLASS_COLORS[
                                substances.find((s) => s.id === link.targetId)
                                  ?.class_primary ?? ""
                              ] ?? DEFAULT_NODE_COLOR,
                            color: "#000",
                          }}
                        >
                          {getName(link.targetId)}
                        </Badge>
                        <Badge variant="outline">{link.linkType}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLink(link.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* known interactions (read-only) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Bekannte Interaktionen ({interactions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {interactions.map((ix, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-neutral-300">{getName(ix.a)}</span>
                      <span className="text-neutral-500">↔</span>
                      <span className="text-neutral-300">{getName(ix.b)}</span>
                    </div>
                    <Badge
                      variant={ix.risk === "high" ? "destructive" : "default"}
                    >
                      {ix.risk}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======== Risk Levels Tab ======== */}
      {activeTab === "risk" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risikolevel bearbeiten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {substances.map((s) => {
                const current = riskEdits[s.id] ?? s.risk_level;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            CLASS_COLORS[s.class_primary] ?? DEFAULT_NODE_COLOR,
                        }}
                      />
                      <span className="text-sm font-medium text-neutral-200">
                        {s.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <NativeSelect
                        value={current}
                        onValueChange={(v) => setRisk(s.id, v)}
                        className="h-8 w-32"
                      >
                        <option value="low">low</option>
                        <option value="moderate">moderate</option>
                        <option value="high">high</option>
                      </NativeSelect>
                      {riskEdits[s.id] && riskEdits[s.id] !== s.risk_level && (
                        <Badge variant="secondary" className="text-[10px]">
                          geändert
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <Button className="gap-1" disabled>
                <Save className="h-4 w-4" />
                Änderungen speichern (Supabase)
              </Button>
              <p className="mt-1 text-xs text-neutral-500">
                Speichern erfordert Supabase-Verbindung.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ======== Receptor Profiles Tab ======== */}
      {activeTab === "receptors" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rezeptorprofile bearbeiten</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {substances.map((s) => {
                const editValue =
                  receptorEdits[s.id] ?? s.receptors.join(", ");
                return (
                  <div
                    key={s.id}
                    className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            CLASS_COLORS[s.class_primary] ?? DEFAULT_NODE_COLOR,
                        }}
                      />
                      <span className="text-sm font-medium text-neutral-200">
                        {s.title}
                      </span>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1">
                      {s.receptors.map((r) => (
                        <Badge
                          key={r}
                          variant="outline"
                          style={{
                            borderColor: RECEPTOR_COLORS[r] ?? "#555",
                            color: RECEPTOR_COLORS[r] ?? "#aaa",
                          }}
                        >
                          {r}
                        </Badge>
                      ))}
                    </div>
                    <Input
                      value={editValue}
                      onChange={(e) =>
                        setReceptorEdit(s.id, e.target.value)
                      }
                      placeholder="Rezeptoren (kommagetrennt)"
                      className="h-8 text-xs"
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <Button className="gap-1" disabled>
                <Save className="h-4 w-4" />
                Änderungen speichern (Supabase)
              </Button>
              <p className="mt-1 text-xs text-neutral-500">
                Speichern erfordert Supabase-Verbindung.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
