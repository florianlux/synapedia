import Link from "next/link";
import { LayoutDashboard, FileText, BookOpen, Image, ScrollText, Shield, Boxes, Brain, FlaskConical, Network, Upload, Wand2, Sparkles, KeyRound, Activity, Globe } from "lucide-react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/content-creator", label: "Content Creator", icon: Wand2 },
  { href: "/admin/articles", label: "Artikel", icon: FileText },
  { href: "/admin/substances", label: "Substanzen", icon: FlaskConical },
  { href: "/admin/substances/generate", label: "Auto-Generate", icon: Sparkles },
  { href: "/admin/import-substances", label: "Import-Pipeline", icon: Upload },
  { href: "/admin/seo", label: "SEO", icon: Globe },
  { href: "/admin/neuro", label: "NeuroMap", icon: Network },
  { href: "/admin/templates", label: "Templates", icon: Boxes },
  { href: "/admin/sources", label: "Quellen", icon: BookOpen },
  { href: "/admin/media", label: "Medien", icon: Image },
  { href: "/admin/audit", label: "Audit-Log", icon: ScrollText },
  { href: "/admin/secrets", label: "Secrets Register", icon: KeyRound },
  { href: "/admin/dev-activity", label: "Dev Activity", icon: Activity },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const hasAdminToken = !!process.env.ADMIN_TOKEN;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-64 flex-shrink-0 border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 lg:block">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <Brain className="h-5 w-5 text-violet-500" />
          <span className="font-semibold text-neutral-900 dark:text-neutral-50">Content Studio</span>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        {!hasAdminToken && (
          <div className="mx-4 mt-4 rounded-lg border border-neutral-200 bg-neutral-100 p-3 text-xs text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
            <Shield className="mb-1 inline h-3 w-3" /> Demo-Modus: Auth deaktiviert. Setze ADMIN_TOKEN für Zugangskontrolle.
          </div>
        )}
      </aside>
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
