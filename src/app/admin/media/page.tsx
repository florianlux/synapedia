import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, ImageIcon } from "lucide-react";

export default function AdminMedia() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Medien</h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          Bilder und Dateien für Artikel verwalten.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datei hochladen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
            <Upload className="mb-4 h-10 w-10 text-neutral-400" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Dateien hierher ziehen oder klicken zum Auswählen
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              PNG, JPG, SVG oder WebP (max. 5 MB)
            </p>
            <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
              In der Demo-Version ist der Upload deaktiviert.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medienbibliothek</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon className="mb-4 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Noch keine Medien vorhanden.
            </p>
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              Hochgeladene Dateien werden hier angezeigt.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
