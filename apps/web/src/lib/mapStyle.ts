import type { StyleSpecification } from "maplibre-gl";

/**
 * RiskSense basemap.
 *
 * OpenFreeMap "Positron" — a light, neutral, label-led style built from
 * OpenStreetMap data. It is free, requires no API key and no account, which
 * keeps the platform fully self-hostable. Tiles come from OpenFreeMap's public
 * servers; a self-hoster can point `TILES_URL` at their own deployment.
 */

const TILES_BASE =
  process.env.NEXT_PUBLIC_TILES_URL ?? "https://tiles.openfreemap.org";

/** URL of the vector basemap style. Overridable for self-hosted tile servers. */
export const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? `${TILES_BASE}/styles/positron`;

export const ATTRIBUTION =
  '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · ' +
  'Style © <a href="https://openfreemap.org">OpenFreeMap</a> · ' +
  'Hazards: <a href="https://earthquake.usgs.gov/">USGS</a>, ' +
  '<a href="https://firms.modaps.eosdis.nasa.gov/">NASA FIRMS</a>, ' +
  '<a href="https://eonet.gsfc.nasa.gov/">NASA EONET</a>, ' +
  '<a href="https://www.gdacs.org/">GDACS</a>, ' +
  '<a href="https://www.weather.gov/">NOAA/NWS</a>';

/**
 * Neutral raster fallback used when the vector style cannot be reached. It is
 * deliberately dull so it never competes with hazard markers.
 */
export function fallbackStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: `${TILES_BASE}/fonts/{fontstack}/{range}.pbf`,
    sources: {
      carto: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png",
          "https://b.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png",
        ],
        tileSize: 256,
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>',
      },
    },
    layers: [{ id: "carto", type: "raster", source: "carto" }],
  };
}
