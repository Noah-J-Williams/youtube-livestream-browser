import { NextResponse } from "next/server";
import type { CheckoutSessionPayload } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/auth";

const STRIPE_ENDPOINT = "https://api.stripe.com/v1/checkout/sessions";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Stripe secret key not configured" }, { status: 500 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const payload = (await request.json()) as CheckoutSessionPayload;
  if (!payload.priceId) {
    return NextResponse.json({ error: "Missing Stripe price identifier" }, { status: 400 });
  }

  const baseUrl = resolveAppUrl();
  const params = new URLSearchParams({
    success_url: `${baseUrl}/account?upgrade=success`,
    cancel_url: `${baseUrl}/pricing`,
    mode: "subscription",
    "line_items[0][price]": payload.priceId,
    "line_items[0][quantity]": "1",
  });
  params.set("metadata[user_id]", user.id);
  params.set("metadata[role]", user.role);
  params.set("customer_email", user.email);

  const response = await fetch(STRIPE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
    cache: "no-store",
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Stripe checkout error", error);
    return NextResponse.json({ error }, { status: response.status });
  }

  const session = (await response.json()) as { url: string };
  return NextResponse.json({ url: session.url });
}

function resolveAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
