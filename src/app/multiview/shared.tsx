"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AudioManagerProvider, useAudioManager } from "@/components/AudioManager";
import { LayoutGrid, type LayoutItem } from "@/components/LayoutGrid";
import type { SupabaseUser } from "@/lib/supabase";
import { saveLayout } from "@/lib/supabase";
import type { YouTubeLiveStream } from "@/lib/youtube";

export type MultiviewClientProps = {
  streams: YouTubeLiveStream[];
  initialLayout: LayoutItem[];
  user: SupabaseUser | null;
  maxTiles: number;
};

const runMicrotask = (fn: () => void) => {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(fn);
  } else {
    Promise.resolve().then(fn);
  }
};

export function MultiviewClient(props: MultiviewClientProps) {
  return (
    <AudioManagerProvider>
      <MultiviewExperience {...props} />
    </AudioManagerProvider>
  );
}

function MultiviewExperience({ streams, initialLayout, user, maxTiles }: MultiviewClientProps) {
  const [layout, setLayout] = useState<LayoutItem[]>(initialLayout);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { primaryId, setPrimary } = useAudioManager();

  const selectedIds = useMemo(() => layout.map((item) => item.id), [layout]);

  const availableStreams = useMemo(
    () => streams.filter((stream) => !selectedIds.includes(stream.id)),
    [streams, selectedIds]
  );

  const addStream = useCallback(
    (stream: YouTubeLiveStream) => {
      setError(null);
      setLayout((current) => {
        if (current.some((item) => item.id === stream.id)) {
          return current;
        }
        if (current.length >= maxTiles) {
          setError(`Upgrade to Pro to watch more than ${maxTiles} streams.`);
          return current;
        }
        const nextItem: LayoutItem = {
          id: stream.id,
          x: (current.length % 2) * 6,
          y: Math.floor(current.length / 2) * 4,
          w: 6,
          h: 4,
        };
        return [...current, nextItem];
      });
    },
    [maxTiles]
  );

  useEffect(() => {
    const toAdd = searchParams.get("add");
    if (!toAdd) return;
    const stream = streams.find((candidate) => candidate.id === toAdd);
    if (!stream) return;
    runMicrotask(() => addStream(stream));
    const next = new URLSearchParams(searchParams.toString());
    next.delete("add");
    startTransition(() => router.replace(`/multiview${next.toString() ? `?${next.toString()}` : ""}`));
  }, [searchParams, router, streams, addStream]);

  const removeStream = useCallback((id: string) => {
    setLayout((current) => current.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (layout.length === 0) return;
    if (!layout.some((item) => item.id === primaryId)) {
      runMicrotask(() => setPrimary(layout[0].id));
    }
  }, [layout, primaryId, setPrimary]);

  useEffect(() => {
    if (!user) {
      runMicrotask(() => setStatus("idle"));
      return;
    }
    runMicrotask(() => setStatus("saving"));
    const timer = setTimeout(() => {
      saveLayout(user.id, layout)
        .then(() => setStatus("saved"))
        .catch((err) => {
          console.error(err);
          setStatus("error");
          setError("Failed to save layout to Supabase.");
        });
    }, 600);
    return () => clearTimeout(timer);
  }, [layout, user]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <LayoutGrid
            streams={streams}
            layout={layout}
            onLayoutChange={setLayout}
            onRemove={removeStream}
            onPrimaryChange={setPrimary}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-200">
                Primary audio: {primaryId ? streams.find((stream) => stream.id === primaryId)?.channelTitle ?? primaryId : "None"}
              </span>
              <button
                type="button"
                className="rounded-md border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-400 hover:text-white"
                onClick={() => {
                  if (layout.length === 0) return;
                  const currentIndex = layout.findIndex((item) => item.id === primaryId);
                  const next = layout[(currentIndex + 1) % layout.length] ?? layout[0];
                  if (next) setPrimary(next.id);
                }}
              >
                Cycle focus
              </button>
            </div>
            <div className="text-xs text-slate-500">
              {user
                ? status === "saving"
                  ? "Saving layout…"
                  : status === "saved"
                    ? "Layout saved to Supabase."
                    : status === "error"
                      ? error
                      : "Layout synced."
                : "Sign in with Supabase auth to save layouts and alerts."}
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
          )}
        </div>
        <aside className="space-y-4">
          <section className="card space-y-3 p-4">
            <h2 className="text-lg font-semibold text-white">Add another stream</h2>
            <p className="text-xs text-slate-400">
              Select up to {maxTiles} streams. Pro subscribers can enable alerts and store multiple layouts in Supabase.
            </p>
            <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {availableStreams.map((stream) => (
                <button
                  key={stream.id}
                  type="button"
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left text-sm text-slate-200 hover:border-emerald-400 hover:text-white"
                  onClick={() => addStream(stream)}
                >
                  <span className="line-clamp-1">{stream.title}</span>
                  <span className="text-xs text-slate-400">{stream.liveViewers.toLocaleString()} watching</span>
                </button>
              ))}
              {availableStreams.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-800 bg-slate-900/60 px-3 py-6 text-center text-xs text-slate-400">
                  All fetched streams are in your layout. Browse more streams to expand the multiview.
                </p>
              )}
            </div>
          </section>
          <section className="card space-y-3 p-4 text-sm text-slate-300">
            <h3 className="text-base font-semibold text-white">Audio focus tips</h3>
            <ul className="list-disc space-y-2 pl-5">
              <li>Click “Focus audio” on any tile to send full volume to that stream.</li>
              <li>All secondary streams are ducked to {Math.round(0.18 * 100)}% for ambient awareness.</li>
              <li>Cycle focus to rotate audio during watch parties.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
