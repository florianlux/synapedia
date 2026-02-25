"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FlaskConical } from "lucide-react";

interface ScienceModePanelProps {
  title?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function ScienceModePanel({
  title = "Wissenschaftsmodus",
  children,
  defaultOpen = false,
}: ScienceModePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700">
      <button
        className="flex w-full items-center justify-between p-4 text-sm font-medium text-neutral-700 dark:text-neutral-300"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4" />
          {title}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="border-t border-neutral-200 p-4 dark:border-neutral-700">
          {children}
        </div>
      )}
    </div>
  );
}
