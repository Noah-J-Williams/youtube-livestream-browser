import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PLANS } from "@/lib/stripe";
import { CheckoutButton } from "./CheckoutButton";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Choose the plan that fits your watch style. Upgrade to unlock 6-stream multiview, alerts, and ad-free browsing.",
};

export default function PricingPage() {
  return (
    <div className="space-y-10">
      <section className="card space-y-4 p-8 text-center">
        <h1 className="text-3xl font-bold text-white">Go Pro for the ultimate YouTube multiview</h1>
        <p className="mx-auto max-w-2xl text-sm text-slate-300">
          Keep watching two streams for free with AdSense support, or upgrade to Pro for six simultaneous players, audio focus
          automation, alert routing, and layout syncing. Stripe powers secure payments and Google OAuth updates your account in real time.
        </p>
      </section>
      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </section>
      <section className="card space-y-4 p-6 text-sm text-slate-300">
        <h2 className="text-lg font-semibold text-white">Frequently asked questions</h2>
        <div className="space-y-3">
          <FaqItem question="How does billing work?">
            Subscriptions renew automatically via Stripe. Downgrade or cancel anytime from the account page.
          </FaqItem>
          <FaqItem question="Do you remove YouTube ads?">
            Never. We fully comply with YouTube and AdSense policies. Pro removes only the surrounding banner placements.
          </FaqItem>
          <FaqItem question="What about data privacy?">
            User data lives in our Google-linked datastore. You can export or delete your information at any time via the data deletion portal.
          </FaqItem>
        </div>
      </section>
    </div>
  );
}

type PlanCardProps = {
  plan: (typeof PLANS)[number];
};

function PlanCard({ plan }: PlanCardProps) {
  return (
    <div className="card flex h-full flex-col gap-4 p-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
        <p className="text-3xl font-bold text-emerald-300">{plan.price}</p>
        <p className="text-xs uppercase tracking-wide text-slate-400">{plan.interval}</p>
      </div>
      <ul className="flex-1 space-y-2 text-sm text-slate-200">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {plan.priceId ? <CheckoutButton priceId={plan.priceId} /> : <FreeTierCta />}
    </div>
  );
}

function FreeTierCta() {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
      Start watching instantly. Ads support ongoing development while respecting YouTube policy guidelines.
    </div>
  );
}

function FaqItem({ question, children }: { question: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
      <div className="text-sm font-semibold text-white">{question}</div>
      <p className="mt-2 text-sm text-slate-300">{children}</p>
    </div>
  );
}

