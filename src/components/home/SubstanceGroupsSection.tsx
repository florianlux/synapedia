import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchGroups } from "@/lib/db/groups";

export async function SubstanceGroupsSection() {
  const groups = await fetchGroups();

  if (groups.length === 0) return null;

  return (
    <section className="mb-12">
      <h2 className="mb-6 text-2xl font-semibold">Substanzgruppen</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {groups.map((group) => (
          <Link key={group.id} href={`/groups/${group.slug}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                {group.icon && (
                  <span className="mb-1 text-2xl" aria-hidden="true">
                    {group.icon}
                  </span>
                )}
                <CardTitle className="text-base">{group.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {group.description && (
                  <CardDescription className="line-clamp-2">
                    {group.description}
                  </CardDescription>
                )}
                {group.substance_count > 0 && (
                  <Badge variant="secondary" className="mt-2">
                    {group.substance_count}{" "}
                    {group.substance_count === 1 ? "Substanz" : "Substanzen"}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
