"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Download,
  FileText,
  Eye,
  Send,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Database,
  FlaskConical,
  Shield,
  BookOpen,
  Play,
  XCircle,
  ExternalLink,
  RefreshCw,
  ListChecks,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface WikidataResult {
  wikidataId: string;
  label: string;
  description: string;
  aliases: string[];
  cas?: string;
  inchi?: string;
  inchiKey?: string;
  smiles?: string;
  pubchemCid?: string;
  classLabels: string[];
  sourceUrl: string;
  retrievedAt: string;
}

interface PubChemResult {
  cid: number;
  iupacName: string;
  molecularFormula: string;
  molecularWeight: string;
  isomericSmiles: string;
  canonicalSmiles: string;
  inchi: string;
  inchiKey: string;
  synonyms: string[];
  description: string;
  pharmacology: string;
  sourceUrl: string;
  retrievedAt: string;
}

interface Citation {
  source: string;
  url: string;
  license: string;
  retrievedAt: string;
}

interface BatchJob {
  id: string;
  type: string;
  status: string;
  created_at: string;
  payload?: Record<string, unknown>;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

export default function ContentCreatorPage() {
  // Substance picker
  const [substanceName, setSubstanceName] = useState("");
  const [slug, setSlug] = useState("");

  // Data pull state
  const [pulling, setPulling] = useState(false);
  const [wikidata, setWikidata] = useState<WikidataResult | null>(null);
  const [pubchem, setPubchem] = useState<PubChemResult | null>(null);
  const [pullErrors, setPullErrors] = useState<string[]>([]);

  // Draft generation
  const [generating, setGenerating] = useState(false);
  const [contentMdx, setContentMdx] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [blockedReasons, setBlockedReasons] = useState<string[]>([]);

  // Publish
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    articleId?: string;
    slug?: string;
    status?: string;
    articleUrl?: string;
    checklistErrors?: string[];
    error?: string;
  } | null>(null);

  // Batch
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchSubstances, setBatchSubstances] = useState("");
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([]);
  const [batchProgress, setBatchProgress] = useState({ total: 0, done: 0, failed: 0 });

  // Audit / log
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString("de-DE")}] ${msg}`, ...prev].slice(0, 100));
  }, []);

  const slugify = (name: string) =>
    name
      .toLowerCase()
      .replace(/[äÄ]/g, "ae")
      .replace(/[öÖ]/g, "oe")
      .replace(/[üÜ]/g, "ue")
      .replace(/[ß]/g, "ss")
      .replace(/\s*\(.*?\)\s*/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  /* ---------- Data Pull ---------- */
  const handlePull = async () => {
    if (!substanceName.trim()) return;
    setPulling(true);
    setPullErrors([]);
    setWikidata(null);
    setPubchem(null);
    addLog(`Starte Daten-Pull für "${substanceName}"…`);

    const currentSlug = slug || slugify(substanceName);
    setSlug(currentSlug);

    try {
      const res = await fetch("/api/admin/content-creator/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: substanceName }),
      });
      const data = await res.json();

      if (data.wikidata) {
        setWikidata(data.wikidata);
        addLog(`✓ Wikidata: ${data.wikidata.wikidataId} — ${data.wikidata.label}`);
      } else {
        addLog("⚠ Wikidata: keine Daten gefunden");
      }

      if (data.pubchem) {
        setPubchem(data.pubchem);
        addLog(`✓ PubChem: CID ${data.pubchem.cid} — ${data.pubchem.iupacName}`);
      } else {
        addLog("⚠ PubChem: keine Daten gefunden");
      }

      if (data.errors?.length) {
        setPullErrors(data.errors);
        data.errors.forEach((e: string) => addLog(`✗ ${e}`));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      setPullErrors([msg]);
      addLog(`✗ Pull fehlgeschlagen: ${msg}`);
    } finally {
      setPulling(false);
    }
  };

  /* ---------- Generate Draft ---------- */
  const handleGenerate = async () => {
    setGenerating(true);
    setBlocked(false);
    setBlockedReasons([]);
    addLog("Generiere Artikel-Draft…");

    try {
      const res = await fetch("/api/admin/content-creator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          substanceName,
          slug: slug || slugify(substanceName),
          wikidata,
          pubchem,
        }),
      });
      const data = await res.json();

      setContentMdx(data.contentMdx || "");
      setCitations(data.citations || []);
      setBlocked(data.blocked || false);
      setBlockedReasons(data.blockedReasons || []);

      if (data.blocked) {
        addLog(`⚠ Draft generiert aber BLOCKIERT: ${data.blockedReasons?.join(", ")}`);
      } else {
        addLog(`✓ Draft generiert (${data.citations?.length ?? 0} Quellen)`);
      }
    } catch (err) {
      addLog(`✗ Generierung fehlgeschlagen: ${err instanceof Error ? err.message : "Fehler"}`);
    } finally {
      setGenerating(false);
    }
  };

  /* ---------- Publish ---------- */
  const handlePublish = async (publish: boolean) => {
    setPublishing(true);
    setPublishResult(null);
    addLog(publish ? "Publiziere Artikel…" : "Übernehme als Draft…");

    try {
      const res = await fetch("/api/admin/content-creator/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          substanceName,
          slug: slug || slugify(substanceName),
          contentMdx,
          citations,
          publish,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setPublishResult(data);
        addLog(`✓ Artikel ${publish ? "publiziert" : "als Draft gespeichert"}: ${data.articleUrl}`);
      } else {
        setPublishResult({ error: data.error, checklistErrors: data.checklistErrors });
        addLog(`✗ ${data.error}`);
      }
    } catch (err) {
      addLog(`✗ Publish fehlgeschlagen: ${err instanceof Error ? err.message : "Fehler"}`);
    } finally {
      setPublishing(false);
    }
  };

  /* ---------- Batch ---------- */
  const handleBatch = async () => {
    const names = batchSubstances
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);

    if (names.length === 0) return;

    setBatchRunning(true);
    setBatchJobs([]);
    setBatchProgress({ total: names.length, done: 0, failed: 0 });
    addLog(`Starte Batch für ${names.length} Substanzen…`);

    let done = 0;
    let failed = 0;

    for (const name of names) {
      try {
        // Pull data
        const pullRes = await fetch("/api/admin/content-creator/pull", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const pullData = await pullRes.json();

        // Generate
        const genRes = await fetch("/api/admin/content-creator/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            substanceName: name,
            slug: slugify(name),
            wikidata: pullData.wikidata,
            pubchem: pullData.pubchem,
          }),
        });
        const genData = await genRes.json();

        if (genData.blocked) {
          failed++;
          setBatchJobs((prev) => [...prev, {
            id: crypto.randomUUID(),
            type: "generate",
            status: "blocked",
            created_at: new Date().toISOString(),
            error: genData.blockedReasons?.join(", "),
          }]);
          addLog(`⚠ ${name}: blockiert`);
        } else {
          // Map to article (draft)
          const pubRes = await fetch("/api/admin/content-creator/publish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              substanceName: name,
              slug: slugify(name),
              contentMdx: genData.contentMdx,
              citations: genData.citations,
              publish: false,
            }),
          });
          const pubData = await pubRes.json();

          if (pubRes.ok) {
            done++;
            setBatchJobs((prev) => [...prev, {
              id: pubData.articleId || crypto.randomUUID(),
              type: "map_to_article",
              status: "succeeded",
              created_at: new Date().toISOString(),
            }]);
            addLog(`✓ ${name}: Draft erstellt`);
          } else {
            failed++;
            setBatchJobs((prev) => [...prev, {
              id: crypto.randomUUID(),
              type: "map_to_article",
              status: "failed",
              created_at: new Date().toISOString(),
              error: pubData.error,
            }]);
            addLog(`✗ ${name}: ${pubData.error}`);
          }
        }
      } catch (err) {
        failed++;
        addLog(`✗ ${name}: ${err instanceof Error ? err.message : "Fehler"}`);
      }

      setBatchProgress({ total: names.length, done, failed });
    }

    addLog(`Batch abgeschlossen: ${done} erfolgreich, ${failed} fehlgeschlagen`);
    setBatchRunning(false);
  };

  /* ---------- Publish checklist ---------- */
  const checklistItems = [
    { label: "Disclaimer vorhanden", ok: contentMdx.includes("Hinweis:") || contentMdx.includes("Disclaimer") },
    { label: "Mindestens 2 Quellen", ok: citations.length >= 2 },
    { label: "Keine blockierten Inhalte", ok: !blocked },
  ];
  const checklistPassed = checklistItems.every((c) => c.ok);

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Content Creator
        </h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          Substanzen recherchieren, Artikel generieren, prüfen und publizieren.
        </p>
      </div>

      <Tabs defaultValue="single">
        <TabsList>
          <TabsTrigger value="single">
            <FlaskConical className="mr-2 h-4 w-4" />
            Einzelne Substanz
          </TabsTrigger>
          <TabsTrigger value="batch">
            <ListChecks className="mr-2 h-4 w-4" />
            Batch-Modus
          </TabsTrigger>
          <TabsTrigger value="log">
            <BookOpen className="mr-2 h-4 w-4" />
            Aktivitätslog
          </TabsTrigger>
        </TabsList>

        {/* ===================== SINGLE SUBSTANCE TAB ===================== */}
        <TabsContent value="single">
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* Left Column: Substance Picker + Data Pull */}
            <div className="space-y-6">
              {/* Substance Picker */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-violet-500" />
                    Substanz auswählen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Substanzname
                    </label>
                    <Input
                      placeholder="z.B. Psilocybin, MDMA, Ketamin…"
                      value={substanceName}
                      onChange={(e) => {
                        setSubstanceName(e.target.value);
                        setSlug(slugify(e.target.value));
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Slug
                    </label>
                    <Input
                      placeholder="auto-generiert"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <Button
                    onClick={handlePull}
                    disabled={pulling || !substanceName.trim()}
                    className="w-full"
                  >
                    {pulling ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Daten abrufen (Wikidata + PubChem)
                  </Button>
                </CardContent>
              </Card>

              {/* Data Pull Results */}
              {(wikidata || pubchem || pullErrors.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5 text-blue-500" />
                      Abgerufene Daten
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pullErrors.length > 0 && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                        {pullErrors.map((e, i) => (
                          <div key={i}>⚠ {e}</div>
                        ))}
                      </div>
                    )}

                    {wikidata && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Wikidata</Badge>
                          <span className="text-sm font-mono text-neutral-500">{wikidata.wikidataId}</span>
                        </div>
                        <div className="text-sm text-neutral-600 dark:text-neutral-400">
                          {wikidata.description}
                        </div>
                        {wikidata.cas && (
                          <div className="text-xs text-neutral-500">CAS: {wikidata.cas}</div>
                        )}
                        {wikidata.classLabels.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {wikidata.classLabels.map((c, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {pubchem && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">PubChem</Badge>
                          <span className="text-sm font-mono text-neutral-500">CID {pubchem.cid}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                          <div><strong>Formel:</strong> {pubchem.molecularFormula}</div>
                          <div><strong>Gewicht:</strong> {pubchem.molecularWeight} g/mol</div>
                          <div className="col-span-2"><strong>IUPAC:</strong> {pubchem.iupacName}</div>
                          {pubchem.inchiKey && (
                            <div className="col-span-2 font-mono"><strong>InChIKey:</strong> {pubchem.inchiKey}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Generate Draft */}
              {(wikidata || pubchem) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-amber-500" />
                      Artikel generieren
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="w-full"
                    >
                      {generating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      Draft generieren (Harm-Reduction Template)
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column: Preview + Publish */}
            <div className="space-y-6">
              {/* Content Filter Warnings */}
              {blocked && (
                <Card className="border-red-300 dark:border-red-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <Shield className="h-5 w-5" />
                      Inhalt blockiert
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {blockedReasons.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                          <XCircle className="h-4 w-4 flex-shrink-0" />
                          {r}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-neutral-500">
                      Blockierte Inhalte wurden entfernt. Publish ist gesperrt.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* MDX Preview/Editor */}
              {contentMdx && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-cyan-500" />
                      Artikel-Preview (MDX)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={contentMdx}
                      onChange={(e) => setContentMdx(e.target.value)}
                      rows={20}
                      className="font-mono text-xs leading-relaxed"
                    />
                    {citations.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="text-xs font-semibold text-neutral-500">Quellen ({citations.length}):</div>
                        {citations.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                            <BookOpen className="h-3 w-3 flex-shrink-0" />
                            {c.source} — {c.license}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Publish Checklist & Action */}
              {contentMdx && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5 text-emerald-500" />
                      Publizieren
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Checklist */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Publish-Checklist:</div>
                      {checklistItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          {item.ok ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                          <span className={item.ok ? "text-neutral-700 dark:text-neutral-300" : "text-amber-600 dark:text-amber-400"}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => handlePublish(false)}
                        disabled={publishing || blocked}
                        className="flex-1"
                      >
                        {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                        In Artikel übernehmen (Draft)
                      </Button>
                      <Button
                        onClick={() => handlePublish(true)}
                        disabled={publishing || blocked || !checklistPassed}
                        className="flex-1"
                      >
                        {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Publizieren
                      </Button>
                    </div>

                    {/* Publish Result */}
                    {publishResult && (
                      <div className={`rounded-lg p-3 text-sm ${publishResult.error
                        ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}>
                        {publishResult.error ? (
                          <div>
                            <strong>Fehler:</strong> {publishResult.error}
                            {publishResult.checklistErrors?.map((e, i) => (
                              <div key={i} className="mt-1">• {e}</div>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              Artikel {publishResult.status === "published" ? "publiziert" : "als Draft gespeichert"}!
                            </div>
                            {publishResult.articleUrl && (
                              <a
                                href={publishResult.articleUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1 underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {publishResult.articleUrl}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ===================== BATCH TAB ===================== */}
        <TabsContent value="batch">
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-violet-500" />
                  Batch-Generierung
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Substanznamen (eine pro Zeile)
                  </label>
                  <Textarea
                    placeholder={"Psilocybin\nMDMA\nKetamin\nLSD\nDMT"}
                    value={batchSubstances}
                    onChange={(e) => setBatchSubstances(e.target.value)}
                    rows={10}
                  />
                </div>
                <div className="text-xs text-neutral-500">
                  {batchSubstances.split("\n").filter((n) => n.trim()).length} Substanzen erkannt
                </div>
                <Button
                  onClick={handleBatch}
                  disabled={batchRunning || !batchSubstances.trim()}
                  className="w-full"
                >
                  {batchRunning ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Batch starten (Pull → Generate → Draft)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-cyan-500" />
                  Fortschritt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {batchProgress.total > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Fortschritt</span>
                      <span>{batchProgress.done + batchProgress.failed} / {batchProgress.total}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${((batchProgress.done + batchProgress.failed) / batchProgress.total) * 100}%` }}
                      />
                    </div>
                    <div className="flex gap-4 text-xs text-neutral-500">
                      <span className="text-emerald-600">✓ {batchProgress.done} erfolgreich</span>
                      <span className="text-red-600">✗ {batchProgress.failed} fehlgeschlagen</span>
                    </div>
                  </div>
                )}

                {batchJobs.length > 0 && (
                  <div className="max-h-80 space-y-1 overflow-y-auto">
                    {batchJobs.map((job, i) => (
                      <div key={i} className="flex items-center gap-2 rounded border border-neutral-200 px-2 py-1 text-xs dark:border-neutral-700">
                        {job.status === "succeeded" ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        ) : job.status === "blocked" ? (
                          <Shield className="h-3 w-3 text-amber-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span className="flex-1 truncate">{job.type}</span>
                        <Badge variant="outline" className="text-[10px]">{job.status}</Badge>
                        {job.error && <span className="truncate text-red-500">{job.error}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {batchJobs.length === 0 && !batchRunning && (
                  <div className="py-8 text-center text-sm text-neutral-400">
                    Noch keine Batch-Jobs gestartet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===================== LOG TAB ===================== */}
        <TabsContent value="log">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-neutral-500" />
                Aktivitätslog
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length > 0 ? (
                <div className="max-h-[600px] space-y-1 overflow-y-auto font-mono text-xs">
                  {logs.map((log, i) => (
                    <div key={i} className="rounded px-2 py-1 text-neutral-600 odd:bg-neutral-50 dark:text-neutral-400 dark:odd:bg-neutral-900">
                      {log}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-neutral-400">
                  Noch keine Aktivitäten protokolliert.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
