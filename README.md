# RiskSense

**See the risk. Understand the danger. Act sooner.**

RiskSense is an open-source global emergency intelligence and early warning
platform. It collects hazard data that public agencies and open projects already
publish, normalizes it into a single event model, and presents it as a global
interactive map, a live event feed, and location-aware alerts — with the source,
the time, and the uncertainty always attached.

RiskSense informs people about danger and helps them reach appropriate
assistance. It is not an official alert channel and not a dispatch system.

- [What you can do](#what-you-can-do)
- [Product principles](#product-principles)
- [Quick start](#quick-start)
- [Architecture](#architecture)
- [Data sources](#data-sources)
- [API](#api)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## What you can do

- **Watch the world.** A MapLibre globe renders every hazard from every live
  source, with a per-hazard heat field and typed markers. Rotate, zoom, pan,
  switch between globe and flat projection, and search any city, region or
  country.
- **Read the live feed.** A floating activity panel lists real events with
  severity, confidence, status and data freshness, filterable by hazard,
  severity, source and time window (6 h / 24 h / 72 h / 7 days).
- **Open an event.** Every event has a detail view naming the source, the
  issuing authority where one exists, the coordinates, and an explicit
  satellite-detection label when that is what it is.
- **Report on this area.** Right-click the map (or long-press on touch) to report
  what you can see at that exact spot — fire, flooding, a blocked road, severe
  damage or a resource need. Reports are coarsened to about 1 km, stored as
  `pending`, marked unverified, and can never trigger a dispatch. They appear as
  their own pins and their own feed tab.
- **Alert an area.** Add the map view or a searched place to your personal
  alerts, choose the hazards and the minimum severity, and opt in to browser
  notifications. A quiet feed is never presented as proof of safety.
- **Reach help.** Emergency assistance resolves verified, country-specific
  numbers from your location, shows official guidance and maps nearby services.
  RiskSense never calls or dispatches for you: you confirm and place the call
  yourself, and an unverified location says so plainly.

## Product principles

1. **Real data only.** Every marker, feed entry and statistic comes from a live
   request to a named source. There is no mock event feed in the running product.
2. **Honest about uncertainty.** A satellite hotspot is labelled a detection, not
   a confirmed wildfire. Severity, confidence and status are three separate
   values, and each states its basis.
3. **Never invent a warning.** RiskSense does not use AI to generate
   coordinates, severity levels, statuses or emergency instructions, and never
   promotes an event to "official warning" on its own.
4. **Say when data is missing.** Unavailable, delayed and stale feeds are shown
   as such. A quiet map is explicitly not presented as proof of safety.
5. **No universal emergency number.** Emergency contacts are country-specific,
   verified where possible, and marked where they are not. RiskSense never dials
   on the user's behalf.
6. **Open and self-hostable.** Frontend, adapters, hazard engine, API and schema
   are all in this repository under Apache-2.0. No closed core, no proprietary
   service required to run it.

## Quick start

Requirements: Node.js 20 or newer.

```bash
git clone https://github.com/zayaanakhan16-lang/RiskSense.git
cd RiskSense
npm install
npm run dev
```

The app starts on <http://localhost:3000>. No API keys are needed: every
registered source has a keyless access path. See
[`.env.example`](.env.example) for optional configuration.

```bash
npm run build      # production build
npm run start      # run the production build
npm run typecheck  # TypeScript, no emit
npm run lint       # ESLint
npm run test       # unit tests (node:test)
npm run ingest     # headless snapshot of every source, written to ./data/local
```

### Optional configuration

| Variable | Purpose |
| --- | --- |
| `FIRMS_MAP_KEY` | NASA FIRMS area API key. Without it, the public FIRMS archives are used. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL for persisting community reports. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key. Without it, reports use an in-memory store. |
| `NEXT_PUBLIC_MAP_STYLE_URL` | Point the map at your own vector tile style. |

## Deploy

### Vercel (recommended)

RiskSense deploys to Vercel as-is — no keys required. Because this is an npm
workspaces monorepo, set the project **Root Directory** to `apps/web` when
importing the repository (the `apps/web/vercel.json` file configures the rest).

1. Push the repository to GitHub.
2. In Vercel, **Add New → Project** and import the repo.
3. Set **Root Directory** to `apps/web`.
4. Deploy. Add any optional variables from [`.env.example`](.env.example)
   under **Settings → Environment Variables**.

The API routes run on the Node.js runtime and are read-only public endpoints;
the free Hobby tier is sufficient.

### Self-hosting

```bash
npm install
npm run build
npm run start          # serves the production build on port 3000
```

## Architecture

RiskSense is a monorepo. The web app depends on three internal packages, and
each hazard source is a self-contained adapter.

```
risksense/
├── apps/web/                 Next.js 15 App Router: map, panels, API routes
│   └── src/
│       ├── app/              Pages and route handlers
│       ├── components/       Map, panels, controls, UI primitives
│       ├── hooks/            Client data hooks (events, alerts, storage)
│       └── lib/              Map style, icons, i18n, formatting, Overpass
├── packages/
│   ├── shared/               Event model, hazards, severity, geo, emergency data
│   ├── data-sources/         One adapter per hazard source + registry
│   └── hazard-engine/        Aggregation, de-duplication, filtering, statistics
├── services/ingestion/       Headless ingestion runner (same adapters)
├── supabase/migrations/      Optional persistence schema
├── docs/                     Architecture, data sources, API, deployment
└── .github/                  Workflows, issue templates, PR template
```

The data path is a straight line:

```
source API ──▶ adapter ──▶ normalized HazardEvent ──▶ aggregation ──▶ API route
                                                              │
                                                     map · feed · alerts · stats
```

Because every adapter converts to the same `HazardEvent`, the map, the live
feed, the alert engine and the observatory never contain source-specific logic.
Adding a hazard source is one new file plus one registry line.

See [docs/architecture.md](docs/architecture.md) for the full design.

## Data sources

| Source | Hazards | Cadence | Key |
| --- | --- | --- | --- |
| [USGS Earthquake Hazards Program](https://earthquake.usgs.gov/) | Earthquake | ~5 min | No |
| [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/) (VIIRS/MODIS thermal anomalies) | Wildfire | ~3 h | Optional |
| [NASA EONET](https://eonet.gsfc.nasa.gov/) | Wildfire, flood, storm, volcano, drought, landslide, industrial, heat, air quality | ~1 h | No |
| [GDACS](https://www.gdacs.org/) (EC JRC / UN OCHA) | Earthquake, cyclone, flood, volcano, wildfire, drought | ~1 h | No |
| [NOAA / National Weather Service](https://api.weather.gov/) | Severe weather, flood, cyclone, heat, air quality, wildfire | ~5 min | No |

Supporting services: OpenFreeMap / OpenStreetMap (basemap),
Open-Meteo (geocoding), Nominatim (reverse geocoding),
Overpass API (nearby emergency services).

Licenses, attribution requirements and per-source limitations are documented in
[docs/data-sources.md](docs/data-sources.md) and served at `/api/sources`.

## API

Public, read-only, no key. Full reference at
[docs/api.md](docs/api.md); machine-readable OpenAPI 3.1 at `/api/openapi`.

| Endpoint | Description |
| --- | --- |
| `GET /api/events` | Normalized hazard events from every registered source |
| `GET /api/stats` | Observatory statistics computed from retrieved events |
| `GET /api/sources` | Source directory with licenses and cadences |
| `GET /api/emergency?country=AU` | Verified country-specific emergency numbers |
| `GET /api/geocode?q=Tokyo` | Forward geocoding |
| `GET /api/geocode?lat=&lon=` | Reverse geocoding |
| `GET /api/archive` | Historical events (USGS date-ranged query) |
| `GET`/`POST /api/reports` | Community reports (unverified, rate limited) |
| `GET /api/openapi` | OpenAPI 3.1 specification |

```bash
curl 'http://localhost:3000/api/events?window=24&hazard=earthquake'
```

## Documentation

| Document | Contents |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | System design and data flow |
| [docs/data-sources.md](docs/data-sources.md) | Every source, license and limitation |
| [docs/api.md](docs/api.md) | Endpoint reference and event schema |
| [docs/deployment.md](docs/deployment.md) | Self-hosting and deployment |
| [docs/development.md](docs/development.md) | Local setup, tests, adding a source |
| [docs/limitations.md](docs/limitations.md) | Data freshness, gaps and honest caveats |

In-app pages mirror this material: `/how-it-works`, `/methodology`, `/sources`,
`/observatory`, `/archive`, `/api-docs`, `/faq`, `/about`, `/contribute`.

## Contributing

Contributions are welcome — especially new, well-documented hazard adapters and
corrections to emergency contact data. Start with
[CONTRIBUTING.md](CONTRIBUTING.md), and follow
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Security reports go through
[SECURITY.md](SECURITY.md).

## License

Source code is licensed under the [Apache License 2.0](LICENSE).

Data remains the property of the publishing agencies and is subject to their own
terms. Open-source code does not make third-party data open for unrestricted
redistribution; see [docs/data-sources.md](docs/data-sources.md).

## Acknowledgements

RiskSense builds on public data from USGS, NASA (FIRMS and EONET), GDACS
(European Commission JRC and UN OCHA), and NOAA/National Weather Service, and on
OpenStreetMap and OpenFreeMap for the map. The product concept was inspired by
wildfire-monitoring tools such as
[FireSight](https://github.com/theyapguard/FireSight); RiskSense is an
independent, multi-hazard implementation and shares no code or branding with it.
