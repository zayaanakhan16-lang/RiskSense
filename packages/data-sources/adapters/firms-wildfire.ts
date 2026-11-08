import {
  bboxRadiusKm,
  clusterByDistance,
  confidenceFromScore,
  severityFromScore,
  toIso,
  type ConfidenceLevel,
  type HazardEvent,
} from "@risksense/shared";
import { fetchWithTimeout, statusFor, type AdapterResult, type FetchContext, type HazardAdapter } from "../types.ts";

/**
 * NASA FIRMS — Fire Information for Resource Management System.
 * Docs: https://firms.modaps.eosdis.nasa.gov/
 *
 * Two access paths:
 *  1. With FIRMS_MAP_KEY, the area API is queried per satellite for the exact
 *     requested window (https://firms.modaps.eosdis.nasa.gov/api/area/).
 *  2. Without a key, RiskSense falls back to the public global NRT archives
 *     (24h / 7d), which require no key and cover the whole planet.
 *
 * A FIRMS record is a *satellite thermal anomaly detection* — not a confirmed
 * wildfire. RiskSense labels it accordingly and never promotes it to "confirmed".
 */

const AREA_API = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";
const ARCHIVE = "https://firms.modaps.eosdis.nasa.gov/data/active_fire";

/** Key-based sources, requested together when FIRMS_MAP_KEY is present. */
const KEYED_SOURCES = ["VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT", "VIIRS_SNPP_NRT"];

/**
 * Keyless public archives. Each entry names the 24-hour and 7-day CSV for one
 * instrument; the adapter downloads only the set that covers the requested
 * window. Filenames are the exact ones published under /data/active_fire/.
 */
const ARCHIVE_SOURCES: {
  instrument: string;
  day1: string;
  day7: string;
}[] = [
  {
    instrument: "VIIRS (NOAA-20)",
    day1: "noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_24h.csv",
    day7: "noaa-20-viirs-c2/csv/J1_VIIRS_C2_Global_7d.csv",
  },
  {
    instrument: "VIIRS (NOAA-21)",
    day1: "noaa-21-viirs-c2/csv/J2_VIIRS_C2_Global_24h.csv",
    day7: "noaa-21-viirs-c2/csv/J2_VIIRS_C2_Global_7d.csv",
  },
  {
    instrument: "MODIS (Aqua/Terra)",
    day1: "modis-c6.1/csv/MODIS_C6_1_Global_24h.csv",
    day7: "modis-c6.1/csv/MODIS_C6_1_Global_7d.csv",
  },
];

/**
 * Upper bound on fire complexes returned per request. The 7-day archives hold
 * several hundred thousand pixels; without a cap the feed would be unusable and
 * the API response enormous. Clusters are ranked by fire radiative power, so the
 * cap keeps the most intense fires, and the status message states the cap openly.
 */
const MAX_COMPLEXES = 1200;

/** Parsed-archive cache, keyed by "24h" / "7d". */
const ARCHIVE_CACHE_TTL_MS = 10 * 60 * 1000;
const archiveCache = new Map<string, { at: number; pixels: Pixel[] }>();

interface Pixel {
  lat: number;
  lon: number;
  frp: number;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  satellite: string;
  detectedAt: string;
  instrument: string;
}

/** VIIRS confidence ships as a letter in the NRT CSVs and as a percentage in some archives. */
function parseConfidence(raw: string): { level: ConfidenceLevel; score: number } {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "h" || value === "high") return { level: "high", score: 0.9 };
  if (value === "l" || value === "low") return { level: "low", score: 0.3 };
  if (value === "n" || value === "nominal") return { level: "medium", score: 0.6 };
  const num = Number.parseFloat(value);
  if (Number.isFinite(num)) {
    const pct = num <= 1 ? num * 100 : num;
    if (pct >= 80) return { level: "high", score: 0.9 };
    if (pct >= 50) return { level: "medium", score: 0.6 };
    return { level: "low", score: 0.3 };
  }
  return { level: "low", score: 0.3 };
}

function parseCsv(text: string, instrument: string): Pixel[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim());
  const col = (name: string) => header.indexOf(name);
  const iLat = col("latitude");
  const iLon = col("longitude");
  const iDate = col("acq_date");
  const iTime = col("acq_time");
  const iSat = col("satellite");
  const iConf = col("confidence");
  const iFrp = col("frp");
  if (iLat < 0 || iLon < 0 || iDate < 0 || iTime < 0) return [];

  const pixels: Pixel[] = [];
  for (let k = 1; k < lines.length; k++) {
    const f = lines[k].split(",");
    const lat = Number.parseFloat(f[iLat]);
    const lon = Number.parseFloat(f[iLon]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const hhmm = (f[iTime] ?? "").padStart(4, "0");
    const time = `${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}:00Z`;
    const detectedAt = toIso(`${f[iDate]}T${time}`);
    const conf = parseConfidence(f[iConf] ?? "");
    const frp = Number.parseFloat(f[iFrp] ?? "0");
    pixels.push({
      lat,
      lon,
      frp: Number.isFinite(frp) && frp > 0 ? frp : 0,
      confidence: conf.level,
      confidenceScore: conf.score,
      satellite: f[iSat] ?? "unknown",
      detectedAt,
      instrument,
    });
  }
  return pixels;
}

/**
 * Fire intensity from *peak per-pixel* fire radiative power.
 *
 * Two honest-measurement rules are applied here.
 *
 * 1. Peak, not sum. FRP is a per-pixel quantity: one VIIRS pixel above
 *    ~100 MW is an intensely burning front. Summing a cluster's FRP would
 *    instead scale with cluster size, so a wide, mild burn would outrank a
 *    small, violent one. Peak intensity is what the physics supports.
 *
 * 2. Per-instrument calibration. MODIS and VIIRS report FRP on different
 *    scales — the same fire reads roughly three times higher in MODIS — so a
 *    single threshold would systematically over-rate every MODIS detection.
 *    Each instrument is therefore mapped through its own reference points,
 *    taken from the published FRP distribution for that instrument.
 */
const INTENSITY_REFERENCE: Record<string, { moderate: number; extreme: number }> = {
  "VIIRS (NOAA-20)": { moderate: 15, extreme: 300 },
  "VIIRS (NOAA-21)": { moderate: 15, extreme: 300 },
  "MODIS (Aqua/Terra)": { moderate: 50, extreme: 900 },
};

const DEFAULT_REFERENCE = { moderate: 20, extreme: 400 };

/**
 * Maps peak per-pixel FRP to 0..1, log-interpolating between the instrument's
 * "moderate" and "extreme" reference points. Values at or below the moderate
 * point stay in the minor band rather than being floored to a hard zero, and
 * values beyond the extreme point saturate.
 */
function frpSeverity(peakFrp: number, instrument: string): number {
  if (peakFrp <= 0) return 0.12;
  const ref = INTENSITY_REFERENCE[instrument] ?? DEFAULT_REFERENCE;
  const ratio =
    (Math.log10(peakFrp + 1) - Math.log10(ref.moderate)) /
    (Math.log10(ref.extreme) - Math.log10(ref.moderate));
  // Anchor: the instrument's "moderate" FRP sits at 0.32, "extreme" at 0.95.
  const score = 0.32 + ratio * (0.95 - 0.32);
  return Math.max(0.1, Math.min(1, score));
}

export class FirmsWildfireAdapter implements HazardAdapter {
  readonly id = "nasa-firms";
  readonly name = "NASA FIRMS (VIIRS thermal anomalies)";
  readonly url = "https://firms.modaps.eosdis.nasa.gov/";
  readonly license =
    "NASA FIRMS data is free and open; see the FIRMS data policy for attribution";
  readonly hazards = ["wildfire"] as const;
  readonly refreshMinutes = 180;
  readonly requiresKey = false;

  async fetch(ctx: FetchContext): Promise<AdapterResult> {
    const key = ctx.keys.firmsMapKey;
    const pixels = key ? await this.fetchKeyed(key, ctx) : await this.fetchArchive(ctx);

    if (pixels.length === 0) {
      return {
        events: [],
        status: statusFor(this, "degraded", {
          message: key
            ? "FIRMS area API returned no detections for this window"
            : "No detections in the public 24h/7d archives",
        }),
      };
    }

    // Collapse adjacent pixels into fire complexes (~15 km) so a large fire is
    // one marker rather than hundreds of overlapping points. Detections from
    // different satellites are clustered together, which removes the duplicates
    // created when two instruments observe the same fire.
    const allClusters = clusterByDistance(pixels, 15, (p) => p.lat, (p) => p.lon, {
      maxSpanKm: 45,
    });
    const now = Date.now();
    const cutoff = now - ctx.windowHours * 3_600_000;

    // Keep only complexes whose newest detection falls inside the window, then
    // rank by total fire radiative power so the cap retains the strongest fires.
    const inWindow = allClusters.filter((cluster) => {
      const newest = cluster.items.reduce((a, b) =>
        new Date(a.detectedAt) > new Date(b.detectedAt) ? a : b,
      );
      return new Date(newest.detectedAt).getTime() >= cutoff;
    });
    const frpOf = (cluster: (typeof inWindow)[number]) =>
      cluster.items.reduce((sum, p) => sum + p.frp, 0);
    const ranked = inWindow.sort((a, b) => frpOf(b) - frpOf(a));
    const clusters = ranked.slice(0, MAX_COMPLEXES);
    const truncated = ranked.length - clusters.length;

    const events: HazardEvent[] = [];
    for (const cluster of clusters) {
      const items = cluster.items;
      const newest = items.reduce((a, b) =>
        new Date(a.detectedAt) > new Date(b.detectedAt) ? a : b,
      );
      if (new Date(newest.detectedAt).getTime() < cutoff) continue;

      const totalFrp = items.reduce((sum, p) => sum + p.frp, 0);
      const maxFrp = items.reduce((max, p) => Math.max(max, p.frp), 0);
      const highConf = items.filter((p) => p.confidence === "high").length;
      const satellites = [...new Set(items.map((p) => p.satellite))];
      const instruments = [...new Set(items.map((p) => p.instrument))];
      // Independent confirmation: more than one satellite or instrument seeing
      // the same complex raises confidence. Detection count alone does not,
      // because a single overpass produces many pixels.
      const independentObservations = new Set(items.map((p) => p.instrument)).size;
      const confidenceScore = Math.min(
        0.9,
        0.35 +
          (highConf / items.length) * 0.3 +
          (independentObservations > 1 ? 0.15 : 0) +
          (items.length > 5 ? 0.1 : 0),
      );
      const radiusKm = bboxRadiusKm(cluster.bbox);

      events.push({
        id: `${this.id}:${cluster.centroid.lat.toFixed(2)}:${cluster.centroid.lon.toFixed(2)}:${newest.detectedAt.slice(0, 10)}`,
        hazard: "wildfire",
        title: `Wildfire detected — ${items.length} thermal anomal${items.length === 1 ? "y" : "ies"}`,
        description:
          `Satellite thermal anomaly complex spanning roughly ${radiusKm.toFixed(0)} km, ` +
          `observed by ${instruments.join(", ")}. Peak fire radiative power ${maxFrp.toFixed(0)} MW ` +
          `per pixel; ${totalFrp.toFixed(0)} MW summed across the complex.`,
        lat: cluster.centroid.lat,
        lon: cluster.centroid.lon,
        detectedAt: newest.detectedAt,
        ingestedAt: new Date().toISOString(),
        source: {
          id: this.id,
          name: this.name,
          url: this.url,
          recordUrl: "https://firms.modaps.eosdis.nasa.gov/map/",
          license: this.license,
        },
        severity: severityFromScore(
          frpSeverity(maxFrp, instruments[0] ?? ""),
          `Peak fire radiative power ${maxFrp.toFixed(0)} MW per pixel ` +
            `(${instruments[0] ?? "unknown instrument"}), across ${items.length} ` +
            `detection${items.length === 1 ? "" : "s"}`,
        ),
        confidence: confidenceFromScore(
          confidenceScore,
          `${highConf} of ${items.length} pixels high-confidence, observed by ` +
            `${independentObservations} instrument${independentObservations === 1 ? "" : "s"}`,
        ),
        // A satellite anomaly is never an official confirmation.
        status: "detected",
        geometry: { type: "bbox", bbox: cluster.bbox },
        measurement: { label: "Peak fire radiative power", value: maxFrp, unit: "MW" },
        isDetection: true,
        raw: {
          detections: items.length,
          satellites,
          instruments,
          maxFrp,
          radiusKm,
        },
      });
    }

    const newestOverall = pixels.reduce((a, b) =>
      new Date(a.detectedAt) > new Date(b.detectedAt) ? a : b,
    );

    return {
      events,
      status: statusFor(this, "ok", {
        lastSuccessAt: newestOverall.detectedAt,
        eventCount: events.length,
        message: [
          key
            ? "Using the FIRMS area API"
            : "Using the public FIRMS archives (no FIRMS_MAP_KEY configured)",
          truncated > 0
            ? `showing the ${MAX_COMPLEXES} most intense of ${ranked.length} fire complexes`
            : undefined,
        ]
          .filter(Boolean)
          .join("; "),
      }),
    };
  }

  private async fetchKeyed(key: string, ctx: FetchContext): Promise<Pixel[]> {
    const days = ctx.windowHours <= 24 ? 1 : ctx.windowHours <= 72 ? 3 : 7;
    const results = await Promise.all(
      KEYED_SOURCES.map(async (source) => {
        const url = `${AREA_API}/${key}/${source}/world/${days}`;
        try {
          const res = await fetchWithTimeout(url, {
            timeoutMs: 20_000,
            signal: ctx.signal,
            cache: "no-store",
          });
          if (!res.ok) return [];
          const text = await res.text();
          if (text.startsWith("Invalid") || text.startsWith("Error")) return [];
          return parseCsv(text, `VIIRS (${source.replace("_NRT", "").replace(/_/g, " ")})`);
        } catch {
          return [];
        }
      }),
    );
    return results.flat();
  }

  private async fetchArchive(ctx: FetchContext): Promise<Pixel[]> {
    const useWeekly = ctx.windowHours > 24;
    const key = useWeekly ? "7d" : "24h";

    // The global archives are large (tens of thousands to over a million rows).
    // A short in-process cache means a burst of requests reuses one download.
    const cached = archiveCache.get(key);
    if (cached && Date.now() - cached.at < ARCHIVE_CACHE_TTL_MS) return cached.pixels;

    const results = await Promise.all(
      ARCHIVE_SOURCES.map(async (source) => {
        const url = `${ARCHIVE}/${useWeekly ? source.day7 : source.day1}`;
        try {
          const res = await fetchWithTimeout(url, {
            timeoutMs: 30_000,
            signal: ctx.signal,
            cache: "no-store",
          });
          if (!res.ok) return [];
          const text = await res.text();
          if (!text.startsWith("latitude")) return [];
          return parseCsv(text, source.instrument);
        } catch {
          return [];
        }
      }),
    );
    const pixels = results.flat();
    if (pixels.length > 0) archiveCache.set(key, { at: Date.now(), pixels });
    return pixels;
  }
}
