# Deployment

RiskSense is designed to be self-hosted. Nothing in the core platform requires a
proprietary service: the data sources are public, the basemap needs no key, and
persistence is optional.

## Build and run

```bash
npm install
npm run build
npm run start          # serves the production build on port 3000
```

Set `PORT` to change the port, and `HOSTNAME=0.0.0.0` to bind all interfaces.

## Environment variables

See [`.env.example`](../.env.example). All are optional.

| Variable | Required | Effect when unset |
| --- | --- | --- |
| `FIRMS_MAP_KEY` | No | FIRMS uses the public global archives instead of the area API |
| `NEXT_PUBLIC_MAP_STYLE_URL` | No | Uses OpenFreeMap's default style |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Community reports use an in-memory store |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Only needed for server-side administrative writes |
| `INGESTION_OUTPUT_DIR` | No | Ingestion runner defaults to `./data/local` |

`NEXT_PUBLIC_` variables are embedded in the browser bundle. Never put a
credential in one.

## Docker

A minimal multi-stage build:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/data-sources/package.json packages/data-sources/
COPY packages/hazard-engine/package.json packages/hazard-engine/
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "run", "start"]
```

```bash
docker build -t risksense .
docker run -p 3000:3000 risksense
```

## Docker Compose

`docker-compose.yml` runs the app on its own. Add a Supabase service or point at
a managed instance if you want persisted reports.

```bash
docker compose up --build
```

## Vercel

RiskSense deploys to Vercel with no configuration beyond the Root Directory.
The repository is an npm-workspaces monorepo, so Vercel must install from the
repository root while building the `apps/web` workspace.

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project** and import the repository.
3. Set **Root Directory** to `apps/web`.
4. Leave the build settings on their detected defaults; `apps/web/vercel.json`
   sets the install and build commands (`cd ../.. && npm install`, then
   `cd ../.. && npm run build --workspace apps/web`).
5. Add any optional variables from [`.env.example`](../.env.example) under
   **Settings → Environment Variables**.
6. Deploy.

Notes:

- No environment variables are required. Without `FIRMS_MAP_KEY` the wildfire
  adapter reads the public FIRMS archives, and without the Supabase variables
  community reports use the in-memory store.
- The API routes run on the Node.js runtime. `apps/web/vercel.json` raises the
  function timeout for the aggregation and geocoding routes, which call
  upstream providers.
- The free Hobby tier is sufficient. `/api/events` is dynamic and must not be
  cached for long; the other endpoints are fine behind a CDN.

## Static and edge hosting

The map, feed and alerts are client-side, but the API routes are server-side and
must run on a Node.js runtime. Deploy the whole app; do not export it as a static
site.

| Platform | Notes |
| --- | --- |
| Vercel | Works directly. Set the optional environment variables in the project settings. |
| Netlify | Works with the Next.js runtime. |
| Fly.io / Railway / Render | Build with `npm run build`, start with `npm run start`. |
| Kubernetes | Build the image above and expose port 3000. Add a liveness probe on `/api/sources`. |

## Caching and rate limits

Upstream providers have their own expectations:

- The FIRMS adapter holds parsed archives for ten minutes so repeated requests do
  not hammer the provider.
- `/api/sources` and `/api/openapi` are cached for an hour.
- `/api/events` is dynamic and short-lived, because hazard data is time-critical.
- The community report endpoint is rate limited per client.

If you put a CDN in front, cache `/api/sources` and `/api/openapi`, and do **not**
cache `/api/events` for more than a minute — a stale hazard feed is worse than a
slow one.

## Persistence

Apply `supabase/migrations/0001_reports.sql` to a Supabase project, then set the
three Supabase variables. Without it, reports are held in memory, are lost on
restart, and the UI says they are not persisted.

## Operations checklist

- [ ] Node.js 20 or newer
- [ ] `npm run typecheck && npm run lint && npm run test` pass in CI
- [ ] Health check on `/api/sources`
- [ ] `NEXT_PUBLIC_MAP_STYLE_URL` set if you self-host tiles
- [ ] CDN configured not to cache `/api/events` for long
- [ ] A monitoring alert if `/api/events` returns warnings from every source at
      once, which usually means an outbound network problem rather than calm
      conditions

## Upgrading

The data sources are third-party APIs and can change without notice. Every
adapter validates its payload with a schema, so an upstream change surfaces as a
`degraded` status in the source panel rather than as corrupt data. Watch that
panel after deploying.

## Attribution in a deployment

If you deploy RiskSense publicly, keep the map attribution and the source
attribution visible. See [data-sources.md](data-sources.md) for the terms of each
provider.
