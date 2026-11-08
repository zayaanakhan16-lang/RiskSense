# Architecture

## Overview

RiskSense is a monorepo with one deployable web application, three internal
packages, and an optional headless ingestion service. The design goal is that
**adding a hazard source never requires touching the map, the feed, the alert
engine or the API**.

```
                       ┌──────────────────────────────┐
                       │  packages/shared             │
                       │  HazardEvent · severity ·    │
                       │  freshness · geo · emergency │
                       └──────────────┬───────────────┘
                                      │ types
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────┐          ┌────────────────────┐        ┌──────────────────┐
│ data-sources  │          │   hazard-engine    │        │   apps/web       │
│ adapters +    │─────────▶│ aggregate · dedupe │───────▶│ map · feed ·     │
│ registry      │  events  │ filter · stats     │        │ alerts · API     │
└───────────────┘          └────────────────────┘        └──────────────────┘
        ▲                                                          ▲
        │ same adapters                                            │
┌───────────────┐                                          ┌───────┴────────┐
│ services/     │                                          │ supabase       │
│ ingestion     │                                          │ (optional)     │
└───────────────┘                                          └────────────────┘
```

## Packages

### `packages/shared`

The vocabulary of the platform. Contains no I/O and no framework code.

| Module | Responsibility |
| --- | --- |
| `types.ts` | `HazardEvent`, `SourceRef`, `SourceStatus`, `Severity`, `Confidence`, `EventStatus`, `EventsResponse` |
| `hazards.ts` | Canonical hazard families, labels, colours, icons, descriptions |
| `severity.ts` | Severity and confidence levels, score mapping, colour ramp, urgency test |
| `freshness.ts` | Classifies an event or feed against its documented cadence |
| `geo.ts` | Distance, grid clustering with a span bound, bounding-box helpers |
| `units.ts` | Coordinate, magnitude, distance and number formatting; haversine |
| `emergency-data.ts` | Country-specific emergency directory with verification status |
| `countries.ts` | ISO-3166-1 reference used for labels, flags and country statistics |

### `packages/data-sources`

One adapter per source, plus a registry. An adapter's only job is to turn one
provider's payload into `HazardEvent[]` and a `SourceStatus`.

```ts
export interface HazardAdapter {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly license: string;
  readonly hazards: readonly HazardType[];
  readonly refreshMinutes: number;
  readonly requiresKey: boolean;
  fetch(ctx: FetchContext): Promise<AdapterResult>;
}
```

`registry.ts` is the single registration point:

```ts
export const ADAPTERS: HazardAdapter[] = [
  new UsgsEarthquakeAdapter(),
  new GdacsAdapter(),
  new NasaEonetAdapter(),
  new NwsAlertsAdapter(),
  new FirmsWildfireAdapter(),
];
```

Adapters must:

- parse upstream payloads with a schema, so a provider change becomes a reported
  `degraded` status rather than corrupt data;
- return a `SourceStatus` even on failure;
- never throw into the aggregation;
- set `isDetection` truthfully;
- preserve the raw payload under `raw` for transparency.

### `packages/hazard-engine`

Pure functions over `HazardEvent[]`. No network calls except in `aggregate.ts`.

| Function | Purpose |
| --- | --- |
| `aggregateEvents` | Fetches all adapters in parallel with per-source deadlines; returns events plus per-source status and warnings |
| `dedupe` | Collapses cross-source duplicates, keeping the primary source's record |
| `sortEvents` | Severity first, then recency |
| `applyFilter` | Time window, hazard, status, severity, source and text filters |
| `hazardStats`, `countryStats`, `activitySeries`, `sourceBreakdown` | Statistics computed only from retrieved events |
| `matchAlerts` | Matches events against user-configured areas and thresholds |

## Data flow

1. **Request.** A page or the client calls `GET /api/events?window=24`.
2. **Fan-out.** `aggregateEvents` calls every registered adapter in parallel,
   each with an `AbortController` deadline.
3. **Normalize.** Each adapter returns `HazardEvent[]` in the shared model.
4. **De-duplicate.** Records of the same hazard within ~25 km and one day are
   collapsed, keeping the record from the source that owns the data
   (primary agency > official warning service > global aggregator > curated
   compilation).
5. **Respond.** The envelope carries `generatedAt`, `windowHours`, `total`,
   `events`, per-source `sources` status and `warnings`.
6. **Render.** The map, live feed, observatory and alert engine all consume the
   same envelope. A failing source degrades that source only.

## Failure model

| Failure | Behaviour |
| --- | --- |
| Source times out | That source's events are omitted; its status is `unavailable` with the reason; a warning is added; other sources still render |
| Source returns an unexpected shape | Status is `degraded` with "Response failed schema validation" |
| Source has nothing in the window | Status is `ok` with an event count of zero |
| Source needs a key that is absent | The adapter uses its keyless path, or reports `unavailable` and says a key is required |
| Every source fails | The response is valid with zero events, all statuses reported, and warnings explaining why. The UI shows an error state, not an empty "all clear" |

The last row matters: the interface must never present a failed fetch as calm
conditions.

## Caching

- Route handlers set `cache-control` headers appropriate to the source cadence.
- The observatory page revalidates every five minutes.
- The FIRMS adapter holds parsed global archives in memory for ten minutes,
  because a single download is large and several browser sessions may request
  the same window.
- Upstream fetches use `cache: "no-store"` so Next.js does not serve stale hazard
  data from its own cache.

## Optional persistence

Supabase is optional and used only for community reports. The schema
(`supabase/migrations/`) stores reports separately from source events, with a
coarsened location, a moderation status, and row-level security. Without
credentials the app falls back to an in-memory store and says so in the UI.

## Client architecture

- `RiskSenseApp` is the single map-centric shell. Marketing and reference pages
  are static routes that reuse the same primitives.
- `MapView` is dynamically imported with SSR disabled; MapLibre needs the DOM.
- Map layers are generated from the hazard registry, so a new hazard family
  appears on the map without a new layer definition.
- `useEvents` polls the API and exposes loading, error and data states.
- `useAlerts` stores areas and rules in `localStorage` and matches them against
  real events on every refresh. Browser notifications are opt-in.
