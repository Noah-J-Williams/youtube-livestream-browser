export const metadata = {
  title: "Data Deletion",
};

export default function DataDeletionPage() {
  return (
    <div className="card space-y-4 p-6 text-sm text-slate-300">
      <h1 className="text-2xl font-bold text-white">Data Deletion Instructions</h1>
      <p>
        To request account deletion and removal of stored preferences, email <a href="mailto:privacy@livestreambrowser.app" className="text-emerald-300 hover:text-emerald-200">privacy@livestreambrowser.app</a> from your registered address.
        Include your Google-linked user ID (visible on the account page). We will remove entries associated with your layouts, follows, and alerts within 72 hours.
      </p>
      <p>
        For Stripe-related billing data, cancel your subscription via the account page or contact support. Stripe automatically deletes invoices and customer records once retention requirements are met.
      </p>
    </div>
  );
}
