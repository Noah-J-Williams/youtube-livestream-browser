import crypto from "node:crypto";
import { NextResponse } from "next/server";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const errorUrl = new URL("/account?error=google-auth-misconfigured", request.url);
    return NextResponse.redirect(errorUrl);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const state = crypto.randomUUID();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/youtube.readonly",
    ].join(" "),
    access_type: "offline",
    include_granted_scopes: "true",
    state,
    prompt: "consent",
  });

  const response = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
  response.cookies.set("google-oauth-state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
