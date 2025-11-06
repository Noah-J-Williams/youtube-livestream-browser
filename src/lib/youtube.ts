import { z } from "zod";

const CATEGORY_NAMES: Record<string, string> = {
  "1": "Film & Animation",
  "2": "Autos & Vehicles",
  "10": "Music",
  "15": "Pets & Animals",
  "17": "Sports",
  "19": "Travel & Events",
  "20": "Gaming",
  "22": "People & Blogs",
  "23": "Comedy",
  "24": "Entertainment",
  "25": "News & Politics",
  "26": "Howto & Style",
  "27": "Education",
  "28": "Science & Technology",
  "29": "Nonprofits & Activism",
};

const DEFAULT_SEARCH_QUERIES = [
  "live stream",
  "gaming live",
  "music live",
  "news live",
  "sports live",
];

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

const CACHE_TTL_MS = 90 * 1000;

export async function getLiveStreams(rawParams: SearchParams): Promise<YouTubeSearchResult> {
  const params = searchParamsSchema.parse(rawParams);
  const key = JSON.stringify(params);
  const now = Date.now();

  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    console.log("[YouTube] Returning cached live streams", {
      key,
      fetchedAt: cached.data.fetchedAt,
      streamCount: cached.data.streams.length,
    });
    return cached.data;
  }

  console.log("[YouTube] Fetching live streams from source", { params, key });
  const result: YouTubeSearchResult = {
    fetchedAt: new Date().toISOString(),
    streams: await fetchStreamsFromSource(params),
  };

  console.log("[YouTube] Live streams fetched", {
    fetchedAt: result.fetchedAt,
    streamCount: result.streams.length,
    streamIds: result.streams.map((stream) => stream.id),
  });
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

async function fetchStreamsFromSource(params: z.output<typeof searchParamsSchema>): Promise<YouTubeLiveStream[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || process.env.USE_YOUTUBE_MOCKS === "true") {
    console.log("[YouTube] Using mock streams", {
      reason: !apiKey ? "missing_api_key" : "USE_YOUTUBE_MOCKS flag set",
      requestedCount: params.maxResults,
    });
    return generateMockStreams(params.maxResults);
  }

  const searchResults = await collectSearchResults(apiKey, params);

  if (searchResults.length === 0) {
    console.warn("[YouTube] No live streams returned from search, falling back to mocks");
    return generateMockStreams(params.maxResults);
  }

  const videoIds = searchResults.map((item) => item.id.videoId);
  const videoDetails = await fetchVideoDetails(videoIds, apiKey);

  return searchResults.map((item) => {
    const details = videoDetails.get(item.id.videoId);
    const snippet = details?.snippet ?? item.snippet;
    const liveDetails = details?.liveStreamingDetails;
    const thumbnail =
      snippet.thumbnails.high?.url ?? snippet.thumbnails.medium?.url ?? snippet.thumbnails.default.url;

    const language =
      snippet.defaultAudioLanguage ?? snippet.defaultLanguage ?? params.language ?? "en";
    const categoryId = snippet.categoryId ?? details?.snippet?.categoryId;
    const category = categoryId
      ? CATEGORY_NAMES[categoryId] ?? `Category ${categoryId}`
      : params.category ?? "General";
    const startedAt = liveDetails?.actualStartTime ?? snippet.publishedAt;
    const liveViewers = liveDetails?.concurrentViewers
      ? Number(liveDetails.concurrentViewers)
      : item.snippet.liveBroadcastContent === "live"
        ? Math.floor(Math.random() * 5000) + 50
        : 0;

    return youTubeStreamSchema.parse({
      id: item.id.videoId,
      title: snippet.title,
      channelTitle: snippet.channelTitle,
      thumbnail,
      liveViewers,
      language,
      category,
      startedAt,
      description: snippet.description,
      tags: snippet.tags,
    });
  });
}

async function collectSearchResults(
  apiKey: string,
  params: z.output<typeof searchParamsSchema>
): Promise<YouTubeSearchApiResponse["items"]> {
  const items = new Map<string, YouTubeSearchApiResponse["items"][number]>();
  const trimmedQuery = params.query.trim();
  const isCustomQuery = trimmedQuery.length > 0;
  const queries = isCustomQuery ? [trimmedQuery] : DEFAULT_SEARCH_QUERIES;

  const maxPerQuery = isCustomQuery
    ? params.maxResults
    : Math.min(12, Math.max(5, Math.ceil(params.maxResults / Math.max(queries.length, 1)) + 2));

  for (const query of queries) {
    const results = await searchYouTube(apiKey, params, query, maxPerQuery);
    for (const result of results) {
      if (!result.id?.videoId) continue;
      if (!items.has(result.id.videoId)) {
        items.set(result.id.videoId, result);
      }
      if (items.size >= params.maxResults) {
        break;
      }
    }
    if (items.size >= params.maxResults) {
      break;
    }
  }

  return Array.from(items.values()).slice(0, params.maxResults);
}

async function searchYouTube(
  apiKey: string,
  params: z.output<typeof searchParamsSchema>,
  query: string,
  maxResults: number
): Promise<YouTubeSearchApiResponse["items"]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("eventType", params.eventType);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", Math.min(50, Math.max(1, maxResults)).toString());
  url.searchParams.set("order", params.order);
  url.searchParams.set("q", query);
  url.searchParams.set("regionCode", params.regionCode);
  url.searchParams.set("key", apiKey);

  console.log("[YouTube] Requesting live streams from YouTube API", {
    endpoint: url.origin + url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
  });
  const response = await fetch(url.toString(), { next: { revalidate: CACHE_TTL_MS / 1000 } });
  console.log("[YouTube] YouTube API response received", {
    status: response.status,
    statusText: response.statusText,
  });
  if (!response.ok) {
    console.error("YouTube API error", await response.text());
    return [];
  }

  const json = (await response.json()) as YouTubeSearchApiResponse;
  console.log("[YouTube] YouTube API returned items", {
    query,
    itemCount: json.items.length,
    videoIds: json.items.map((item) => item.id.videoId),
  });

  return json.items;
}

async function fetchVideoDetails(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, YouTubeVideoApiResponse["items"][number]>> {
  const details = new Map<string, YouTubeVideoApiResponse["items"][number]>();
  const chunkSize = 50;

  for (let index = 0; index < videoIds.length; index += chunkSize) {
    const chunk = videoIds.slice(index, index + chunkSize);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,liveStreamingDetails");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", apiKey);

    console.log("[YouTube] Fetching video details", {
      endpoint: url.origin + url.pathname,
      ids: chunk,
    });

    const response = await fetch(url.toString(), { next: { revalidate: CACHE_TTL_MS / 1000 } });
    if (!response.ok) {
      console.error("[YouTube] Failed to load video details", {
        status: response.status,
        statusText: response.statusText,
      });
      continue;
    }

    const json = (await response.json()) as YouTubeVideoApiResponse;
    for (const item of json.items) {
      details.set(item.id, item);
    }
  }

  return details;
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
      defaultAudioLanguage?: string;
      liveBroadcastContent: "none" | "upcoming" | "live";
      thumbnails: {
        default: { url: string };
        medium?: { url: string };
        high?: { url: string };
      };
      tags?: string[];
      categoryId?: string;
    };
  }>;
};

type YouTubeVideoApiResponse = {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      channelTitle: string;
      publishedAt: string;
      categoryId?: string;
      defaultLanguage?: string;
      defaultAudioLanguage?: string;
      tags?: string[];
      thumbnails: {
        default: { url: string };
        medium?: { url: string };
        high?: { url: string };
      };
    };
    liveStreamingDetails?: {
      actualStartTime?: string;
      scheduledStartTime?: string;
      concurrentViewers?: string;
    };
  }>;
};

export function generateMockStreams(count = 12): YouTubeLiveStream[] {
  return Array.from({ length: count }).map((_, index) => {
    const id = `mock-stream-${index + 1}`;
    const categories = [
      "Gaming",
      "Music",
      "News & Politics",
      "Sports",
      "Science & Technology",
      "Entertainment",
    ];
    const languages = ["en", "es", "ja", "ko", "fr", "pt", "de"];
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
