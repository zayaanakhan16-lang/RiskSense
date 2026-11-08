import { haversineKm } from "./units.ts";

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface Cluster<T> {
  items: T[];
  centroid: GeoPoint;
  bbox: [number, number, number, number]; // [west, south, east, north]
}

/**
 * Grid-based spatial clustering. Points are bucketed into cells of roughly
 * `radiusKm` and adjacent buckets are merged, which keeps the cost near-linear
 * for the tens of thousands of satellite detections a global fire feed returns.
 *
 * Used to turn raw FIRMS pixels into "fire complexes" rather than plotting one
 * marker per pixel.
 */
export interface ClusterOptions {
  /**
   * Hard ceiling on how far any member may sit from the cluster's seed point.
   * Without it, single-link chaining merges neighbouring fires into
   * continent-scale blobs: a chain of 15 km links can cross a thousand
   * kilometres. Bounding the span keeps each cluster a genuine local complex.
   */
  maxSpanKm?: number;
}

export function clusterByDistance<T>(
  points: T[],
  radiusKm: number,
  getLat: (item: T) => number,
  getLon: (item: T) => number,
  options: ClusterOptions = {},
): Cluster<T>[] {
  const maxSpanKm = options.maxSpanKm ?? Number.POSITIVE_INFINITY;
  if (points.length === 0) return [];

  // Latitude degrees are ~111 km everywhere; longitude degrees shrink with cos(lat).
  const latStep = radiusKm / 111;
  const buckets = new Map<string, number[]>();

  for (let i = 0; i < points.length; i++) {
    const lat = getLat(points[i]);
    const lon = getLon(points[i]);
    const latIdx = Math.floor(lat / latStep);
    // Use a conservative longitude step so buckets never straddle a cell edge
    // wider than the merge radius at high latitudes.
    const lonStep = Math.max(radiusKm / 111, 1e-6);
    const lonIdx = Math.floor(lon / lonStep);
    const key = `${latIdx}:${lonIdx}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(i);
    else buckets.set(key, [i]);
  }

  const clusters: Cluster<T>[] = [];
  const assigned = new Set<number>();

  for (const indices of buckets.values()) {
    if (indices.length === 0 || assigned.has(indices[0])) continue;
    const group: number[] = [];
    const queue = [...indices];
    const seen = new Set(indices);
    const seedLat = getLat(points[indices[0]]);
    const seedLon = getLon(points[indices[0]]);

    while (queue.length > 0) {
      const idx = queue.pop()!;
      if (assigned.has(idx)) continue;
      assigned.add(idx);
      group.push(idx);

      const lat = getLat(points[idx]);
      const lon = getLon(points[idx]);

      // Look at neighbouring buckets (3x3) plus the current one.
      const latIdx = Math.floor(lat / latStep);
      const lonStep = Math.max(radiusKm / 111, 1e-6);
      const lonIdx = Math.floor(lon / lonStep);
      for (let dl = -1; dl <= 1; dl++) {
        for (let dn = -1; dn <= 1; dn++) {
          const neighbour = buckets.get(`${latIdx + dl}:${lonIdx + dn}`);
          if (!neighbour) continue;
          for (const j of neighbour) {
            if (seen.has(j)) continue;
            const jLat = getLat(points[j]);
            const jLon = getLon(points[j]);
            if (haversineKm(lat, lon, jLat, jLon) > radiusKm) continue;
            // Refuse links that would stretch the cluster beyond its span.
            if (haversineKm(seedLat, seedLon, jLat, jLon) > maxSpanKm) continue;
            seen.add(j);
            queue.push(j);
          }
        }
      }
    }

    clusters.push(buildCluster(group.map((i) => points[i]), getLat, getLon));
  }

  return clusters;
}

function buildCluster<T>(
  items: T[],
  getLat: (item: T) => number,
  getLon: (item: T) => number,
): Cluster<T> {
  let sumLat = 0;
  let sumLon = 0;
  let west = 180;
  let south = 90;
  let east = -180;
  let north = -90;
  for (const item of items) {
    const lat = getLat(item);
    const lon = getLon(item);
    sumLat += lat;
    sumLon += lon;
    if (lon < west) west = lon;
    if (lon > east) east = lon;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
  }
  return {
    items,
    centroid: { lat: sumLat / items.length, lon: sumLon / items.length },
    bbox: [west, south, east, north],
  };
}

/** Rough footprint radius (km) of a bounding box, capped for readability. */
export function bboxRadiusKm(bbox: [number, number, number, number]): number {
  const [west, south, east, north] = bbox;
  const midLat = (south + north) / 2;
  const dx = (east - west) * 111.32 * Math.cos((midLat * Math.PI) / 180);
  const dy = (north - south) * 110.57;
  return Math.max(1.2, Math.min(60, Math.sqrt(dx * dx + dy * dy) / 2));
}

/** Antimeridian-safe longitude normalisation. */
export function normalizeLon(lon: number): number {
  let x = lon;
  while (x > 180) x -= 360;
  while (x < -180) x += 360;
  return x;
}
