"use client";

import { cn } from "@/lib/cn";

export type FilterState = {
  query: string;
  category: string;
  language: string;
  sort: "viewers" | "recent";
};

type ToolbarProps = {
  filters: FilterState;
  categories: string[];
  languages: string[];
  onChange: (filters: FilterState) => void;
};

export function Toolbar({ filters, categories, languages, onChange }: ToolbarProps) {
  return (
    <section className="card mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-1 flex-wrap gap-3">
        <label className="flex flex-1 min-w-[160px] flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Search
          <input
            type="search"
            value={filters.query}
            onChange={(event) => onChange({ ...filters, query: event.target.value })}
            placeholder="Find a creator or game"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
          />
        </label>
        <Select
          label="Category"
          value={filters.category}
          onChange={(value) => onChange({ ...filters, category: value })}
          options={["All", ...categories]}
        />
        <Select
          label="Language"
          value={filters.language}
          onChange={(value) => onChange({ ...filters, language: value })}
          options={["All", ...languages]}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={cn(
            "rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-400 hover:text-white",
            filters.sort === "viewers" && "border-emerald-400 text-white"
          )}
          onClick={() => onChange({ ...filters, sort: "viewers" })}
        >
          Sort by viewers
        </button>
        <button
          type="button"
          className={cn(
            "rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-400 hover:text-white",
            filters.sort === "recent" && "border-emerald-400 text-white"
          )}
          onClick={() => onChange({ ...filters, sort: "recent" })}
        >
          Sort by recency
        </button>
      </div>
    </section>
  );
}

type SelectProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function Select({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option === "All" ? "" : option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
