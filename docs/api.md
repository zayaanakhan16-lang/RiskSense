# API reference

RiskSense exposes a public, read-only API over normalized hazard events. It needs
no key, returns no private user data, and never includes provider credentials.

- Base path: `/api`
- Content type: `application/json`
- Machine-readable specification: `GET /api/openapi` (OpenAPI 3.1)
- CORS: public read-only endpoints send `access-control-allow-origin: *`

## Endpoints

### `GET /api/events`

Normalized hazard events aggregated from every registered source.

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `window` | `6` \| `24` \| `72` \| `168` | `24` | Time window in hours |
| `hazard` | hazard id | all | Repeatable or comma-separated |
| `minSeverity` | `minor` \| `moderate` \| `severe` \| `extreme` | none | Minimum severity |
| `source` | source id | all | Repeatable or comma-separated |
| `status` | event status | all | `detected`, `review`, `confirmed`, `warning`, `resolved` |
| `q` | string | none | Free-text match on title, place and description |
| `limit` | integer | `1500` | Maximum events returned |

```bash
curl 'http://localhost:3000/api/events?window=24&hazard=earthquake&minSeverity=moderate'
```

Response:

```jsonc
{
  "generatedAt": "2026-11-08T06:41:09.512Z",
  "windowHours": 24,
  "total": 1214,
  "events": [ /* HazardEvent[] */ ],
  "sources": [ /* SourceStatus[] */ ],
  "warnings": ["nasa-firms: No detections in the public 24h/7d archives"]
}
```

A failing source never fails the whole response. Its events are omitted, its
entry in `sources` reports `unavailable` or `degraded` with a reason, and a
warning is appended.

### `GET /api/stats`

Observatory statistics computed from the retrieved events.

| Parameter | Type | Default |
| --- | --- | --- |
| `window` | `6` \| `24` \| `72` \| `168` | `72` |

Returns per-hazard counts, per-country counts, a daily activity series, and a
per-source breakdown. Every figure is computed from the events actually
retrieved — nothing is estimated.

### `GET /api/sources`

The source directory: id, name, URL, license, hazards, documented cadence,
whether a key is required, and the current status of each feed. Cached for an
hour.

### `GET /api/emergency`

Verified, country-specific emergency numbers.

| Parameter | Type | Notes |
| --- | --- | --- |
| `country` | ISO-3166-1 alpha-2 | Optional |

```bash
curl 'http://localhost:3000/api/emergency?country=AU'
```

```jsonc
{
  "country": "AU",
  "entry": {
    "code": "AU",
    "country": "Australia",
    "numbers": { "general": "000", "note": "112 from mobile." },
    "source": "https://www.triplezero.gov.au/",
    "verified": true
  },
  "lastReviewed": "2026-11-01"
}
```

Without `country`, the full directory is returned. If a country is absent or
unverified, the response says so explicitly rather than guessing a number.

### `GET /api/geocode`

Forward or reverse geocoding.

| Mode | Parameters |
| --- | --- |
| Forward | `q=<place name>` |
| Reverse | `lat=<latitude>&lon=<longitude>` |

Forward search uses Open-Meteo geocoding; reverse lookup uses Nominatim and
returns the country code, which the UI uses for emergency contacts and alert
context.

### `GET /api/archive`

Historical events. Backed by a live USGS date-ranged query.

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `from` | ISO date | 30 days ago | Start of range |
| `to` | ISO date | now | End of range |
| `minMagnitude` | number | `4.5` | Minimum magnitude |

Ranges longer than 90 days return `400 RANGE_TOO_LARGE`.

### `GET /api/reports`

Recent community reports. These are **unverified** and stored separately from
source events. The anonymous `reporterToken` is never included in this response.

| Parameter | Type | Default |
| --- | --- | --- |
| `limit` | integer | `100` (maximum `200`) |

```jsonc
{
  "count": 1,
  "disclaimer": "Community reports are unverified citizen submissions. …",
  "reports": [
    {
      "id": "3e871630-4130-4826-b78f-a52b574dc599",
      "category": "flooding-observed",
      "lat": 51.51,
      "lon": -0.13,
      "description": "Road under water near the junction.",
      "createdAt": "2026-11-08T05:30:00.000Z",
      "status": "pending",
      "verified": false
    }
  ]
}
```

### `POST /api/reports`

Submit a community report. Fields follow the request schema below; `lat` and
`lon` are rounded to about one kilometre before storage.

```jsonc
{
  "category": "flooding-observed",
  "lat": 51.5074,
  "lon": -0.1278,
  "description": "Road under water near the junction.",
  "place": "optional nearby landmark",
  "photoUrl": "https://example.org/photo.jpg"
}
```

Responses:

- `201` — stored, `status: "pending"`, with the created report
- `202` — accepted without storing (honeypot field filled)
- `400` — validation failure, with a `details` array
- `429` — rate limit exceeded, with `retryAfterSeconds`

Reports are coarsened to roughly one kilometre before storage, are always stored
as `pending`, and can never trigger an automated dispatch.

### `GET /api/openapi`

The OpenAPI 3.1 document describing all of the above.

## The event schema

```ts
interface HazardEvent {
  id: string;                  // "<source-id>:<native-id>", deterministic
  hazard: HazardType;
  title: string;
  description?: string;
  lat: number;
  lon: number;
  place?: string;
  countryCode?: string;        // ISO-3166-1 alpha-2, when derivable
  detectedAt: string;          // ISO 8601 UTC
  updatedAt?: string;
  ingestedAt: string;          // when RiskSense retrieved it
  source: {
    id: string;
    name: string;
    url: string;
    recordUrl?: string;        // link to the original record
    license: string;
  };
  severity: { level: SeverityLevel; score: number; basis: string };
  confidence: { level: ConfidenceLevel; score?: number; basis: string };
  status: EventStatus;
  geometry?: PointGeometry | BboxGeometry | PolygonGeometry;
  measurement?: { label: string; value: number; unit: string };
  depthKm?: number;
  isDetection: boolean;        // true for remote-sensing detections
  issuingAuthority?: string;
  officialGuidance?: string;   // verbatim, from the authority
  raw?: Record<string, unknown>;
}
```

Enumerations:

- `hazard`: `wildfire`, `flood`, `earthquake`, `severe-weather`, `cyclone`,
  `volcano`, `extreme-heat`, `air-quality`, `drought`, `landslide`, `industrial`
- `SeverityLevel`: `minor`, `moderate`, `severe`, `extreme`
- `ConfidenceLevel`: `low`, `medium`, `high`
- `EventStatus`: `detected`, `review`, `confirmed`, `warning`, `resolved`

`severity.basis` and `confidence.basis` are not decoration. They state the
measurement or reason behind the value, so a consumer can judge it. `isDetection`
must be honoured: a detection is not a confirmed incident.

## Error handling

Errors are JSON with a stable machine-readable `error` code.

| Status | Code | Meaning |
| --- | --- | --- |
| `400` | `INVALID_DATE_RANGE` | An archive date could not be parsed |
| `400` | `FROM_AFTER_TO` | Archive start is after end |
| `400` | `RANGE_TOO_LARGE` | Archive range exceeds 90 days |
| `400` | `VALIDATION_FAILED` | A report body failed validation |
| `404` | `NOT_FOUND` | Unknown resource |
| `429` | `RATE_LIMITED` | Too many reports from this client |
| `502` | `UPSTREAM_ERROR` | A required upstream service failed |

```jsonc
{ "error": "RANGE_TOO_LARGE", "maxDays": 90 }
```

Partial failure is not an error. If some sources fail, `/api/events` still
returns `200` and reports the failures in `sources` and `warnings`.

## Attribution

Data belongs to the publishing agencies. If you build on this API:

1. Preserve the `source` object in your output.
2. Link to `source.recordUrl` where present.
3. Honour each source's terms. See [data-sources.md](data-sources.md).

## Example: a small consumer

```ts
const res = await fetch("https://your-risksense.example/api/events?window=24");
const { events, warnings } = await res.json();

for (const e of events) {
  const kind = e.isDetection ? "detection" : "reported event";
  console.log(
    `${e.title} (${kind}) — ${e.severity.level}, basis: ${e.severity.basis}`,
    `— source: ${e.source.name} ${e.source.recordUrl ?? ""}`,
  );
}
```
