# Data freshness and limitations

This page exists because a public-safety tool that hides its gaps is more
dangerous than one that shows them.

## The core caveat

**RiskSense shows what its sources report. It does not show what is happening.**
When the map is quiet, that can mean any of the following:

1. Nothing has been detected.
2. A feed has nothing new in the selected window.
3. A feed is delayed, degraded or unavailable.
4. The hazard type is not covered in that region.

The source panel distinguishes these. A quiet map is never labelled safe.

## Per-source freshness

Each source declares a documented refresh cadence, and RiskSense classifies the
age of an event against it.

| Source | Cadence | Notes |
| --- | --- | --- |
| USGS earthquakes | ~1–5 min | Records are revised after review |
| NOAA / NWS alerts | Near real time | US coverage only |
| GDACS | ~1 h | Significant events only |
| NASA EONET | ~1 h | Curated subset of primary feeds |
| NASA FIRMS | Several times a day | Depends on satellite overpasses |

Consequences to keep in mind:

- A FIRMS detection timestamp is the **observation** time of a satellite
  overpass, not the start of a fire.
- GDACS and EONET lag the primary agency by design, because curation takes time.
- NWS alert counts fluctuate with weather, not with system health.

## Coverage is uneven, and that is honest

RiskSense covers the world for its global sources and only specific regions for
its national ones.

| Hazard | Global coverage | Notes |
| --- | --- | --- |
| Earthquake | Yes | USGS, plus GDACS for significant events |
| Wildfire | Yes | FIRMS satellite detections worldwide; EONET and GDACS add curated events |
| Flood | Partial | GDACS, EONET and US NWS; no global real-time flood gauge network is integrated |
| Severe weather | Partial | NWS covers the United States and territories; other national services are not yet integrated |
| Cyclone | Yes | GDACS tracks tropical cyclones globally |
| Volcano | Yes | GDACS and EONET |
| Drought | Limited | EONET and GDACS only; drought is slow-onset and poorly represented in event feeds |
| Extreme heat | Limited | Only where an official warning service publishes it |
| Air quality | Limited | Only where an official warning service publishes it |
| Landslide | Limited | EONET only |
| Industrial | Limited | EONET only |

A hazard with no marker in your region may simply be unmonitored.

## What each value means, and what it does not

| Value | Means | Does not mean |
| --- | --- | --- |
| Severity | Intensity derived from a measurement the source published, with the basis stated | Impact on people, or official classification |
| Confidence | How much to trust the record itself | How dangerous the event is |
| Status | Position in the lifecycle, from detected to resolved | A judgement RiskSense made on its own |
| `isDetection` | The record came from remote sensing | A confirmed incident |

Only an issuing authority can classify an event as an official warning, and
RiskSense never does so itself.

## Satellite fire detections in particular

FIRMS detections include, in addition to wildfires:

- gas flares and refinery stacks;
- agricultural and land-management burning;
- industrial plant and smelters;
- hot rock and bare ground in strong sunlight.

A cluster of detections is a group of thermal anomalies, not an incident
boundary. RiskSense labels every FIRMS record as a satellite detection and never
promotes it to "confirmed".

## Statistics

Every number in the observatory is computed from the events actually retrieved.
That makes the numbers honest, and it also makes them a sample rather than a
census. A hazard type with few events may be under-reported rather than rare.
Long-duration events such as droughts fall outside short windows entirely: a
24-hour window contains their latest update, not their onset.

## Emergency contacts

Emergency numbers vary by country and by region within a country, and they
change. RiskSense marks each entry with the authority it was verified against and
whether that verification succeeded. Where it could not verify a number, it says:

> Emergency contact not verified for this location.

RiskSense never dials on your behalf, never dispatches a responder, and never
claims to have contacted anyone. In an emergency, call your local emergency
service directly.

## Community reports

Citizen reports are **unverified** until a moderator reviews them. They are rate
limited, coarsened in location for privacy, and stored separately from source
events. They can never trigger an automated dispatch, and they are not evidence
that an event has been confirmed.

## What RiskSense will not do

- It will not invent events, coordinates, severity or instructions.
- It will not use AI to promote a detection to a confirmed incident.
- It will not present a forecast as an emergency warning.
- It will not tell you that you are safe.

## Reporting a data problem

If you find an event that is wrong, missing, or misleading, open an issue with
the event id and the source. Corrections to source data are the most valuable
contributions this project receives.
