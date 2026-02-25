"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight } from "lucide-react";

type Question = {
  id: string;
  text: string;
  options: { label: string; value: number }[];
};

const questions: Question[] = [
  {
    id: "frequency",
    text: "Wie oft konsumierst du psychoaktive Substanzen?",
    options: [
      { label: "Selten oder nie", value: 0 },
      { label: "Gelegentlich (1–2x pro Monat)", value: 1 },
      { label: "Regelmäßig (wöchentlich)", value: 2 },
      { label: "Täglich oder fast täglich", value: 3 },
    ],
  },
  {
    id: "control",
    text: "Versuchst du, deinen Konsum zu reduzieren oder zu stoppen?",
    options: [
      { label: "Nein, das ist kein Thema für mich", value: 0 },
      { label: "Manchmal denke ich darüber nach", value: 1 },
      { label: "Ja, aber es fällt mir schwer", value: 2 },
      { label: "Ich versuche es, schaffe es aber nicht", value: 3 },
    ],
  },
  {
    id: "withdrawal",
    text: "Erlebst du körperliche oder psychische Beschwerden, wenn du nicht konsumierst?",
    options: [
      { label: "Nein", value: 0 },
      { label: "Leichte Unruhe oder Schlafprobleme", value: 1 },
      { label: "Deutliche körperliche Symptome", value: 2 },
      { label: "Starke Beschwerden, die mich stark belasten", value: 3 },
    ],
  },
  {
    id: "impact",
    text: "Beeinträchtigt der Konsum dein Alltagsleben (Arbeit, Studium, Beziehungen)?",
    options: [
      { label: "Nein, gar nicht", value: 0 },
      { label: "Manchmal geringfügig", value: 1 },
      { label: "Merklich, aber ich komme zurecht", value: 2 },
      { label: "Stark, ich habe bereits Probleme", value: 3 },
    ],
  },
];

type RiskLevel = "low" | "moderate" | "high";

function getRiskLevel(score: number): RiskLevel {
  if (score <= 3) return "low";
  if (score <= 7) return "moderate";
  return "high";
}

const resultConfig = {
  low: {
    label: "Geringes Risiko",
    color: "text-green-700 dark:text-green-400",
    border: "border-green-400",
    bg: "bg-green-50 dark:bg-green-950/20",
    message:
      "Deine Antworten deuten auf ein geringes Risikomuster hin. Bleib aufmerksam gegenüber Veränderungen in deinem Konsummuster.",
    suggestion: null,
  },
  moderate: {
    label: "Mittleres Risiko",
    color: "text-amber-700 dark:text-amber-400",
    border: "border-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    message:
      "Deine Antworten zeigen einige Warnsignale. Es könnte hilfreich sein, mit einer Fachkraft zu sprechen – auch präventiv.",
    suggestion: "Beratungsstelle finden",
  },
  high: {
    label: "Erhöhtes Risiko",
    color: "text-red-700 dark:text-red-400",
    border: "border-red-500",
    bg: "bg-red-50 dark:bg-red-950/20",
    message:
      "Deine Antworten deuten auf ein erhöhtes Belastungsmuster hin. Eine professionelle Beratung kann dir konkrete Unterstützung bieten.",
    suggestion: "Jetzt Beratungsstelle finden",
  },
};

export default function SelbsttestPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = questions.every((q) => answers[q.id] !== undefined);
  const totalScore = Object.values(answers).reduce((sum, v) => sum + v, 0);
  const riskLevel = getRiskLevel(totalScore);
  const result = resultConfig[riskLevel];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Link
        href="/hilfe"
        className="mb-6 inline-flex text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        aria-label="Zurück zur Hilfe-Übersicht"
      >
        ← Zurück zur Hilfe-Übersicht
      </Link>

      <h1 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl text-neutral-900 dark:text-neutral-50">
        Selbstreflexions-Test
      </h1>
      <p className="mb-2 text-neutral-600 dark:text-neutral-400">
        Dieser anonyme Fragebogen hilft dir, deinen Konsum besser einzuschätzen.
        Es werden keine Daten gespeichert oder übertragen.
      </p>
      <p className="mb-8 text-xs text-neutral-500 dark:text-neutral-500">
        ⚠️ Dies ist kein medizinisches Diagnoseinstrument und ersetzt keine
        professionelle Beratung.
      </p>

      {submitted ? (
        /* Result */
        <div
          className={`rounded-xl border-2 p-8 ${result.border} ${result.bg}`}
          role="region"
          aria-live="polite"
          aria-label="Testergebnis"
        >
          <p className="mb-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Dein Ergebnis
          </p>
          <h2 className={`mb-4 text-2xl font-bold ${result.color}`}>
            {result.label}
          </h2>
          <p className="mb-6 text-neutral-700 dark:text-neutral-300">
            {result.message}
          </p>
          <div className="flex flex-wrap gap-3">
            {result.suggestion && (
              <Link
                href="/hilfe/beratung"
                className="flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
              >
                {result.suggestion}
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              href="/hilfe/notfall"
              className="flex items-center gap-2 rounded-lg border border-red-400 px-5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              Notfallkontakte
            </Link>
            <button
              onClick={handleReset}
              className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              Nochmal durchführen
            </button>
          </div>
        </div>
      ) : (
        /* Questions form */
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-8">
            {questions.map((question, idx) => (
              <fieldset
                key={question.id}
                className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <legend className="mb-4 font-medium text-neutral-900 dark:text-neutral-50">
                  <span className="mr-2 text-neutral-400 dark:text-neutral-500">
                    {idx + 1}.
                  </span>
                  {question.text}
                </legend>
                <div className="space-y-3">
                  {question.options.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <input
                        type="radio"
                        name={question.id}
                        value={option.value}
                        checked={answers[question.id] === option.value}
                        onChange={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [question.id]: option.value,
                          }))
                        }
                        className="h-4 w-4 accent-cyan-600"
                        aria-label={option.label}
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              {Object.keys(answers).length} / {questions.length} Fragen
              beantwortet
            </p>
            <button
              type="submit"
              disabled={!allAnswered}
              className="flex items-center gap-2 rounded-lg bg-cyan-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
              aria-disabled={!allAnswered}
            >
              Auswertung anzeigen
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      <div className="mt-10 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          <strong>Wichtig:</strong> Dieser Test dient ausschließlich der
          persönlichen Reflexion und stellt keine medizinische Diagnose dar.
          Alle Antworten bleiben vollständig anonym – es werden keine Daten
          gespeichert.
        </p>
      </div>
    </div>
  );
}
