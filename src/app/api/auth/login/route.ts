import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { buildAuthorizationUrl, createStateCookie, resolveAppBaseUrl, usingAuthMocks } from "@/lib/auth";

export function GET() {
  if (usingAuthMocks()) {
    return NextResponse.redirect(`${resolveAppBaseUrl()}/account`);
  }

  const state = crypto.randomUUID();
  createStateCookie(state);
  const redirectUrl = buildAuthorizationUrl(state);
  return NextResponse.redirect(redirectUrl);
}

