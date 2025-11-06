import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { setUserRole } from "@/lib/supabase";

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: StripeCheckoutSession;
  };
};

type StripeCheckoutSession = {
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Stripe webhook secret missing" }, { status: 500 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (!signature.includes(expected)) {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeEvent;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = typeof session.metadata?.user_id === "string" ? session.metadata.user_id : undefined;
    const roleMetadata = session.metadata?.role;
    const role = roleMetadata === "free" || roleMetadata === "admin" ? roleMetadata : "pro";
    if (userId) {
      await setUserRole(userId, role);
    }
  }

  return NextResponse.json({ received: true });
}
