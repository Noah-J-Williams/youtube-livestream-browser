import { NextResponse } from "next/server";
import { getLiveStreams } from "@/lib/youtube";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());

  const result = await getLiveStreams({
    query: params.query ?? "",
    eventType: "live",
    regionCode: params.regionCode ?? "US",
    maxResults: params.maxResults ? Number(params.maxResults) : 72,
    order: params.order === "date" ? "date" : params.order === "relevance" ? "relevance" : "viewCount",
    language: params.language,
    category: params.category,
  });

  return NextResponse.json(result);
}
