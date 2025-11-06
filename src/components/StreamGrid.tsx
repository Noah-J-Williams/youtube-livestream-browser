"use client";

import { useCallback, useMemo, useState } from "react";
import type { YouTubeLiveStream } from "@/lib/youtube";
import { StreamCard } from "@/components/StreamCard";
import { Toolbar, type FilterState } from "@/components/Toolbar";

const DEFAULT_FILTERS: FilterState = {
  query: "",
  category: "",
  language: "",
  sort: "viewersDesc",
};

type StreamGridProps = {
  streams: YouTubeLiveStream[];
  onAddToMultiview?: (stream: YouTubeLiveStream) => void;
  featuredStreamId?: string;
};

export function StreamGrid({ streams, onAddToMultiview, featuredStreamId }: StreamGridProps) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const metadata = useMemo(() => {
    const categories = Array.from(new Set(streams.map((stream) => stream.category))).sort();
    const languages = Array.from(new Set(streams.map((stream) => stream.language))).sort();
    return { categories, languages };
  }, [streams]);

  const handleAdd = useCallback(
    (stream: YouTubeLiveStream) => {
      if (onAddToMultiview) {
        onAddToMultiview(stream);
        return;
      }
      if (typeof window === "undefined") return;
      const url = new URL("/multiview", window.location.origin);
      url.searchParams.set("add", stream.id);
      window.location.href = url.toString();
    },
    [onAddToMultiview]
  );

  const filteredStreams = useMemo(() => {
    const filtered = streams.filter((stream) => {
      if (filters.category && stream.category !== filters.category) {
        return false;
      }
      if (filters.language && stream.language !== filters.language) {
        return false;
      }
      if (filters.query) {
        const haystack = `${stream.title} ${stream.channelTitle} ${stream.tags?.join(" ") ?? ""}`.toLowerCase();
        if (!haystack.includes(filters.query.toLowerCase())) {
          return false;
        }
      }
      return true;
    });

    switch (filters.sort) {
      case "viewersAsc":
        filtered.sort((a, b) => a.liveViewers - b.liveViewers);
        break;
      case "recent":
        filtered.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        break;
      default:
        filtered.sort((a, b) => b.liveViewers - a.liveViewers);
        break;
    }

    return filtered;
  }, [streams, filters]);

  return (
    <div className="space-y-6">
      <Toolbar
        filters={filters}
        categories={metadata.categories}
        languages={metadata.languages}
        onChange={setFilters}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(200px,280px)]">
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredStreams.map((stream) => (
            <StreamCard
              key={stream.id}
              stream={stream}
              onAddToMultiview={handleAdd}
              isHighlighted={featuredStreamId === stream.id}
            />
          ))}
          {filteredStreams.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center text-sm text-slate-400">
              No livestreams match your filters right now. Try clearing filters or checking back soon.
            </div>
          )}
        </section>
        <aside className="hidden h-full flex-col gap-4 lg:flex">
          <div className="card flex h-40 items-center justify-center text-sm text-slate-300">
            Google AdSense placeholder (300x250)
          </div>
          <div className="card flex-1 space-y-3 p-4 text-sm text-slate-300">
            <h3 className="text-base font-semibold text-white">Why upgrade to Pro?</h3>
            <ul className="list-disc space-y-2 pl-5">
              <li>Watch up to 6 streams simultaneously.</li>
              <li>Smart audio focus with saved layouts.</li>
              <li>Creator alerts and AdSense-free browsing.</li>
            </ul>
            <p className="text-xs text-slate-500">
              Ads are only shown to free-tier users and never inside YouTube iframes, respecting YouTube and AdSense policies.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
