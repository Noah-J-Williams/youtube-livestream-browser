import { cookies, headers } from "next/headers";
import { getUserRole } from "./storage";
import type { AppUser } from "./user";

const GOOGLE_TOKEN_INFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo";

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const headerList = await headers();
  const idToken =
    cookieStore.get("google-id-token")?.value ?? headerList.get("authorization")?.replace("Bearer ", "") ?? undefined;

  if (!idToken) {
    return null;
  }

  try {
    const profileResponse = await fetch(`${GOOGLE_TOKEN_INFO_ENDPOINT}?id_token=${idToken}`, { cache: "no-store" });
    if (!profileResponse.ok) {
      console.error("Failed to verify Google ID token", profileResponse.statusText);
      return null;
    }

    const profile = (await profileResponse.json()) as GoogleTokenInfoResponse;
    if (!profile.sub || !profile.email) {
      return null;
    }

    return {
      id: profile.sub,
      email: profile.email,
      name: profile.name ?? null,
      image: profile.picture ?? null,
      role: await getUserRole(profile.sub),
    };
  } catch (error) {
    console.error("Error fetching Google token info", error);
    return null;
  }
}

type GoogleTokenInfoResponse = {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
};
