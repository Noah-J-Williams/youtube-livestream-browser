import { notFound } from "next/navigation";
import { StreamCard } from "@/components/StreamCard";
import { ClientLog } from "@/components/ClientLog";
import { getLiveStreams, getStreamById } from "@/lib/youtube";

export const revalidate = 60;

type WatchPageProps = {
  params: { id: string };
};

export default async function WatchPage({ params }: WatchPageProps) {
  const { id } = params;
  const stream = await getStreamById(id);

  if (!stream) {
    notFound();
  }

  const { streams: relatedStreams } = await getLiveStreams({
    query: stream.title.split(" ").slice(0, 3).join(" "),
    eventType: "live",
    regionCode: "US",
    maxResults: 12,
    order: "viewCount",
  });

  const filteredRelated = relatedStreams.filter((item) => item.id !== stream.id).slice(0, 6);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <ClientLog
        label="[YouTube] Watch page stream"
        data={{
          streamId: stream.id,
          relatedStreamCount: relatedStreams.length,
        }}
      />
      <ClientLog
        label="[YouTube] Watch page related streams"
        data={{
          streamIds: filteredRelated.map((item) => item.id),
          totalAvailable: relatedStreams.length,
        }}
      />
      <section className="space-y-6">
        <div className="relative aspect-video overflow-hidden rounded-xl border border-slate-800 bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${stream.id}?autoplay=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
            title={stream.title}
          />
        </div>
        <header className="space-y-3">
          <h1 className="text-2xl font-bold text-white">{stream.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-200">
              {stream.liveViewers.toLocaleString()} watching
            </span>
            <span>{stream.channelTitle}</span>
            <span>Language: {stream.language.toUpperCase()}</span>
            <span>Category: {stream.category}</span>
          </div>
          <div className="text-sm text-slate-400">
            <p>{stream.description ?? "Creator has not provided a description."}</p>
          </div>
        </header>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/multiview?add=${stream.id}`}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black"
          >
            Add to multiview
          </a>
          <a
            href={`https://www.youtube.com/watch?v=${stream.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-emerald-400 hover:text-white"
          >
            Open on YouTube
          </a>
        </div>
      </section>
      <aside className="space-y-4">
        <div className="card p-4">
          <h2 className="text-lg font-semibold text-white">Related live channels</h2>
          <p className="text-xs text-slate-400">Add more creators to multiview or follow them from your account dashboard.</p>
        </div>
        <div className="flex flex-col gap-4">
          {filteredRelated.map((related) => (
            <StreamCard key={related.id} stream={related} />
          ))}
        </div>
        <div className="card flex items-center justify-center p-4 text-sm text-slate-300">
          Google AdSense skyscraper placeholder (160x600)
        </div>
      </aside>
    </div>
  );
}
