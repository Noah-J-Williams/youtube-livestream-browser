# YouTube Livestream Browser

A production-ready Next.js application that recreates a Twitch-style browsing experience for YouTube Live. Browse trending streams, launch a draggable multiview theatre with smart audio ducking, manage Google-linked layouts, and upgrade to Pro via Stripe.

## Features

- **Browse** live streams with filtering by category, language, and sort order using cached YouTube Data API v3 results.
- **Watch** individual streams with rich metadata, related stream recommendations, and quick multiview entry points.
- **Multiview theatre** for 2–6 streams with drag-resize layout, YouTube IFrame Player integration, and Web Audio-based volume ducking.
- **Google OAuth accounts** for saved layouts, followed channels, and alert configuration.
- **Stripe-powered billing** for monthly or yearly Pro subscriptions (with webhook-driven role updates).
- **AdSense-compatible UI** that keeps banner placements outside of YouTube iframes.
- **Dark, responsive UI** built with Tailwind CSS, reusable components, and accessibility-friendly controls.

## Tech Stack

- [Next.js](https://nextjs.org/) App Router
- Tailwind CSS for styling
- Custom layout manager inspired by react-grid-layout
- YouTube Data API v3 + IFrame Player API
- Google OAuth 2.0 for authentication and Prisma-backed persistence
- Stripe Checkout for subscriptions
- Node `crypto` for webhook verification

## Getting Started

1. **Install dependencies** (already vendored in this template, so `npm install` is optional when using the provided environment).
2. **Create an environment file**:

   ```bash
   cp .env.example .env.local
   ```

3. **Populate environment variables** (see below).
4. **Run the development server**:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) to explore the app.

## Environment Variables

| Variable | Description |
| --- | --- |
| `YOUTUBE_API_KEY` | Server-side key for YouTube Data API v3. Required for fetching livestream data. |
| `GOOGLE_CLIENT_ID` | OAuth client ID for Google/YouTube authentication. Required for real sign-in flows. |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret used during the code exchange. Required for real sign-in flows. |
| `DATABASE_URL` | Postgres connection string for Prisma (use the Supabase-provided URL). |
| `NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID` | Stripe price ID for the monthly Pro plan. |
| `NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID` | Stripe price ID for the annual Pro plan. |
| `STRIPE_SECRET_KEY` | Secret API key for creating Checkout sessions. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for webhook verification. |
| `NEXT_PUBLIC_APP_URL` | (Optional) Absolute app URL used in Stripe redirect links. |

See `.env.example` for a starter configuration. Once the database connection string is configured, run `npx prisma db push` to
provision the required tables in Supabase and generate the Prisma client.

## Stripe & Google Integration

- Checkout sessions are created via `/api/stripe/session` and redirect users to Stripe-hosted payment flows.
- Stripe webhooks (`/api/stripe/webhook`) validate signatures with `crypto` and update Google-linked user roles in the database.
- Persistence uses Prisma to persist Google-linked data to Supabase.

## Multiview Audio Manager

The multiview theatre leverages a custom `AudioManagerCore` that:

- Registers streams via the YouTube IFrame Player API and controls volume through the player's API.
- Keeps a single stream at full volume while ducking the rest to ~18%.
- Performs smooth transitions (or immediate adjustments in server/test contexts) and exposes hooks for React components.

## Testing

An example unit test for the audio ducking logic lives at `src/tests/audioManager.test.ts`. Run it with Node's test runner and a TypeScript loader:

```bash
node --loader ts-node/esm --test src/tests/audioManager.test.ts
```

(Install `ts-node` locally if it is not already available.)

## Data Deletion & Policies

- The footer links to data deletion instructions and YouTube API Terms of Service.
- Implement a proper deletion handler that removes rows from your backing store.

## Project Structure

```
src/
  app/
    browse/
    watch/[id]/
    multiview/
    account/
    pricing/
    api/
  components/
  lib/
  styles/
  tests/
```

Each route or component includes rich comments and type-safe helpers to accelerate further development.
