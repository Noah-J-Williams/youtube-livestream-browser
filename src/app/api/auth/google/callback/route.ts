import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getUserRole } from "@/lib/storage";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const TOKEN_INFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const errorUrl = new URL("/account?error=google-auth-misconfigured", request.url);
    return NextResponse.redirect(errorUrl);
  }

  const currentUrl = new URL(request.url);
  const code = currentUrl.searchParams.get("code");
  const state = currentUrl.searchParams.get("state");
  const cookieStore = cookies();
  const storedState = cookieStore.get("google-oauth-state")?.value;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? currentUrl.origin;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  if (!code || !state || !storedState || state !== storedState) {
    const errorUrl = new URL("/account?error=google-auth-state-mismatch", request.url);
    const response = NextResponse.redirect(errorUrl);
    response.cookies.delete("google-oauth-state");
    return response;
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenResponse.ok) {
    console.error("Failed to exchange Google OAuth code", await tokenResponse.text());
    const errorUrl = new URL("/account?error=google-auth-token", request.url);
    const response = NextResponse.redirect(errorUrl);
    response.cookies.delete("google-oauth-state");
    return response;
  }

  const tokenJson = (await tokenResponse.json()) as GoogleTokenResponse;
  if (!tokenJson.id_token) {
    const errorUrl = new URL("/account?error=google-auth-missing-id-token", request.url);
    const response = NextResponse.redirect(errorUrl);
    response.cookies.delete("google-oauth-state");
    return response;
  }

  try {
    const profileResponse = await fetch(`${TOKEN_INFO_ENDPOINT}?id_token=${tokenJson.id_token}`, { cache: "no-store" });
    if (profileResponse.ok) {
      const profile = (await profileResponse.json()) as { sub?: string };
      if (profile.sub) {
        await getUserRole(profile.sub);
      }
    }
  } catch (error) {
    console.error("Failed to hydrate Google profile", error);
  }

  const destination = new URL("/account", request.url);
  const response = NextResponse.redirect(destination);
  response.cookies.set("google-id-token", tokenJson.id_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60,
  });

  if (tokenJson.access_token) {
    response.cookies.set("google-access-token", tokenJson.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: tokenJson.expires_in ?? 60 * 60,
    });
  }

  if (tokenJson.refresh_token) {
    response.cookies.set("google-refresh-token", tokenJson.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  response.cookies.delete("google-oauth-state");
  return response;
}

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
};
