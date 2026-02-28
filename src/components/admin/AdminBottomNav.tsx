"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, FileText, Sparkles, KeyRound } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  {
    href: "/admin",
    label: "Home",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/substances",
    label: "Content",
    icon: FileText,
  },
  {
    href: "/admin/content-creator",
    label: "AI",
    icon: Sparkles,
  },
  {
    href: "/admin/secrets",
    label: "Settings",
    icon: KeyRound,
  },
]

export function AdminBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 dark:border-neutral-800 md:hidden">
      <div className="flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors",
                isActive
                  ? "text-cyan-500"
                  : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "fill-cyan-500/10")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
