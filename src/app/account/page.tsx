import Link from "next/link";
import { getCurrentUser } from "@/lib/google-auth";
import { getAlerts, getFollows, getLayouts } from "@/lib/storage";
import { getLiveStreams } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <section className="card space-y-3 p-6">
          <h1 className="text-2xl font-bold text-white">Account</h1>
          <p className="text-sm text-slate-300">
            Sign in with Google to unlock saved multiview layouts, channel follows, and notification alerts.
          </p>
          <p className="text-xs text-slate-500">
            We request access to your YouTube account to personalise recommendations and sync preferences across devices.
          </p>
          <Link
            href="/api/auth/google"
            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black"
          >
            Continue with Google
          </Link>
        </section>
        <GuestExplainer />
      </div>
    );
  }

  const [layouts, follows, alerts] = await Promise.all([
    getLayouts(user.id),
    getFollows(user.id),
    getAlerts(user.id),
  ]);

  const { streams } = await getLiveStreams({ query: "", eventType: "live", regionCode: "US", maxResults: 12, order: "viewCount" });

  return (
    <div className="space-y-8">
      <section className="card space-y-2 p-6">
        <h1 className="text-2xl font-bold text-white">Welcome back, {user.email}</h1>
        <p className="text-sm text-slate-300">Your current plan: <span className="text-emerald-300 uppercase">{user.role}</span></p>
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Link href="/pricing" className="text-emerald-300 hover:text-emerald-200">
            Manage subscription
          </Link>
          <span aria-hidden="true" className="text-slate-600">
            •
          </span>
          <Link href="/api/auth/signout" className="text-emerald-300 hover:text-emerald-200">
            Sign out
          </Link>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <header>
          <h2 className="text-lg font-semibold text-white">Saved layouts</h2>
          <p className="text-xs text-slate-400">
            Layouts persist between sessions by linking your Google account. Edit them from the multiview page and they will sync automatically.
          </p>
        </header>
        {layouts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 px-4 py-8 text-sm text-slate-300">
            You have not saved any layouts yet. Configure your multiview and they will appear here.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {layouts.map((item, index) => (
              <div key={`${item.id}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                <div className="text-xs uppercase tracking-wide text-slate-500">Layout #{index + 1}</div>
                <div className="mt-3 space-y-2">
                  {item.layout_json.map((tile) => {
                    const stream = streams.find((candidate) => candidate.id === tile.id);
                    return (
                      <div key={tile.id} className="flex items-center justify-between rounded-md border border-slate-800 px-3 py-2">
                        <span>{stream?.title ?? tile.id}</span>
                        <span className="text-xs text-slate-500">{tile.w}x{tile.h}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card space-y-4 p-6">
        <header>
          <h2 className="text-lg font-semibold text-white">Followed channels</h2>
          <p className="text-xs text-slate-400">
            Use follows to quickly surface creators on the browse page. We store channel IDs alongside your Google profile.
          </p>
        </header>
        {follows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 px-4 py-8 text-sm text-slate-300">
            You are not following any channels yet.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {follows.map((follow) => (
              <li key={follow.channel_id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-200">
                <span>{follow.channel_id}</span>
                <Link href={`https://youtube.com/channel/${follow.channel_id}`} target="_blank" rel="noreferrer" className="text-xs text-emerald-300 hover:text-emerald-200">
                  View channel
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-4 p-6">
        <header>
          <h2 className="text-lg font-semibold text-white">Alert settings</h2>
          <p className="text-xs text-slate-400">
            Alerts notify you when your favourite categories go live. Configure them in the app to receive email or push notifications.
          </p>
        </header>
        {alerts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900/60 px-4 py-8 text-sm text-slate-300">
            You have not configured alerts yet.
          </p>
        ) : (
          <ul className="space-y-3 text-sm text-slate-200">
            {alerts.map((alert, index) => (
              <li key={index} className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3">
                <pre className="whitespace-pre-wrap text-xs text-slate-400">{JSON.stringify(alert.config_json, null, 2)}</pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function GuestExplainer() {
  return (
    <section className="card space-y-3 p-6 text-sm text-slate-300">
      <h2 className="text-lg font-semibold text-white">Why create an account?</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>Sync multiview layouts across devices with Google sign-in.</li>
        <li>Follow creators and receive alerts when they go live.</li>
        <li>Unlock 6-stream multiview, alert routing, and AdSense-free browsing with Pro.</li>
      </ul>
      <p className="text-xs text-slate-500">
        We respect your privacy and store only essential metadata. You can request data deletion at any time via our data deletion instructions.
      </p>
    </section>
  );
}
