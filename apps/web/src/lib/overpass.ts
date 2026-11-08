import type { GeoPlace } from "@/components/SearchBar";

/**
 * Nearby emergency services via the OpenStreetMap Overpass API.
 *
 * These are public, mapped facilities — hospitals, fire stations, police
 * stations — not a live availability feed. RiskSense labels them as "mapped in
 * OpenStreetMap" so nobody mistakes a directory listing for a dispatch service.
 */

export type ServiceKind = "hospital" | "fire_station" | "police" | "clinic" | "pharmacy";

export interface EmergencyService {
  id: string;
  kind: ServiceKind;
  name: string;
  lat: number;
  lon: number;
  phone?: string;
  distanceKm: number;
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const KIND_LABEL: Record<ServiceKind, string> = {
  hospital: "Hospital",
  fire_station: "Fire station",
  police: "Police station",
  clinic: "Clinic",
  pharmacy: "Pharmacy",
};

export function serviceKindLabel(kind: ServiceKind): string {
  return KIND_LABEL[kind];
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function findEmergencyServices(
  lat: number,
  lon: number,
  radiusM = 15_000,
): Promise<EmergencyService[]> {
  const query = `[out:json][timeout:25];
(
  node(around:${radiusM},${lat},${lon})[amenity=hospital];
  way(around:${radiusM},${lat},${lon})[amenity=hospital];
  node(around:${radiusM},${lat},${lon})[amenity=fire_station];
  way(around:${radiusM},${lat},${lon})[amenity=fire_station];
  node(around:${radiusM},${lat},${lon})[amenity=police];
  way(around:${radiusM},${lat},${lon})[amenity=police];
  node(around:${radiusM},${lat},${lon})[amenity=clinic];
);
out center tags 40;`;

  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          // Overpass asks for an identifiable agent.
          "User-Agent": "RiskSense/0.1 (open-source emergency intelligence)",
        },
        body: new URLSearchParams({ data: query }),
      });
      if (!res.ok) {
        lastError = new Error(`Overpass returned ${res.status}`);
        continue;
      }
      const data = (await res.json()) as {
        elements?: Array<{
          id: number;
          type: string;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags?: Record<string, string>;
        }>;
      };

      const services: EmergencyService[] = [];
      for (const el of data.elements ?? []) {
        const eLat = el.lat ?? el.center?.lat;
        const eLon = el.lon ?? el.center?.lon;
        if (eLat === undefined || eLon === undefined) continue;
        const tags = el.tags ?? {};
        const kind = (tags.amenity as ServiceKind) ?? "hospital";
        services.push({
          id: `${el.type}/${el.id}`,
          kind,
          name: tags.name ?? tags["name:en"] ?? KIND_LABEL[kind] ?? "Emergency service",
          lat: eLat,
          lon: eLon,
          phone: tags.phone ?? tags["contact:phone"] ?? tags["emergency:phone"],
          distanceKm: haversineKm(lat, lon, eLat, eLon),
        });
      }
      return services.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 25);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Overpass unavailable");
}

/** Reverse-geocode a point so the emergency panel knows the country. */
export async function reverseGeocode(lat: number, lon: number): Promise<GeoPlace | null> {
  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
    if (!res.ok) return null;
    return (await res.json()) as GeoPlace;
  } catch {
    return null;
  }
}
