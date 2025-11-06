import { StreamGrid } from "@/components/StreamGrid";
import { getLiveStreams } from "@/lib/youtube";

export const revalidate = 90;

export default async function BrowsePage() {
  const { streams, fetchedAt } = await getLiveStreams({
    query: "",
    eventType: "live",
    regionCode: "US",
    maxResults: 24,
    order: "viewCount",
  });

  return (
    <div className="space-y-8">
      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 bg-gradient-to-r from-emerald-500/10 to-emerald-400/10 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Browse live streams</h1>
            <p className="text-sm text-slate-300">
              Discover trending YouTube livestreams and curate your multiview. Results refresh automatically every 90 seconds.
            </p>
          </div>
          <div className="text-xs text-slate-400">
            Last updated {new Date(fetchedAt).toLocaleTimeString()}.
          </div>
        </div>
        <div className="hidden border-t border-slate-800 bg-slate-900/70 p-6 text-center text-sm text-slate-300 lg:block">
          Google AdSense leaderboard placeholder (728x90)
        </div>
      </section>

      <StreamGrid streams={streams} />
    </div>
  );
}
