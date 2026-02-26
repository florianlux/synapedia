"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ExternalLink, MapPin, Building2 } from "lucide-react";
import centersData from "@/../data/counseling_centers.json";

type CounselingCenter = {
  name: string;
  city: string;
  type: "ambulant" | "stationär";
  website: string;
  phone: string;
};

const centers: CounselingCenter[] = centersData as CounselingCenter[];

export default function BeratungPage() {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  const cities = Array.from(new Set(centers.map((c) => c.city))).sort();

  const filtered = centers.filter((c) => {
    const matchesSearch =
      search.trim() === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase());
    const matchesCity = cityFilter === "" || c.city === cityFilter;
    return matchesSearch && matchesCity;
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link
        href="/hilfe"
        className="mb-6 inline-flex text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
        aria-label="Zurück zur Hilfe-Übersicht"
      >
        ← Zurück zur Hilfe-Übersicht
      </Link>

      <h1 className="mb-2 text-3xl font-bold tracking-tight sm:text-4xl text-neutral-900 dark:text-neutral-50">
        Beratungsstellen finden
      </h1>
      <p className="mb-8 text-neutral-600 dark:text-neutral-400">
        Suche nach lokalen Sucht- und Drogenberatungsstellen in deiner Nähe.
        Alle Beratungsangebote sind vertraulich und häufig kostenlos.
      </p>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Name oder Stadt suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-4 text-sm text-neutral-900 placeholder-neutral-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:placeholder-neutral-500"
            aria-label="Beratungsstellen durchsuchen"
          />
        </div>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          aria-label="Nach Stadt filtern"
        >
          <option value="">Alle Städte</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
        {filtered.length} Beratungsstelle{filtered.length !== 1 ? "n" : ""}{" "}
        gefunden
      </p>

      {/* Centers list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-neutral-500 dark:text-neutral-400">
            Keine Beratungsstellen für diese Suche gefunden.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setCityFilter("");
            }}
            className="mt-3 text-sm text-cyan-600 underline hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-200"
          >
            Filter zurücksetzen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((center) => (
            <div
              key={`${center.name}-${center.city}`}
              className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                    {center.name}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {center.city}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          center.type === "ambulant"
                            ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                        }`}
                      >
                        {center.type}
                      </span>
                    </span>
                    {center.phone && (
                      <a
                        href={`tel:${center.phone.replace(/\s/g, "")}`}
                        className="hover:text-neutral-900 hover:underline dark:hover:text-neutral-200"
                        aria-label={`${center.name} anrufen: ${center.phone}`}
                      >
                        📞 {center.phone}
                      </a>
                    )}
                  </div>
                </div>
                <a
                  href={center.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1 text-sm text-cyan-600 underline hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-200 sm:mt-0"
                  aria-label={`${center.name} Website öffnen (öffnet in neuem Tab)`}
                >
                  Website
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
        <strong className="text-neutral-700 dark:text-neutral-300">
          Weitere Beratungsstellen:
        </strong>{" "}
        Den offiziellen bundesweiten Beratungsstellenfinder findest du auf{" "}
        <a
          href="https://www.dhs.de/service/suchthilfeverzeichnis"
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-600 underline hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-200"
        >
          dhs.de
          <ExternalLink className="ml-0.5 inline h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
