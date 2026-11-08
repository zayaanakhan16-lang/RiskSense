import { HAZARD_ORDER, hazardMeta, type HazardType } from "@risksense/shared";

/**
 * Hazard markers are drawn to a canvas at load time rather than shipped as
 * images.
 *
 * Each marker is a glowing hazard symbol: a soft coloured halo with the hazard's
 * emoji on top, so a fire reads as a fire and a flood as water at a glance.
 *
 * Emoji are used only when the device actually has a colour emoji font, which is
 * checked by sampling the rendered pixels. Where it does not — a headless
 * renderer, a minimal Linux image, a locked-down kiosk — the same sprite falls
 * back to a drawn silhouette. A public-safety map must not show a missing-glyph
 * box where a hazard should be, and it must not depend on the reader's fonts to
 * convey what the hazard is.
 *
 * The halo is drawn by us rather than taken from the glyph, so every hazard
 * glows in its own palette colour on both the light basemap and satellite
 * imagery, and severity can strengthen the glow without changing the symbol.
 */

const SIZE = 128;

type Painter = (ctx: CanvasRenderingContext2D, s: number) => void;

/**
 * Silhouettes, drawn centred in a 0..1 box. Each declares only geometry; the
 * caller decides fill, stroke and line width.
 */
const shapes: Record<string, Painter> = {
  // Tear-drop flame: wide base, drawn-out tip.
  flame: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(0.5 * s, 0.08 * s);
    ctx.bezierCurveTo(0.62 * s, 0.3 * s, 0.82 * s, 0.4 * s, 0.82 * s, 0.62 * s);
    ctx.bezierCurveTo(0.82 * s, 0.82 * s, 0.68 * s, 0.94 * s, 0.5 * s, 0.94 * s);
    ctx.bezierCurveTo(0.32 * s, 0.94 * s, 0.18 * s, 0.82 * s, 0.18 * s, 0.62 * s);
    ctx.bezierCurveTo(0.18 * s, 0.4 * s, 0.38 * s, 0.3 * s, 0.5 * s, 0.08 * s);
    ctx.closePath();
  },
  // Water droplet: pointed top, round belly.
  droplet: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(0.5 * s, 0.08 * s);
    ctx.bezierCurveTo(0.74 * s, 0.42 * s, 0.86 * s, 0.54 * s, 0.86 * s, 0.68 * s);
    ctx.bezierCurveTo(0.86 * s, 0.85 * s, 0.7 * s, 0.95 * s, 0.5 * s, 0.95 * s);
    ctx.bezierCurveTo(0.3 * s, 0.95 * s, 0.14 * s, 0.85 * s, 0.14 * s, 0.68 * s);
    ctx.bezierCurveTo(0.14 * s, 0.54 * s, 0.26 * s, 0.42 * s, 0.5 * s, 0.08 * s);
    ctx.closePath();
  },
  // Seismic shockwave: a solid core inside two broken rings.
  seismic: (ctx, s) => {
    ctx.beginPath();
    ctx.arc(0.5 * s, 0.5 * s, 0.15 * s, 0, Math.PI * 2);
    ctx.closePath();
    for (const r of [0.3, 0.44]) {
      ctx.moveTo(0.5 * s + r * s * 0.71, 0.5 * s - r * s * 0.71);
      ctx.arc(0.5 * s, 0.5 * s, r * s, -Math.PI / 4, (Math.PI / 4) * 3);
      ctx.moveTo(0.5 * s - r * s * 0.71, 0.5 * s + r * s * 0.71);
      ctx.arc(0.5 * s, 0.5 * s, r * s, (Math.PI / 4) * 3, (Math.PI / 4) * 7);
    }
  },
  // Storm cloud with a lightning bolt.
  storm: (ctx, s) => {
    ctx.beginPath();
    ctx.arc(0.36 * s, 0.44 * s, 0.2 * s, Math.PI, Math.PI * 2);
    ctx.arc(0.58 * s, 0.4 * s, 0.24 * s, Math.PI, Math.PI * 2);
    ctx.arc(0.74 * s, 0.5 * s, 0.16 * s, Math.PI, Math.PI * 2);
    ctx.lineTo(0.9 * s, 0.62 * s);
    ctx.lineTo(0.16 * s, 0.62 * s);
    ctx.closePath();
    ctx.moveTo(0.52 * s, 0.66 * s);
    ctx.lineTo(0.36 * s, 0.86 * s);
    ctx.lineTo(0.48 * s, 0.84 * s);
    ctx.lineTo(0.42 * s, 0.98 * s);
    ctx.lineTo(0.62 * s, 0.78 * s);
    ctx.lineTo(0.5 * s, 0.79 * s);
    ctx.closePath();
  },
  // Spiral: a solid eye inside two swept arms.
  cyclone: (ctx, s) => {
    ctx.beginPath();
    ctx.arc(0.5 * s, 0.5 * s, 0.12 * s, 0, Math.PI * 2);
    ctx.closePath();
    for (const [start, end] of [
      [Math.PI * 0.55, Math.PI * 1.45],
      [Math.PI * 1.55, Math.PI * 2.45],
    ]) {
      for (const r of [0.3, 0.44]) {
        ctx.moveTo(0.5 * s + r * s * Math.cos(start), 0.5 * s + r * s * Math.sin(start));
        ctx.arc(0.5 * s, 0.5 * s, r * s, start, end);
      }
    }
  },
  // Volcano: a broad cone with an ash plume.
  volcano: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(0.1 * s, 0.9 * s);
    ctx.lineTo(0.34 * s, 0.5 * s);
    ctx.lineTo(0.42 * s, 0.5 * s);
    ctx.lineTo(0.46 * s, 0.62 * s);
    ctx.lineTo(0.54 * s, 0.62 * s);
    ctx.lineTo(0.58 * s, 0.5 * s);
    ctx.lineTo(0.66 * s, 0.5 * s);
    ctx.lineTo(0.9 * s, 0.9 * s);
    ctx.closePath();
    ctx.moveTo(0.5 * s, 0.44 * s);
    ctx.lineTo(0.5 * s, 0.1 * s);
    ctx.lineTo(0.66 * s, 0.22 * s);
    ctx.lineTo(0.5 * s, 0.28 * s);
    ctx.lineTo(0.62 * s, 0.38 * s);
    ctx.closePath();
  },
  // Sun with rays.
  heat: (ctx, s) => {
    ctx.beginPath();
    ctx.arc(0.5 * s, 0.5 * s, 0.22 * s, 0, Math.PI * 2);
    ctx.closePath();
    ctx.lineWidth = 0.09 * s;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      ctx.moveTo(0.5 * s + Math.cos(a) * 0.33 * s, 0.5 * s + Math.sin(a) * 0.33 * s);
      ctx.lineTo(0.5 * s + Math.cos(a) * 0.45 * s, 0.5 * s + Math.sin(a) * 0.45 * s);
    }
  },
  // Haze: three drifting ribbons of air.
  haze: (ctx, s) => {
    ctx.lineWidth = 0.11 * s;
    for (const [y, x0, x1, dir] of [
      [0.32, 0.16, 0.84, 1],
      [0.5, 0.24, 0.9, -1],
      [0.68, 0.12, 0.76, 1],
    ]) {
      const mid = (x0 + x1) / 2;
      ctx.moveTo(x0 * s, y * s);
      ctx.quadraticCurveTo(mid * s, (y + dir * 0.1) * s, x1 * s, y * s);
    }
  },
  // Drought: cracked ground under a low sun.
  drought: (ctx, s) => {
    ctx.beginPath();
    ctx.arc(0.5 * s, 0.3 * s, 0.15 * s, 0, Math.PI * 2);
    ctx.closePath();
    ctx.lineWidth = 0.085 * s;
    ctx.moveTo(0.1 * s, 0.74 * s);
    ctx.lineTo(0.28 * s, 0.64 * s);
    ctx.lineTo(0.4 * s, 0.78 * s);
    ctx.lineTo(0.56 * s, 0.62 * s);
    ctx.lineTo(0.72 * s, 0.76 * s);
    ctx.lineTo(0.9 * s, 0.66 * s);
    ctx.moveTo(0.4 * s, 0.78 * s);
    ctx.lineTo(0.44 * s, 0.94 * s);
    ctx.moveTo(0.56 * s, 0.62 * s);
    ctx.lineTo(0.6 * s, 0.5 * s);
  },
  // Landslide: a slope shedding debris.
  landslide: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(0.06 * s, 0.86 * s);
    ctx.lineTo(0.5 * s, 0.26 * s);
    ctx.lineTo(0.94 * s, 0.86 * s);
    ctx.closePath();
    for (const [cx, cy, r] of [
      [0.68, 0.72, 0.08],
      [0.8, 0.84, 0.06],
      [0.56, 0.86, 0.05],
    ]) {
      ctx.moveTo((cx + r) * s, cy * s);
      ctx.arc(cx * s, cy * s, r * s, 0, Math.PI * 2);
    }
  },
  // Industrial incident: hazard triangle with an exclamation mark.
  industrial: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(0.5 * s, 0.1 * s);
    ctx.lineTo(0.96 * s, 0.88 * s);
    ctx.lineTo(0.04 * s, 0.88 * s);
    ctx.closePath();
    ctx.lineWidth = 0.1 * s;
    ctx.moveTo(0.5 * s, 0.42 * s);
    ctx.lineTo(0.5 * s, 0.68 * s);
    ctx.moveTo(0.5 * s, 0.79 * s);
    ctx.lineTo(0.5 * s, 0.8 * s);
  },
  // Fallback: warning triangle.
  other: (ctx, s) => {
    ctx.beginPath();
    ctx.moveTo(0.5 * s, 0.1 * s);
    ctx.lineTo(0.96 * s, 0.88 * s);
    ctx.lineTo(0.04 * s, 0.88 * s);
    ctx.closePath();
    ctx.lineWidth = 0.1 * s;
    ctx.moveTo(0.5 * s, 0.42 * s);
    ctx.lineTo(0.5 * s, 0.68 * s);
    ctx.moveTo(0.5 * s, 0.79 * s);
    ctx.lineTo(0.5 * s, 0.8 * s);
  },
};

/** Painters whose shape is open, so it is stroked rather than filled. */
const STROKED = new Set(["seismic", "cyclone", "haze", "drought", "industrial", "other"]);

interface MarkerOptions {
  /** Outer glow strength, 0..1. Urgent events glow harder. */
  glowStrength?: number;
  /** Ring colour drawn around the silhouette. */
  ring?: string;
}

/**
 * Whether this device can render colour emoji. A canvas paints the glyph, and
 * we count distinct non-transparent colours in the result: a colour emoji font
 * produces many, a monochrome outline produces one or two, and a missing glyph
 * produces a tofu box or nothing at all. Result is cached — the answer cannot
 * change while the page is open.
 */
let emojiSupport: boolean | undefined;

function hasColorEmoji(): boolean {
  if (emojiSupport !== undefined) return emojiSupport;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) return (emojiSupport = false);
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = '28px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.fillText("🔥", 16, 16);

    const { data } = ctx.getImageData(0, 0, 32, 32);
    const seen = new Set<number>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 12) continue;
      seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
      if (seen.size > 8) break;
    }
    emojiSupport = seen.size > 8;
  } catch {
    // getImageData throws on a canvas tainted by cross-origin content.
    emojiSupport = false;
  }
  return emojiSupport;
}

const EMOJI_FONT =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';

function drawMarker(
  color: string,
  glow: string,
  iconKey: string,
  emoji: string,
  { glowStrength = 0.85, ring = "rgba(255,255,255,0.95)" }: MarkerOptions = {},
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const s = SIZE;

  // 1) A tight coloured glow directly behind the symbol. Kept small and
  //    concentrated so the marker reads as a lit symbol rather than a smudge;
  //    overlapping events still compound into a visible regional flare.
  const halo = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s * 0.42);
  halo.addColorStop(0, hexA(glow, 0.85 * glowStrength));
  halo.addColorStop(0.3, hexA(color, 0.5 * glowStrength));
  halo.addColorStop(0.65, hexA(color, 0.16 * glowStrength));
  halo.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, s, s);

  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // 2) The symbol itself. A real colour emoji where the device has one — this
  //    is the marker people recognise instantly, the same way FireSight's
  //    flame reads as fire. Otherwise the drawn silhouette, so the hazard is
  //    never a missing-glyph box.
  if (hasColorEmoji()) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.round(s * 0.56)}px ${EMOJI_FONT}`;
    // White keyline, as FireSight outlines its flame, so the glyph survives
    // both the light basemap and satellite imagery.
    ctx.lineWidth = s * 0.085;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.strokeText(emoji, s / 2, s * 0.52);
    ctx.fillText(emoji, s / 2, s * 0.52);
  } else {
    const painter = shapes[iconKey] ?? shapes.other;
    const body = ctx.createLinearGradient(0, s * 0.15, 0, s * 0.9);
    body.addColorStop(0, lighten(color, 0.5));
    body.addColorStop(0.55, color);
    body.addColorStop(1, darken(color, 0.18));
    ctx.fillStyle = body;
    ctx.strokeStyle = ring;
    ctx.lineWidth = s * 0.1;
    painter(ctx, s);
    if (!STROKED.has(iconKey)) ctx.fill();
    ctx.stroke();
  }

  return ctx.getImageData(0, 0, s, s);
}

/** Stable sprite id for community-report markers. */
export const REPORT_SPRITE_ID = "rs-report-marker";

/**
 * Community reports are drawn as a white map pin with a coloured dot and a
 * dashed collar — deliberately a different shape family from the hazard
 * symbols, because a citizen report is not a hazard detection. The dashed ring
 * is the visual shorthand for "unverified", so it can never be mistaken for a
 * confirmed source record.
 */
export function drawReportMarker(color: string): ImageData {
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const ctx = c.getContext("2d")!;
  const s = SIZE;
  const cx = s / 2;
  const headY = s * 0.4;
  const r = s * 0.24;

  const halo = ctx.createRadialGradient(cx, headY, 0, cx, headY, s * 0.46);
  halo.addColorStop(0, hexA(color, 0.32));
  halo.addColorStop(0.55, hexA(color, 0.12));
  halo.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, s, s);

  // Pin body: a teardrop from a circular head down to a point.
  ctx.beginPath();
  ctx.moveTo(cx, s * 0.9);
  ctx.bezierCurveTo(cx - r * 0.9, headY + r * 0.85, cx - r, headY + r * 0.4, cx - r, headY);
  ctx.arc(cx, headY, r, Math.PI, 0, false);
  ctx.bezierCurveTo(cx + r, headY + r * 0.4, cx + r * 0.9, headY + r * 0.85, cx, s * 0.9);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  ctx.fill();
  ctx.lineWidth = s * 0.055;
  ctx.strokeStyle = color;
  ctx.stroke();

  // Dashed collar around the head — the "unverified" signal.
  ctx.beginPath();
  ctx.setLineDash([s * 0.055, s * 0.045]);
  ctx.lineWidth = s * 0.038;
  ctx.strokeStyle = hexA(color, 0.9);
  ctx.arc(cx, headY, r * 1.34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Solid dot in the head.
  ctx.beginPath();
  ctx.arc(cx, headY, r * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  return ctx.getImageData(0, 0, s, s);
}

export function markerSpriteId(hazard: HazardType): string {
  return `rs-marker-${hazard}`;
}

export function urgentSpriteId(hazard: HazardType): string {
  return `rs-marker-urgent-${hazard}`;
}

export function selectedSpriteId(hazard: HazardType): string {
  return `rs-marker-selected-${hazard}`;
}

/** Adds every hazard sprite to the map once, at load. */
export function registerHazardSprites(map: {
  addImage: (id: string, image: ImageData, options?: { pixelRatio?: number }) => void;
  hasImage: (id: string) => boolean;
}) {
  HAZARD_ORDER.forEach((hazard) => {
    const meta = hazardMeta(hazard);

    const id = markerSpriteId(hazard);
    if (!map.hasImage(id)) {
      map.addImage(id, drawMarker(meta.color, meta.glow, meta.icon, meta.emoji), {
        pixelRatio: 2,
      });
    }

    // Severe and extreme events get a stronger halo, so urgency is visible at a
    // glance without changing the marker's shape or meaning.
    const urgent = urgentSpriteId(hazard);
    if (!map.hasImage(urgent)) {
      map.addImage(
        urgent,
        drawMarker(meta.color, meta.glow, meta.icon, meta.emoji, { glowStrength: 1.4 }),
        { pixelRatio: 2 },
      );
    }

    const selected = selectedSpriteId(hazard);
    if (!map.hasImage(selected)) {
      map.addImage(
        selected,
        drawMarker(meta.color, meta.glow, meta.icon, meta.emoji, {
          glowStrength: 1.15,
          ring: "rgba(249,115,22,1)",
        }),
        { pixelRatio: 2 },
      );
    }
  });
}


/**
 * A MapLibre heatmap colour ramp built from one hazard's palette, so the glow
 * field over a region is tinted like the hazard burning there — amber for fire,
 * blue for flood, violet for seismic. Mirrors FireSight's warm "Earth on fire"
 * field, generalised so each hazard keeps its own colour identity.
 */
export function hazardHeatRamp(color: string, glow: string): unknown {
  return [
    "interpolate",
    ["linear"],
    ["heatmap-density"],
    0, hexA(color, 0),
    0.1, hexA(color, 0.25),
    0.35, hexA(color, 0.5),
    0.6, hexA(glow, 0.72),
    0.85, hexA(lightenHex(glow, 0.35), 0.9),
    1, hexA(lightenHex(glow, 0.72), 1),
  ];
}

/** Lightens a hex colour toward white by `amount` (0..1). */
export function lightenHex(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** Radial-gradient legend swatch for HTML use, matching the map markers. */
export function legendSwatch(color: string, glow: string): string {
  return `radial-gradient(circle at 50% 45%, ${glow}, ${color} 70%)`;
}

// ---- Colour helpers --------------------------------------------------------

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function hexA(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const mix = (c: number) => Math.round(c * (1 - amount));
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}
