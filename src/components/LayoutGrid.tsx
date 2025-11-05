"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { YouTubeLiveStream } from "@/lib/youtube";
import { useManagedAudio } from "@/components/AudioManager";
import type { VolumeController } from "@/components/AudioManager";

const GRID_COLUMNS = 12;
const ROW_HEIGHT = 160;

type YouTubePlayer = {
  setVolume: (volume: number) => void;
  getVolume: () => number;
  destroy: () => void;
};

type YouTubePlayerOptions = {
  videoId: string;
  playerVars: Record<string, unknown>;
  events: {
    onReady?: () => void;
  };
};

export type LayoutItem = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type LayoutGridProps = {
  streams: YouTubeLiveStream[];
  layout: LayoutItem[];
  onLayoutChange: (layout: LayoutItem[]) => void;
  onRemove: (id: string) => void;
  onPrimaryChange: (id: string) => void;
};

type ActiveDrag = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  original: LayoutItem;
};

export function LayoutGrid({ streams, layout, onLayoutChange, onRemove, onPrimaryChange }: LayoutGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState<ActiveDrag | null>(null);

  useEffect(() => {
    if (!active) return;
    function onPointerMove(event: PointerEvent) {
      event.preventDefault();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const columnWidth = rect.width / GRID_COLUMNS;
      const deltaCols = Math.round((event.clientX - active.startX) / columnWidth);
      const deltaRows = Math.round((event.clientY - active.startY) / ROW_HEIGHT);
      const nextLayout = layout.map((item) => {
        if (item.id !== active.id) return item;
        if (active.mode === "move") {
          const nextX = clamp(active.original.x + deltaCols, 0, GRID_COLUMNS - item.w);
          const nextY = Math.max(0, active.original.y + deltaRows);
          return { ...item, x: nextX, y: nextY };
        }
        const nextW = clamp(active.original.w + deltaCols, 2, GRID_COLUMNS - active.original.x);
        const nextH = Math.max(2, active.original.h + deltaRows);
        return { ...item, w: nextW, h: nextH };
      });
      onLayoutChange(normalizeLayout(nextLayout));
    }
    function onPointerUp() {
      setActive(null);
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [active, layout, onLayoutChange]);

  const containerHeight = useMemo(() => {
    const max = layout.reduce((acc, item) => Math.max(acc, item.y + item.h), 0);
    return Math.max(ROW_HEIGHT * 3, max * ROW_HEIGHT);
  }, [layout]);

  return (
    <div className="relative rounded-xl border border-slate-800 bg-slate-900/40 p-2" ref={containerRef} style={{ height: containerHeight }}>
      {layout.map((item) => {
        const stream = streams.find((candidate) => candidate.id === item.id);
        if (!stream) return null;
        return (
          <Tile
            key={item.id}
            stream={stream}
            item={item}
            onDragStart={(mode, event) => {
              event.stopPropagation();
              event.preventDefault();
              setActive({
                id: item.id,
                mode,
                startX: event.clientX,
                startY: event.clientY,
                original: { ...item },
              });
            }}
            onRemove={() => onRemove(item.id)}
            onPrimary={() => onPrimaryChange(item.id)}
          />
        );
      })}
    </div>
  );
}

type TileProps = {
  stream: YouTubeLiveStream;
  item: LayoutItem;
  onDragStart: (mode: ActiveDrag["mode"], event: PointerEvent) => void;
  onRemove: () => void;
  onPrimary: () => void;
};

function Tile({ stream, item, onDragStart, onRemove, onPrimary }: TileProps) {
  const tileRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isReady, setReady] = useState(false);
  const [controller, setController] = useState<VolumeController | null>(null);

  useManagedAudio(stream.id, { controller });

  useEffect(() => {
    const node = tileRef.current;
    if (!node) return;

    loadYouTubeApi().then((namespace) => {
      if (!node) return;
      const instance = new namespace.Player(node, {
        videoId: stream.id,
        playerVars: {
          autoplay: 0,
          controls: 1,
          playsinline: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: () => {
            setReady(true);
            setController({
              setVolume: (volume) => instance.setVolume(volume),
              getVolume: () => instance.getVolume?.() ?? 0,
            });
          },
        },
      });
      playerRef.current = instance;
    });

    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
      setController(null);
    };
  }, [stream.id]);

  return (
    <div
      className="group absolute flex flex-col overflow-hidden rounded-xl border border-slate-700 bg-black shadow-lg"
      style={{
        left: `${(item.x / GRID_COLUMNS) * 100}%`,
        top: item.y * ROW_HEIGHT,
        width: `${(item.w / GRID_COLUMNS) * 100}%`,
        height: item.h * ROW_HEIGHT,
      }}
    >
      <div className="relative flex-1">
        <div ref={tileRef} className="h-full w-full" />
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-sm text-slate-300">
            Loading player…
          </div>
        )}
      </div>
      <footer className="flex items-center justify-between bg-slate-900/90 px-3 py-2 text-xs text-slate-300">
        <div className="flex flex-col">
          <span className="font-semibold text-white">{stream.channelTitle}</span>
          <span>{stream.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-400 hover:text-white"
            onPointerDown={(event) => onDragStart("move", event.nativeEvent)}
          >
            Move
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-700 px-2 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-400 hover:text-white"
            onPointerDown={(event) => onDragStart("resize", event.nativeEvent)}
          >
            Resize
          </button>
          <button type="button" className="rounded-md bg-emerald-500 px-2 py-1 text-xs font-semibold text-black" onClick={onPrimary}>
            Focus audio
          </button>
          <button
            type="button"
            className="rounded-md border border-red-500/40 px-2 py-1 text-xs font-semibold text-red-300 hover:border-red-500 hover:text-red-200"
            onClick={onRemove}
          >
            Close
          </button>
        </div>
      </footer>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeLayout(layout: LayoutItem[]): LayoutItem[] {
  return layout
    .map((item) => ({
      ...item,
      x: clamp(Math.round(item.x), 0, GRID_COLUMNS - item.w),
      y: Math.max(0, Math.round(item.y)),
      w: clamp(Math.round(item.w), 2, GRID_COLUMNS),
      h: Math.max(2, Math.round(item.h)),
    }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

type YouTubeNamespace = {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer;
} | undefined;

let apiPromise: Promise<NonNullable<YouTubeNamespace>> | null = null;

function loadYouTubeApi(): Promise<NonNullable<YouTubeNamespace>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API can only be loaded in the browser"));
  }
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const existing = (window as unknown as { YT?: NonNullable<YouTubeNamespace> }).YT;
    if (existing?.Player) {
      resolve(existing);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load YouTube API"));
    document.body.appendChild(script);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      const namespace = (window as unknown as { YT?: NonNullable<YouTubeNamespace> }).YT;
      if (namespace?.Player) {
        resolve(namespace);
      } else {
        reject(new Error("YouTube API failed to initialise"));
      }
    };
  });
  return apiPromise;
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: NonNullable<YouTubeNamespace>;
  }
}
