"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Unlock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminStatusProps {
  isUnlocked: boolean;
  isDemoMode: boolean;
}

export function AdminStatus({ isUnlocked, isDemoMode }: AdminStatusProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/access");
    router.refresh();
  }

  if (isDemoMode) {
    return null;
  }

  if (isUnlocked) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Unlock className="h-4 w-4 text-green-500" />
        <span className="text-green-600 dark:text-green-400">Admin freigeschaltet</span>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="ml-1 h-7 px-2 text-xs">
          <LogOut className="mr-1 h-3 w-3" />
          Abmelden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Lock className="h-4 w-4 text-red-500" />
      <Link
        href="/admin/access"
        className="text-red-600 underline hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
      >
        Gesperrt
      </Link>
    </div>
  );
}
