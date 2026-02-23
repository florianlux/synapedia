import { demoSources } from "@/lib/demo-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const allSources = Object.values(demoSources).flat();

export default function AdminSources() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Quellen</h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          Wissenschaftliche Quellen und Referenzen verwalten.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alle Quellen ({allSources.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Titel</th>
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Autoren</th>
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Journal</th>
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Jahr</th>
                  <th className="pb-3 font-medium text-neutral-500 dark:text-neutral-400">DOI</th>
                </tr>
              </thead>
              <tbody>
                {allSources.map((source) => (
                  <tr
                    key={source.id}
                    className="border-b border-neutral-100 dark:border-neutral-800/50"
                  >
                    <td className="max-w-xs py-3 pr-4 font-medium text-neutral-900 dark:text-neutral-50">
                      {source.title}
                    </td>
                    <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-400">
                      {source.authors ?? "–"}
                    </td>
                    <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-400">
                      {source.journal ?? "–"}
                    </td>
                    <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-400">
                      {source.year ?? "–"}
                    </td>
                    <td className="py-3 text-neutral-600 dark:text-neutral-400">
                      {source.doi ? (
                        <a
                          href={`https://doi.org/${source.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-500 hover:underline"
                        >
                          {source.doi}
                        </a>
                      ) : (
                        "–"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
