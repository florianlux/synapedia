import { Search } from "lucide-react";
import { ExperienceSearchForm } from "@/components/admin/experience-search/ExperienceSearchForm";

export default function ExperienceSearchPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Search className="h-6 w-6 text-cyan-500" />
          Experience Search (Safety)
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Generate harm-reduction oriented search queries for substance
          combination experiences across multiple sources.
        </p>
      </div>
      <ExperienceSearchForm />
    </div>
  );
}
