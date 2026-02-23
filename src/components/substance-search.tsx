"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface SubstanceOption {
  id: string;
  slug: string;
  title: string;
  class_primary: string;
}

interface SubstanceSearchProps {
  label: string;
  substances: SubstanceOption[];
  selected: SubstanceOption | null;
  onSelect: (s: SubstanceOption | null) => void;
}

export function SubstanceSearch({
  label,
  substances,
  selected,
  onSelect,
}: SubstanceSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (query.length < 1) return [];
    const q = query.toLowerCase();
    return substances.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.class_primary.toLowerCase().includes(q)
    );
  }, [query, substances]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <label className="mb-1.5 block text-sm font-medium text-neutral-400">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <Input
          placeholder="Substanz suchen…"
          className="pl-9"
          value={selected ? selected.title : query}
          onChange={(e) => {
            if (selected) onSelect(null);
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (!selected && query.length >= 1) setOpen(true);
          }}
        />
      </div>
      {open && filtered.length > 0 && !selected && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-neutral-700 bg-neutral-900 shadow-lg">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-800"
                onClick={() => {
                  onSelect(s);
                  setQuery(s.title);
                  setOpen(false);
                }}
              >
                <span className="font-medium text-neutral-100">{s.title}</span>
                <span className="text-xs text-neutral-500">
                  {s.class_primary}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
