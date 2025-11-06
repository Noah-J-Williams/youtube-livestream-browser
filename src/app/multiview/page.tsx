import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getLayouts } from "@/lib/supabase";
import { getLiveStreams } from "@/lib/youtube";
import { MultiviewClient } from "./shared";
import type { LayoutItem } from "@/components/LayoutGrid";

export const revalidate = 30;

export default async function MultiviewPage() {
  const user = await getCurrentUser();
  const { streams } = await getLiveStreams({ query: "", eventType: "live", regionCode: "US", maxResults: 18, order: "viewCount" });
  const savedLayouts = user ? await getLayouts(user.id) : [];

  const defaultLayout = savedLayouts[0]?.layout_json?.length
    ? savedLayouts[0].layout_json
    : createDefaultLayout(streams.slice(0, user?.role === "pro" ? 4 : 2));

  return (
    <div className="space-y-6">
      <section className="card space-y-3 p-6">
        <h1 className="text-2xl font-bold text-white">Multiview theatre</h1>
        <p className="text-sm text-slate-300">
          Arrange up to {user?.role === "pro" ? "six" : "two"} live streams with smart audio ducking. Signed-in viewers sync layouts through Supabase using Google OAuth.
        </p>
      </section>
      <Suspense fallback={<div className="card p-6 text-sm text-slate-300">Loading multiview experience…</div>}>
        <MultiviewClient
          streams={streams}
          initialLayout={defaultLayout}
          user={user}
          maxTiles={user?.role === "pro" ? 6 : 2}
        />
      </Suspense>
    </div>
  );
}

function createDefaultLayout(streams: { id: string }[]): LayoutItem[] {
  return streams.map((stream, index) => ({
    id: stream.id,
    x: index % 2 === 0 ? 0 : 6,
    y: Math.floor(index / 2) * 4,
    w: 6,
    h: 4,
  }));
}
