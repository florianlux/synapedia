"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";
import {
  FileText,
  Eye,
  PenLine,
  Clock,
  Brain,
  Sparkles,
  GitBranch,
  AlertTriangle,
  KeyRound,
  Activity,
  Search,
  Plus,
  FlaskConical,
  Network,
  Shield,
  Globe,
  ArrowRight,
  CheckCircle,
  Wand2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import type { Article } from "@/lib/types";

interface AdminDashboardClientProps {
  articles: Article[];
  aiEnabled: boolean;
  supabaseConfigured: boolean;
}

export function AdminDashboardClient({
  articles,
  aiEnabled,
  supabaseConfigured,
}: AdminDashboardClientProps) {
  const total = articles.length;
  const published = articles.filter((a) => a.status === "published").length;
  const drafts = articles.filter((a) => a.status === "draft").length;
  const review = articles.filter((a) => a.status === "review").length;

  const complete = articles.filter((a) => a.content_mdx && a.content_mdx.length > 200).length;
  const incomplete = total - complete;

  const stats = [
    { label: "Artikel gesamt", value: total, icon: FileText, color: "text-cyan-500" },
    { label: "Veröffentlicht", value: published, icon: Eye, color: "text-green-500" },
    { label: "Entwürfe", value: drafts, icon: PenLine, color: "text-yellow-500" },
    { label: "In Review", value: review, icon: Clock, color: "text-violet-500" },
  ];

  return (
    <div className="min-h-screen pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* Sticky Header - Mobile */}
      <div className="sticky top-0 z-40 border-b border-neutral-200 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 dark:border-neutral-800 md:relative md:border-0 md:bg-transparent md:backdrop-blur-none">
        <div className="px-4 py-3 md:px-0 md:py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 md:text-3xl">
                  Admin
                </h1>
                <Badge variant="secondary" className="mt-1 w-fit text-[10px]">
                  synapedia.com
                </Badge>
              </div>
            </div>

            {/* Quick Actions - Desktop */}
            <div className="hidden items-center gap-2 md:flex">
              <Link href="/admin/substances">
                <Button size="sm" variant="outline">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Substance
                </Button>
              </Link>
              <Link href="/admin/content-creator">
                <Button size="sm">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  AI Job
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mt-3 md:mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <Input
              type="text"
              placeholder="Suche nach Substanzen, Artikeln, Aktionen..."
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6 px-4 pt-4 md:px-0 md:pt-0">
        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={supabaseConfigured ? "default" : "secondary"}>
            {supabaseConfigured ? "Supabase verbunden" : "Demo-Modus"}
          </Badge>
          <Badge variant={aiEnabled ? "default" : "secondary"}>
            <Sparkles className="mr-1 h-3 w-3" />
            {aiEnabled ? "AI aktiv" : "AI deaktiviert"}
          </Badge>
        </div>

        {/* Stats grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                  {stat.label}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Needs Attention */}
        <Card className="border-muted/60 bg-background/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {incomplete > 0 ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Nächste Aufgaben
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Alle Systeme stabil
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incomplete > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="font-bold text-yellow-500">{incomplete}</span> Artikel brauchen mehr Inhalt
                </p>
                <Link href="/admin/articles">
                  <Button size="sm" variant="outline" className="w-full sm:w-auto">
                    Fehlende Inhalte generieren
                    <ArrowRight className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-500">
                  OK
                </Badge>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Alle Artikel vollständig!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accordion Sections */}
        <Accordion type="single" collapsible defaultValue="content" className="space-y-4">
          {/* Content Section */}
          <AccordionItem value="content" className="rounded-xl border border-neutral-200 bg-background px-4 dark:border-neutral-800">
            <AccordionTrigger className="text-base font-semibold hover:no-underline">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-500" />
                Content
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <ActionCard
                title="Content Coverage Map"
                description="Übersicht aller Artikel nach Kategorie"
                badge="OK"
                href="/admin"
                primaryLabel="Öffnen"
                icon={Brain}
                iconColor="text-violet-500"
              />
              <ActionCard
                title="Substanzen"
                description="Substanzdatenbank verwalten"
                badge={`${total} Einträge`}
                href="/admin/substances"
                primaryLabel="Öffnen"
                icon={FlaskConical}
                iconColor="text-cyan-500"
              />
              <ActionCard
                title="Artikel"
                description="Artikel bearbeiten und erstellen"
                badge={`${published} veröffentlicht`}
                href="/admin/articles"
                primaryLabel="Öffnen"
                icon={FileText}
                iconColor="text-green-500"
              />
            </AccordionContent>
          </AccordionItem>

          {/* AI & Automationen Section */}
          <AccordionItem value="ai" className="rounded-xl border border-neutral-200 bg-background px-4 dark:border-neutral-800">
            <AccordionTrigger className="text-base font-semibold hover:no-underline">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                AI & Automationen
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <ActionCard
                title="Content Creator"
                description="AI-gestützte Inhaltserstellung"
                badge={aiEnabled ? "Bereit" : "AI deaktiviert"}
                href="/admin/content-creator"
                primaryLabel="Starten"
                icon={Wand2}
                iconColor="text-cyan-500"
              />
              <ActionCard
                title="Auto-Generate"
                description="Substanzen automatisch generieren"
                badge="Bereit"
                href="/admin/substances/generate"
                primaryLabel="Starten"
                icon={Sparkles}
                iconColor="text-yellow-500"
              />
              <ActionCard
                title="Import Pipeline"
                description="Substanzdaten importieren"
                badge="Bereit"
                href="/admin/import-substances"
                primaryLabel="Öffnen"
                icon={Upload}
                iconColor="text-blue-500"
              />
            </AccordionContent>
          </AccordionItem>

          {/* Knowledge Graph Section */}
          <AccordionItem value="graph" className="rounded-xl border border-neutral-200 bg-background px-4 dark:border-neutral-800">
            <AccordionTrigger className="text-base font-semibold hover:no-underline">
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5 text-violet-500" />
                Knowledge Graph
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <ActionCard
                title="NeuroMap"
                description="Knowledge Graph Visualisierung"
                badge={`${total} indexiert`}
                href="/admin/neuro"
                primaryLabel="Öffnen"
                icon={Network}
                iconColor="text-violet-500"
              />
              <ActionCard
                title="SEO"
                description="Suchmaschinenoptimierung"
                badge="OK"
                href="/admin/seo"
                primaryLabel="Öffnen"
                icon={Globe}
                iconColor="text-blue-500"
              />
            </AccordionContent>
          </AccordionItem>

          {/* Security Section */}
          <AccordionItem value="security" className="rounded-xl border border-neutral-200 bg-background px-4 dark:border-neutral-800">
            <AccordionTrigger className="text-base font-semibold hover:no-underline">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                Security
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <ActionCard
                title="Secrets Register"
                description="Metadaten-Verwaltung für Secrets und Tokens"
                badge="Sicher"
                href="/admin/secrets"
                primaryLabel="Öffnen"
                icon={KeyRound}
                iconColor="text-cyan-500"
              />
            </AccordionContent>
          </AccordionItem>

          {/* DevOps Section */}
          <AccordionItem value="devops" className="rounded-xl border border-neutral-200 bg-background px-4 dark:border-neutral-800">
            <AccordionTrigger className="text-base font-semibold hover:no-underline">
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-violet-500" />
                DevOps
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <ActionCard
                title="Dev Activity"
                description="GitHub PRs, Commits und Workflows"
                badge="Aktiv"
                href="/admin/dev-activity"
                primaryLabel="Öffnen"
                icon={Activity}
                iconColor="text-violet-500"
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <AdminBottomNav />
    </div>
  );
}

// Action Card Component
interface ActionCardProps {
  title: string;
  description: string;
  badge?: string;
  href: string;
  primaryLabel: string;
  icon: React.ElementType;
  iconColor: string;
}

function ActionCard({
  title,
  description,
  badge,
  href,
  primaryLabel,
  icon: Icon,
  iconColor,
}: ActionCardProps) {
  return (
    <Card className="rounded-xl border-muted/60 bg-background/40">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800">
              <Icon className={`h-4 w-4 ${iconColor}`} />
            </div>
            <div className="flex-1">
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              <CardDescription className="mt-1 text-xs">{description}</CardDescription>
            </div>
          </div>
          {badge && (
            <Badge variant="secondary" className="text-[10px]">
              {badge}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex gap-2 pt-0">
        <Link href={href} className="flex-1">
          <Button size="sm" className="w-full">
            {primaryLabel}
          </Button>
        </Link>
        <Link href={href}>
          <Button size="sm" variant="outline">
            Details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
