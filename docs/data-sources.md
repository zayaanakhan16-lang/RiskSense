# Data sources

Every hazard in RiskSense comes from a named public source. This document records
what each source provides, its update cadence, its license, and its limitations.

> **Open-source code does not make third-party data open.** Each source remains
> governed by its own terms. RiskSense presents the data with attribution and
> links back to the original record. If you redistribute RiskSense data, check
> each source's terms first.

## Registered hazard sources

### USGS Earthquake Hazards Program

- **URL:** <https://earthquake.usgs.gov/fdsnws/event/1/>
- **Adapter:** `packages/data-sources/adapters/usgs-earthquakes.ts`
- **Hazards:** earthquake
- **Cadence:** feeds refresh about every minute; records are revised as reviews
  complete
- **Key:** not required
- **License:** public domain (U.S. Government work)
- **Fields used:** magnitude, place, time, updated, depth, review status,
  significance, tsunami flag, felt reports, MMI
- **Severity basis:** magnitude, mapped through an anchored scale (M 2 → minor,
  M 7.5+ → extreme)
- **Confidence basis:** `reviewed` events are high confidence; automatic
  solutions are marked as pending review
- **Limitations:** the `place` string is free text; country attribution is
  derived from a trailing two-letter US state code, so non-US events may lack a
  country. Depth and magnitude are revised after publication.
- **History:** USGS genuinely serves date-ranged queries, which is why
  `/api/archive` can offer an honest archive for this hazard.

### NASA FIRMS — VIIRS and MODIS thermal anomalies

- **URL:** <https://firms.modaps.eosdis.nasa.gov/>
- **Adapter:** `packages/data-sources/adapters/firms-wildfire.ts`
- **Hazards:** wildfire
- **Cadence:** NRT archives are updated several times a day
- **Key:** optional. With `FIRMS_MAP_KEY`, the area API is queried per satellite
  for the exact window. Without it, the public global 24h/7d CSV archives are
  used.
- **License:** NASA FIRMS data is free and open; see the FIRMS data policy for
  attribution
- **Fields used:** latitude, longitude, acquisition date and time, satellite,
  instrument, confidence, fire radiative power
- **Processing:**
  - detections within 15 km are clustered into fire complexes, bounded so a
    single complex cannot chain across hundreds of kilometres;
  - severity uses **peak per-pixel** FRP, calibrated per instrument, because MODIS
    reports roughly three times the FRP of VIIRS for the same fire;
  - confidence reflects the share of high-confidence pixels and the number of
    independent instruments observing the complex;
  - the most intense complexes are capped per request, and the cap is disclosed
    in the source status message.
- **Limitations — read this before interpreting a marker:**
  - A FIRMS record is a **satellite thermal anomaly detection, not a confirmed
    wildfire.** Gas flares, agricultural burning, industrial plant, and hot rock
    all register.
  - Detection is not instantaneous: a satellite observes a location only on
    overpasses, so a detection's timestamp is when it was observed, not when the
    fire started.
  - Cloud, smoke and canopy cover cause under-detection.
  - Clustering is a presentation choice; a complex is a group of detections, not
    an official incident boundary.

### NASA EONET — Earth Observatory Natural Event Tracker

- **URL:** <https://eonet.gsfc.nasa.gov/>
- **Adapter:** `packages/data-sources/adapters/nasa-eonet.ts`
- **Hazards:** wildfire, flood, earthquake, severe weather, volcano, drought,
  landslide, industrial, extreme heat, air quality
- **Cadence:** roughly hourly
- **Key:** not required
- **License:** NASA open data
- **Fields used:** event id, title, category, geometry (point or polygon),
  latest observation date, source links
- **Limitations:** EONET is a **curated** catalogue. It republishes events that
  primary agencies already publish, and its event set is far smaller than the
  underlying feeds. RiskSense keeps the primary source's record when the same
  event appears in both. EONET may include `Reference`-only entries without a
  plotted geometry; those are skipped and counted in the source status.

### GDACS — Global Disaster Alert and Coordination System

- **URL:** <https://www.gdacs.org/>
- **Adapter:** `packages/data-sources/adapters/gdacs.ts`
- **Hazards:** earthquake, cyclone, flood, volcano, wildfire, drought
- **Cadence:** roughly hourly
- **Key:** not required
- **License:** European Commission JRC / UN OCHA; see GDACS terms of use
- **Fields used:** event id, type, alert level (green/orange/red), magnitude,
  country, coordinates, from/to dates, description
- **Severity basis:** the GDACS alert level, which is the issuing body's own
  assessment
- **Limitations:** GDACS covers significant events, not all events. Its alert
  level is an impact estimate produced by the issuing body; RiskSense presents it
  as such and does not reinterpret it.

### NOAA / National Weather Service alerts

- **URL:** <https://api.weather.gov/>
- **Adapter:** `packages/data-sources/adapters/nws-alerts.ts`
- **Hazards:** severe weather, flood, cyclone, extreme heat, air quality,
  wildfire
- **Cadence:** near real time
- **Key:** not required (a descriptive `User-Agent` is sent)
- **License:** public domain (U.S. Government work)
- **Fields used:** alert id, event name, severity, certainty, urgency, onset,
  expires, headline, description, instruction, affected zones, geocodes
- **Severity basis:** the NWS `severity` field (Extreme/Severe/Moderate/Minor)
- **Status:** NWS alerts map to `warning` status, and the issuing authority is
  recorded
- **Limitations:**
  - **Coverage is the United States and its territories only.** RiskSense does
    not present these alerts as global.
  - Many alerts are zone-based without published geometry. Those are skipped
    rather than placed at a guessed point, and the count of skipped alerts is
    reported in the source status.

## Supporting services (not hazard sources)

| Service | Used for | License |
| --- | --- | --- |
| OpenFreeMap vector tiles | Basemap style and tiles | OpenFreeMap terms; data © OpenStreetMap contributors (ODbL) |
| Open-Meteo geocoding | Place search | Open-Meteo terms (non-commercial tier; check terms for your deployment) |
| Nominatim (OpenStreetMap) | Reverse geocoding for country detection | Nominatim usage policy; data © OpenStreetMap contributors |
| Overpass API | Nearby mapped hospitals, fire stations, police stations | Overpass usage policy; data © OpenStreetMap contributors |

Overpass results are **directory listings from OpenStreetMap**, not availability
information. A mapped hospital may be closed or unreachable; RiskSense says so in
the panel.

## Data freshness

Each source declares a documented refresh cadence (`refreshMinutes`). RiskSense
classifies an event or a feed by comparing its age against that cadence:

| State | Meaning |
| --- | --- |
| `fresh` | Within the expected cadence |
| `aging` | Between one and two expected intervals |
| `stale` | More than two expected intervals |
| `expired` | Far beyond the expected cadence |

This prevents two common errors: calling a slow feed broken, and calling a fast
feed healthy when it has silently stopped.

## Sources deliberately not integrated

| Source | Why not |
| --- | --- |
| Copernicus EMS / GloFAS flood layers | Access terms and delivery formats need review before automated use; flood coverage currently comes from GDACS, EONET and NWS |
| Air-quality station networks | Station data is regionally fragmented and often requires per-network keys |
| Social-media signals | Unverifiable, and unsuitable as a hazard record in a public-safety tool |

If you add one of these, follow [CONTRIBUTING.md](../CONTRIBUTING.md) and record
the license and limitations here.

## Adding a source

See [development.md](development.md#adding-a-hazard-source). In short: one
adapter file, one registry line, one documentation row, one test.
