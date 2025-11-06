import { NextResponse } from "next/server";
import { clearSessionCookie, clearStateCookie, resolveAppBaseUrl } from "@/lib/auth";

export function POST() {
  clearSessionCookie();
  clearStateCookie();
  return NextResponse.json({ signedOut: true });
}

export function GET() {
  clearSessionCookie();
  clearStateCookie();
  return NextResponse.redirect(`${resolveAppBaseUrl()}/browse`);
}

