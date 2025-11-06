export type BillingInterval = "monthly" | "yearly";

export type Plan = {
  name: string;
  price: string;
  interval: BillingInterval;
  priceId: string;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    interval: "monthly",
    priceId: "",
    features: ["Watch up to 2 streams", "Google AdSense-supported", "Basic alerts"],
  },
  {
    name: "Pro",
    price: "$3.99",
    interval: "monthly",
    priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ?? "price_monthly_placeholder",
    features: ["Up to 6 streams", "AdSense-free experience", "Google-linked layout syncing", "Alert automations"],
  },
  {
    name: "Pro Annual",
    price: "$39.99",
    interval: "yearly",
    priceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID ?? "price_yearly_placeholder",
    features: ["Two free months", "Priority support", "Webhook-driven alerts"],
  },
];

export type CheckoutSessionPayload = {
  priceId: string;
  customerEmail?: string;
};

export async function requestCheckoutSession(payload: CheckoutSessionPayload) {
  const response = await fetch("/api/stripe/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as { url: string };
}
