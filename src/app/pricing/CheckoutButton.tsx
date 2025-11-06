"use client";

import { useState } from "react";
import { requestCheckoutSession } from "@/lib/stripe";

type CheckoutButtonProps = {
  priceId: string;
};

export function CheckoutButton({ priceId }: CheckoutButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleCheckout() {
    setState("loading");
    setMessage(null);
    try {
      const session = await requestCheckoutSession({ priceId });
      window.location.href = session.url;
    } catch (error) {
      console.error(error);
      setState("error");
      setMessage("Failed to initialise Stripe Checkout. Please try again.");
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={state === "loading"}
        className="w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
      >
        {state === "loading" ? "Redirecting…" : "Upgrade with Stripe"}
      </button>
      {message && <p className="text-xs text-red-400">{message}</p>}
    </div>
  );
}
