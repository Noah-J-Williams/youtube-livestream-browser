export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950/80 py-8 text-sm text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Built with ❤️ for the YouTube community. Source: YouTube. Livestream metadata provided by the YouTube Data API v3.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <a href="https://developers.google.com/youtube/terms/api-services-terms-of-service" target="_blank" rel="noreferrer">
            YouTube API ToS
          </a>
          <a href="/data-deletion" className="text-slate-300 hover:text-white">
            Data deletion instructions
          </a>
        </div>
      </div>
    </footer>
  );
}
