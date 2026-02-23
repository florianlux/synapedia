"use client";

import { useEffect, useState } from "react";

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents({ headings }: { headings: TocHeading[] }) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );

    for (const heading of headings) {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav className="space-y-1 text-sm">
      <p className="mb-3 font-semibold text-neutral-900 dark:text-neutral-100">
        Inhaltsverzeichnis
      </p>
      {headings.map((heading) => (
        <a
          key={heading.id}
          href={`#${heading.id}`}
          className={`block rounded-md px-3 py-1.5 transition-colors ${
            heading.level === 3 ? "pl-6" : ""
          } ${
            activeId === heading.id
              ? "bg-cyan-100 font-medium text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300"
              : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
          }`}
        >
          {heading.text}
        </a>
      ))}
    </nav>
  );
}
