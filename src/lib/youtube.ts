import { z } from "zod";

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

type CacheStore = Map<string, CacheEntry<YouTubeSearchResult>>;

declare global {
  var __ytCache: CacheStore | undefined;
}

const cache: CacheStore = globalThis.__ytCache ?? new Map();
if (!globalThis.__ytCache) {
  globalThis.__ytCache = cache;
}

export const youTubeStreamSchema = z.object({
  id: z.string(),
  title: z.string(),
  channelTitle: z.string(),
  thumbnail: z.string().url(),
  liveViewers: z.number().int().nonnegative(),
  language: z.string().default("en"),
  category: z.string().default("Gaming"),
  startedAt: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type YouTubeLiveStream = z.infer<typeof youTubeStreamSchema>;

const searchParamsSchema = z.object({
  query: z.string().default(""),
  eventType: z.literal("live").default("live"),
  regionCode: z.string().default("US"),
  maxResults: z.number().int().min(1).max(50).default(25),
  language: z.string().optional(),
  category: z.string().optional(),
  order: z.enum(["relevance", "date", "viewCount"]).default("viewCount"),
});

export type SearchParams = z.input<typeof searchParamsSchema>;

export type YouTubeSearchResult = {
  fetchedAt: string;
  streams: YouTubeLiveStream[];
};

export type YouTubeSubscription = {
  id: string;
  channelId: string;
  title: string;
  thumbnail: string;
};

const CACHE_TTL_MS = 90 * 1000;

export async function getLiveStreams(rawParams: SearchParams): Promise<YouTubeSearchResult> {
  const params = searchParamsSchema.parse(rawParams);
  const key = JSON.stringify(params);
  const now = Date.now();

  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const result: YouTubeSearchResult = {
    fetchedAt: new Date().toISOString(),
    streams: await fetchStreamsFromSource(params),
  };

  cache.set(key, { data: result, expiresAt: now + CACHE_TTL_MS });
  return result;
}

export async function getStreamById(id: string): Promise<YouTubeLiveStream | null> {
  for (const entry of cache.values()) {
    const match = entry.data.streams.find((stream) => stream.id === id);
    if (match) {
      return match;
    }
  }

  const mockMatch = generateMockStreams(25).find((stream) => stream.id === id);
  if (mockMatch) {
    return mockMatch;
  }

  return null;
}

export async function getUserSubscriptions(accessToken: string | null | undefined): Promise<YouTubeSubscription[]> {
  if (!accessToken) return [];
  if (process.env.USE_YOUTUBE_MOCKS === "true") {
    return generateMockSubscriptions();
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/subscriptions");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("mine", "true");
  url.searchParams.set("maxResults", "25");
  url.searchParams.set("order", "relevance");

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Failed to fetch YouTube subscriptions", await response.text());
    return [];
  }

  const json = (await response.json()) as {
    items: Array<{
      id: string;
      snippet: {
        title: string;
        resourceId: { channelId: string };
        thumbnails: { default?: { url: string }; medium?: { url: string }; high?: { url: string } };
      };
    }>;
  };

  return json.items.map((item) => ({
    id: item.id,
    channelId: item.snippet.resourceId.channelId,
    title: item.snippet.title,
    thumbnail: item.snippet.high?.url ?? item.snippet.medium?.url ?? item.snippet.default?.url ?? "",
  }));
}

async function fetchStreamsFromSource(params: z.output<typeof searchParamsSchema>): Promise<YouTubeLiveStream[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || process.env.USE_YOUTUBE_MOCKS === "true") {
    return generateMockStreams(params.maxResults);
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("eventType", params.eventType);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", params.maxResults.toString());
  url.searchParams.set("order", params.order);
  url.searchParams.set("q", params.query);
  url.searchParams.set("regionCode", params.regionCode);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), { next: { revalidate: CACHE_TTL_MS / 1000 } });
  if (!response.ok) {
    console.error("YouTube API error", await response.text());
    return generateMockStreams(params.maxResults);
  }

  const json = (await response.json()) as YouTubeSearchApiResponse;
  return json.items.map((item) =>
    youTubeStreamSchema.parse({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default.url,
      liveViewers: item.snippet.liveBroadcastContent === "live" ? Math.floor(Math.random() * 5000) + 50 : 0,
      language: item.snippet.defaultLanguage ?? params.language ?? "en",
      category: params.category ?? "General",
      startedAt: item.snippet.publishedAt,
      description: item.snippet.description,
      tags: item.snippet.tags,
    })
  );
}

type YouTubeSearchApiResponse = {
  items: Array<{
    id: { videoId: string };
    snippet: {
      title: string;
      description: string;
      channelTitle: string;
      publishedAt: string;
      defaultLanguage?: string;
      liveBroadcastContent: "none" | "upcoming" | "live";
      thumbnails: {
        default: { url: string };
        high?: { url: string };
      };
      tags?: string[];
    };
  }>;
};

export function generateMockStreams(count = 12): YouTubeLiveStream[] {
  return Array.from({ length: count }).map((_, index) => {
    const id = `mock-stream-${index + 1}`;
    const categories = ["Gaming", "Music", "News", "Sports"];
    const languages = ["en", "es", "ja", "ko", "fr"];
    const tags = ["chill", "competitive", "analysis", "live", "vibes"];
    return youTubeStreamSchema.parse({
      id,
      title: `Mock Stream ${index + 1}`,
      channelTitle: `Creator ${index + 1}`,
      thumbnail: `https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg`,
      liveViewers: Math.floor(Math.random() * 10000) + 10,
      language: languages[index % languages.length],
      category: categories[index % categories.length],
      startedAt: new Date(Date.now() - index * 10 * 60 * 1000).toISOString(),
      description: "This is mocked livestream data for local development.",
      tags: tags.slice(0, 2 + (index % 3)),
    });
  });
}

export function generateMockSubscriptions(count = 6): YouTubeSubscription[] {
  return Array.from({ length: count }).map((_, index) => ({
    id: `mock-sub-${index + 1}`,
    channelId: `UC_mock_channel_${index + 1}`,
    title: `Mock Subscription Channel ${index + 1}`,
    thumbnail: "https://i.ytimg.com/vi/5qap5aO4i9A/hqdefault.jpg",
  }));
}
