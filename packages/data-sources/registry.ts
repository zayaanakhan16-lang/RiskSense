import type { HazardAdapter } from "./types.ts";
import { UsgsEarthquakeAdapter } from "./adapters/usgs-earthquakes.ts";
import { GdacsAdapter } from "./adapters/gdacs.ts";
import { NasaEonetAdapter } from "./adapters/nasa-eonet.ts";
import { FirmsWildfireAdapter } from "./adapters/firms-wildfire.ts";
import { NwsAlertsAdapter } from "./adapters/nws-alerts.ts";

/**
 * The single place where data sources are registered. Adding a hazard source
 * means writing one adapter and adding it to this array — no other module
 * changes.
 */
export const ADAPTERS: HazardAdapter[] = [
  new UsgsEarthquakeAdapter(),
  new GdacsAdapter(),
  new NasaEonetAdapter(),
  new NwsAlertsAdapter(),
  new FirmsWildfireAdapter(),
];

export function adapterById(id: string): HazardAdapter | undefined {
  return ADAPTERS.find((a) => a.id === id);
}
