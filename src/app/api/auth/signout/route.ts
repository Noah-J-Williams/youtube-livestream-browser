import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const redirectUrl = new URL("/account", request.url);
  const response = NextResponse.redirect(redirectUrl);
  ["google-id-token", "google-access-token", "google-refresh-token", "google-oauth-state"].forEach((name) => {
    response.cookies.delete(name);
  });
  return response;
}
