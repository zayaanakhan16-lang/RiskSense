# Local development

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Setup

```bash
git clone https://github.com/zayaanakh/RiskSense.git
cd RiskSense
npm install
cp .env.example .env.local   # optional
npm run dev
```

The app runs at <http://localhost:3000>. No keys are required: every registered
source has a keyless path, and the default basemap needs no key.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` across the workspace |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests (`node:test`) |

## Repository layout

```
apps/web/src/app          Routes and API handlers
apps/web/src/components   Map, panels, controls, primitives
apps/web/src/hooks        Client data hooks
apps/web/src/lib          Map style, icons, i18n, formatting, Overpass
packages/shared           Event model and pure helpers
packages/data-sources     Adapters and the registry
packages/hazard-engine    Aggregation, de-duplication, filters, statistics
services/ingestion        Headless runner using the same adapters
supabase/migrations       Optional persistence schema
```

## Working on the map

`MapView` is client-only and dynamically imported. MapLibre GL is initialised
once and hazard layers are generated from the hazard registry in
`packages/shared/hazards.ts` and the icon definitions in
`apps/web/src/lib/mapIcons.ts`.

When you add a hazard family:

1. Add it to `HAZARDS` in `packages/shared/hazards.ts` with a label, colour and
   icon key.
2. Add its icon path in `apps/web/src/lib/mapIcons.ts`.
3. The map, legend, feed filters and details panel pick it up automatically.

To point the map at your own tiles, set `NEXT_PUBLIC_MAP_STYLE_URL` to a MapLibre
style URL.

## Adding a hazard source

An adapter is the whole contract. Create
`packages/data-sources/adapters/<name>.ts`:

```ts
import { z } from "zod";
import { severityFromScore, toIso, type HazardEvent } from "@risksense/shared";
import {
  fetchWithTimeout,
  statusFor,
  type AdapterResult,
  type FetchContext,
  type HazardAdapter,
} from "../types.ts";

const ResponseSchema = z.object({
  /* describe the upstream payload exactly */
});

export class MyHazardAdapter implements HazardAdapter {
  readonly id = "my-source";
  readonly name = "My Source";
  readonly url = "https://example.org/";
  readonly license = "…";
  readonly hazards = ["flood"] as const;
  readonly refreshMinutes = 30;
  readonly requiresKey = false;

  async fetch(ctx: FetchContext): Promise<AdapterResult> {
    try {
      const res = await fetchWithTimeout("https://example.org/api", {
        timeoutMs: 12_000,
        signal: ctx.signal,
        cache: "no-store",
      });
      if (!res.ok) {
        return { events: [], status: statusFor(this, "degraded", { message: `HTTP ${res.status}` }) };
      }
      const parsed = ResponseSchema.safeParse(await res.json());
      if (!parsed.success) {
        return {
          events: [],
          status: statusFor(this, "degraded", { message: "Response failed schema validation" }),
        };
      }
      const events: HazardEvent[] = parsed.data.items.map((item) => ({
        id: `${this.id}:${item.id}`,
        hazard: "flood",
        title: item.title,
        lat: item.lat,
        lon: item.lon,
        detectedAt: toIso(item.time),
        ingestedAt: new Date().toISOString(),
        source: { id: this.id, name: this.name, url: this.url, license: this.license },
        severity: severityFromScore(0.5, "source-reported severity"),
        confidence: { level: "medium", basis: "Published by an official agency" },
        status: "detected",
        isDetection: false,
      }));
      return {
        events,
        status: statusFor(this, "ok", { lastSuccessAt: new Date().toISOString(), eventCount: events.length }),
      };
    } catch (e) {
      return {
        events: [],
        status: statusFor(this, "unavailable", {
          message: e instanceof Error ? e.message : "unknown error",
        }),
      };
    }
  }
}
```

Then register it in `packages/data-sources/registry.ts`:

```ts
export const ADAPTERS: HazardAdapter[] = [
  /* … */
  new MyHazardAdapter(),
];
```

Checklist:

- [ ] Access terms reviewed and automated retrieval permitted
- [ ] Upstream payload parsed with a schema
- [ ] Coordinates, severity and status taken only from the source
- [ ] `isDetection` set truthfully
- [ ] Failure returns a status instead of throwing
- [ ] Registered in the registry
- [ ] Row added to [data-sources.md](data-sources.md)
- [ ] Fixture test added

## Testing

Tests run on `node:test` against the real adapter and engine code with recorded
fixtures — no mocks of the modules under test.

```bash
npm run test
```

Write tests for:

- adapter normalization from a recorded payload (including a malformed one);
- de-duplication across two sources;
- severity and confidence mapping at the boundaries;
- filtering and alert matching.

## Optional persistence

Supabase is used only for community reports. Copy `.env.example` to `.env.local`
and set the Supabase variables to enable it. Without them, reports use an
in-memory store and the UI states that they are not persisted.

Apply the schema:

```bash
supabase db push          # or run the SQL in supabase/migrations/
```

## Headless ingestion

`services/ingestion` runs the same adapters without a browser, useful for a cron
job that writes snapshots to disk or a database.

```bash
npm run ingest
```

## Style and review

See [CONTRIBUTING.md](../CONTRIBUTING.md). In short: TypeScript strict, no
provider-specific logic outside adapters, comments that explain why, and no mock
data anywhere near the production event feed.
