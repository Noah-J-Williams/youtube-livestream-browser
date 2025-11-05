import Image from "next/image";
import Link from "next/link";
import type { YouTubeLiveStream } from "@/lib/youtube";
import { formatDistanceToNow } from "@/lib/time";
import { cn } from "@/lib/cn";

type StreamCardProps = {
  stream: YouTubeLiveStream;
  onAddToMultiview?: (stream: YouTubeLiveStream) => void;
  isHighlighted?: boolean;
};

export function StreamCard({ stream, onAddToMultiview, isHighlighted }: StreamCardProps) {
  return (
    <article className={cn("card flex flex-col overflow-hidden", isHighlighted && "ring-2 ring-emerald-400")}
      data-channel={stream.channelTitle}
    >
      <Link href={`/watch/${stream.id}`} className="group relative block aspect-video overflow-hidden">
        <Image
          src={stream.thumbnail}
          alt={stream.title}
          fill
          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 rounded-md bg-red-600 px-2 py-1 text-xs font-semibold uppercase text-white">
          Live
        </div>
        <div className="absolute bottom-3 left-3 rounded bg-black/60 px-2 py-1 text-xs font-medium text-white">
          {stream.liveViewers.toLocaleString()} watching
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <header className="space-y-1">
          <h3 className="line-clamp-2 text-base font-semibold text-white">{stream.title}</h3>
          <p className="text-sm text-slate-400">{stream.channelTitle}</p>
        </header>
        <div className="mt-auto space-y-2">
          <dl className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div>
              <dt className="font-medium uppercase tracking-wide text-slate-500">Language</dt>
              <dd>{stream.language.toUpperCase()}</dd>
            </div>
            <div>
              <dt className="font-medium uppercase tracking-wide text-slate-500">Category</dt>
              <dd>{stream.category}</dd>
            </div>
            <div>
              <dt className="font-medium uppercase tracking-wide text-slate-500">Started</dt>
              <dd>{formatDistanceToNow(stream.startedAt)}</dd>
            </div>
            <div>
              <dt className="font-medium uppercase tracking-wide text-slate-500">Tags</dt>
              <dd className="line-clamp-1">{stream.tags?.join(", ") ?? "N/A"}</dd>
            </div>
          </dl>
          <div className="flex items-center justify-between">
            <Link
              href={`/watch/${stream.id}`}
              className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-400 hover:text-white"
            >
              Watch now
            </Link>
            {onAddToMultiview && (
              <button type="button" onClick={() => onAddToMultiview(stream)} className="bg-emerald-500 px-3 py-2 text-sm font-semibold text-black">
                Add to multiview
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
