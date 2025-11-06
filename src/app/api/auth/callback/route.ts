import { NextResponse } from "next/server";
import {
  clearStateCookie,
  createSessionFromCode,
  readStateCookie,
  resolveAppBaseUrl,
  usingAuthMocks,
} from "@/lib/auth";

export async function GET(request: Request) {
  if (usingAuthMocks()) {
    return NextResponse.redirect(new URL("/account", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = readStateCookie();

  if (!code || !state || !storedState || state !== storedState) {
    clearStateCookie();
    return NextResponse.redirect(`${resolveAppBaseUrl()}/account?error=oauth_state`);
  }

  clearStateCookie();

  try {
    await createSessionFromCode(code);
  } catch (error) {
    console.error("OAuth callback failed", error);
    return NextResponse.redirect(`${resolveAppBaseUrl()}/account?error=oauth_exchange`);
  }

  return NextResponse.redirect(`${resolveAppBaseUrl()}/account`);
}

