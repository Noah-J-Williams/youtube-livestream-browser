import crypto from "node:crypto";
import { cookies } from "next/headers";
import {
  ensureUserProfile,
  getMockUser,
  getUserProfile,
  getUserRole,
  type SupabaseUser,
  type SupabaseUserRole,
} from "@/lib/supabase";

const SESSION_COOKIE = "ylb_session";
const STATE_COOKIE = "ylb_oauth_state";

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: SupabaseUserRole;
};

type SessionPayload = {
  user: SessionUser;
  accessToken: string;
  refreshToken?: string | null;
  expiresAt: number;
};

export type AuthenticatedUser = SessionUser & {
  accessToken: string;
  refreshToken?: string | null;
};

function isSecureCookie() {
  return process.env.NODE_ENV === "production";
}

export function usingAuthMocks() {
  return (
    process.env.USE_AUTH_MOCKS === "true" ||
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.AUTH_SECRET
  );
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required for signing OAuth sessions.");
  }
  return secret;
}

function encodeSession(payload: SessionPayload) {
  const secret = getSecret();
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const secret = getSecret();
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (signatureBuf.length !== expectedBuf.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
    return null;
  }

  try {
    const json = Buffer.from(body, "base64url").toString("utf8");
    return JSON.parse(json) as SessionPayload;
  } catch (error) {
    console.error("Failed to decode OAuth session", error);
    return null;
  }
}

function setSessionCookie(payload: SessionPayload) {
  cookies().set({
    name: SESSION_COOKIE,
    value: encodeSession(payload),
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE);
}

export function createStateCookie(state: string) {
  cookies().set({
    name: STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge: 60 * 5,
  });
}

export function readStateCookie() {
  return cookies().get(STATE_COOKIE)?.value ?? null;
}

export function clearStateCookie() {
  cookies().delete(STATE_COOKIE);
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  if (usingAuthMocks()) {
    const user = getMockUser();
    return { ...user, accessToken: "mock-access-token", refreshToken: "mock-refresh" };
  }

  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const session = decodeSession(raw);
  if (!session) return null;

  if (session.expiresAt <= Date.now() + 60_000) {
    const refreshed = await refreshAccessToken(session);
    if (!refreshed) {
      clearSessionCookie();
      return null;
    }
    setSessionCookie(refreshed);
    session.accessToken = refreshed.accessToken;
    session.refreshToken = refreshed.refreshToken;
    session.expiresAt = refreshed.expiresAt;
  }

  const latestRole = await syncUserRole(session.user.id).catch(() => session.user.role);
  if (latestRole !== session.user.role) {
    session.user.role = latestRole;
    setSessionCookie(session);
  }

  return { ...session.user, accessToken: session.accessToken, refreshToken: session.refreshToken };
}

export function buildAuthorizationUrl(state: string) {
  const redirectUri = resolveRedirectUri();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/youtube.readonly",
    ].join(" ")
  );
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function createSessionFromCode(code: string) {
  if (usingAuthMocks()) {
    const user = getMockUser();
    return { ...user, accessToken: "mock-access-token", refreshToken: "mock-refresh" };
  }

  const tokens = await exchangeCodeForTokens(code);
  const profile = await fetchGoogleProfile(tokens.accessToken);

  const role = await getUserRole(profile.sub).catch(() => "free" as SupabaseUserRole);
  const supabaseUser: SupabaseUser = {
    id: profile.sub,
    email: profile.email,
    role,
    name: profile.name,
    image: profile.picture,
  };
  const ensured = await ensureUserProfile(supabaseUser);

  const payload: SessionPayload = {
    user: { ...ensured, name: ensured.name, image: ensured.image },
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  };
  setSessionCookie(payload);

  return {
    ...payload.user,
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };
}

async function exchangeCodeForTokens(code: string) {
  const redirectUri = resolveRedirectUri();
  const params = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to exchange Google auth code: ${message}`);
  }

  const json = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to fetch Google profile: ${message}`);
  }

  return (await response.json()) as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  };
}

async function refreshAccessToken(session: SessionPayload): Promise<SessionPayload | null> {
  if (!session.refreshToken) return null;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    refresh_token: session.refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Failed to refresh Google access token", await response.text());
    return null;
  }

  const json = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  return {
    ...session,
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

export function resolveAppBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI.replace(/\/api\/auth\/callback$/, "").replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function resolveRedirectUri() {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI.replace(/\/$/, "");
  }
  return `${resolveAppBaseUrl()}/api/auth/callback`;
}

export async function syncUserRole(userId: string) {
  if (usingAuthMocks()) return getMockUser().role;
  const profile = await getUserProfile(userId);
  return profile?.role ?? "free";
}

