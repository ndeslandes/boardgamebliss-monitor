# BoardGameBliss Monitor

A self-hosted dashboard that watches [boardgamebliss.com](https://www.boardgamebliss.com) for new restock and new-arrival collections, tracks product availability, and lets you maintain a personal wishlist.

## Features

- Hourly sync against the Shopify collections API
- Highlights new `restock-*` and `new-*` collections since your last visit
- Per-collection product counts broken down by in-stock / sold-out
- Wishlist — save products and see their live availability at a glance
- Full-text product search across any collection
- Persistent JSON store — no database required

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS**
- **node-cron** background worker for scheduled polling
- Flat-file JSON store (`data/store.json`)

## Getting Started

```bash
npm install
npm run dev
```

Runs Next.js on port 3000 and starts the background worker together.

Open [http://localhost:3000](http://localhost:3000) and trigger the first sync from the **Sync** button or wait for the automatic poll 10 seconds after startup.

## Docker

```bash
docker compose up -d
```

The `data/` directory is mounted as a volume so the store survives container restarts.

## Project Structure

```
src/
  app/
    page.tsx                  # Main dashboard
    search/                   # Product search
    poll/                     # Manual sync trigger + progress
    collections/[handle]/     # Per-collection product list
    api/                      # Route handlers (poll, collections, wishlist, …)
  lib/
    db.ts                     # JSON store read/write
    shopify.ts                # Rate-limited Shopify API client
    products.ts               # Product helpers
    progress.ts               # SSE progress streaming
worker.js                     # Cron worker (runs alongside Next.js)
```

## License

See [LICENSE](LICENSE).
