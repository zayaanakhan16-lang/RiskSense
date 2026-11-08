"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  COUNTRIES,
  EMERGENCY_DIRECTORY,
  EMERGENCY_LAST_REVIEWED,
  UNVERIFIED_MESSAGE,
  emergencyCategoryForHazard,
  emergencyFor,
  recommendedNumber,
  flagEmoji,
  hazardMeta,
  type EmergencyCategory,
  type EmergencyEntry,
  type HazardEvent,
} from "@risksense/shared";
import {
  AlertIcon,
  ExternalIcon,
  LocateIcon,
  PhoneIcon,
  ShieldIcon,
  WaterIcon,
} from "@/components/Icons";
import { Button, Chip, Field, Modal, Notice, Select, Spinner, cx } from "@/components/ui/Primitives";
import { findEmergencyServices, reverseGeocode, serviceKindLabel, type EmergencyService } from "@/lib/overpass";
import type { Dict } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  dict: Dict;
  /** User's own position, when the browser has granted it. */
  userLocation: { lat: number; lon: number } | null;
  onRequestLocation: () => void;
  locating: boolean;
  /** Official warnings currently active, used for contextual guidance. */
  events: HazardEvent[];
  /**
   * A point the user picked on the map. When present, RiskSense resolves the
   * country and place for that exact coordinate and preselects the matching
   * emergency category, instead of waiting for the device location.
   */
  initialPoint?: { lat: number; lon: number; nonce: number } | null;
}

type Category = EmergencyCategory;

const CATEGORY_HAZARDS: Record<Category, HazardEvent["hazard"][]> = {
  fire: ["wildfire"],
  flood: ["flood"],
  earthquake: ["earthquake", "landslide"],
  storm: ["severe-weather", "cyclone"],
  medical: [],
  industrial: ["industrial"],
  other: [],
};

/**
 * Emergency assistance.
 *
 * RiskSense shows verified, country-specific numbers, official guidance issued
 * by named authorities, and mapped services. It never dials, never dispatches,
 * and never claims to have contacted anyone: every call action requires an
 * explicit confirmation from the user.
 */
export default function EmergencyModal({
  open,
  onClose,
  dict,
  userLocation,
  onRequestLocation,
  locating,
  events,
  initialPoint,
}: Props) {
  const [country, setCountry] = useState<string>("");
  const [detectedPlace, setDetectedPlace] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("other");
  const [confirmNumber, setConfirmNumber] = useState<string | null>(null);
  const [services, setServices] = useState<EmergencyService[] | null>(null);
  const [servicesBusy, setServicesBusy] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const t = dict.emergency;

  // The point we resolve against: a coordinate the user picked on the map takes
  // precedence over the device location, because that is what they asked about.
  // Destructured into primitives so the hooks below depend on stable values.
  const lookupLat = initialPoint?.lat ?? userLocation?.lat ?? null;
  const lookupLon = initialPoint?.lon ?? userLocation?.lon ?? null;
  const hasLookupPoint = lookupLat !== null && lookupLon !== null;

  // Detect the country from the point being asked about.
  useEffect(() => {
    if (!open || lookupLat === null || lookupLon === null) return;
    let cancelled = false;
    void reverseGeocode(lookupLat, lookupLon).then((place) => {
      if (cancelled || !place?.countryCode) return;
      setCountry(place.countryCode);
      setDetectedPlace([place.name, place.country].filter(Boolean).join(", "));
    });
    return () => {
      cancelled = true;
    };
  }, [open, lookupLat, lookupLon]);

  // Preselect the emergency category from the hazard nearest the point being
  // asked about, so a click on a wildfire area leads with the fire service
  // number. This only reorders numbers the user still has to confirm — it never
  // places a call and never claims an emergency is confirmed.
  const nearestEvent = useMemo<HazardEvent | null>(() => {
    if (lookupLat === null || lookupLon === null || events.length === 0) return null;
    const R = 6371;
    const toRad = (d: number) => (d * Math.PI) / 180;
    let best: HazardEvent | null = null;
    let bestKm = Infinity;
    for (const e of events) {
      const dLat = toRad(e.lat - lookupLat);
      const dLon = toRad(e.lon - lookupLon);
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lookupLat)) * Math.cos(toRad(e.lat)) * Math.sin(dLon / 2) ** 2;
      const km = 2 * R * Math.asin(Math.sqrt(h));
      if (km < bestKm) {
        bestKm = km;
        best = e;
      }
    }
    // Only trust a match that is actually close; a wildfire 800 km away says
    // nothing about what is happening where the user pointed.
    return bestKm <= 150 ? best : null;
  }, [lookupLat, lookupLon, events]);

  const nearestHazard = nearestEvent?.hazard ?? null;
  useEffect(() => {
    if (!open || !nearestHazard) return;
    setCategory(emergencyCategoryForHazard(nearestHazard));
  }, [open, nearestHazard]);

  const entry: EmergencyEntry | undefined = useMemo(() => emergencyFor(country), [country]);

  const contextualGuidance = useMemo(() => {
    const wanted = CATEGORY_HAZARDS[category];
    if (wanted.length === 0) return [];
    return events
      .filter((e) => wanted.includes(e.hazard) && e.officialGuidance)
      .slice(0, 3);
  }, [events, category]);

  const loadServices = useCallback(async () => {
    if (lookupLat === null || lookupLon === null) return;
    setServicesBusy(true);
    setServicesError(null);
    try {
      const found = await findEmergencyServices(lookupLat, lookupLon);
      setServices(found);
    } catch {
      setServicesError("Emergency service lookup is unavailable right now.");
    } finally {
      setServicesBusy(false);
    }
  }, [lookupLat, lookupLon]);

  /**
   * The number that best matches the selected situation. It is only a
   * recommendation: every entry still goes through the confirmation step, and
   * when the country has no service-specific line we fall back to the general
   * emergency number rather than inventing one.
   */
  const recommended = useMemo(() => {
    const pick = recommendedNumber(entry, category);
    if (!pick) return null;
    const caption = pick.specific
      ? `${t.recommendedFor} ${
          pick.field === "relief" ? t.reliefLine.toLowerCase() : t.categories[category].toLowerCase()
        }`
      : t.recommendedGeneral;
    return { caption, value: pick.value };
  }, [entry, category, t]);

  const numberButtons = useMemo(() => {
    if (!entry) return [];
    const out: { label: string; value: string }[] = [];
    const seen = new Set<string>();
    const push = (label: string, value: string | undefined) => {
      if (!value || seen.has(value)) return;
      seen.add(value);
      out.push({ label, value });
    };
    push(t.generalLine, entry.numbers.general);
    push(dict.emergency.categories.medical, entry.numbers.ambulance);
    push(dict.emergency.categories.fire, entry.numbers.fire);
    push(t.reliefLine, entry.numbers.relief);
    push("Police", entry.numbers.police);
    return out;
  }, [entry, dict.emergency.categories.medical, dict.emergency.categories.fire, t]);

  return (
    <Modal open={open} onClose={onClose} title={t.title} subtitle={t.subtitle} wide>
      <div className="space-y-4">
        <Notice tone="danger">
          <span className="inline-flex items-start gap-1.5">
            <AlertIcon size={14} className="mt-0.5 shrink-0" />
            <span>{t.disclaimer}</span>
          </span>
        </Notice>

        {/* What RiskSense worked out from the point you chose. */}
        {(initialPoint || nearestEvent) && (
          <div className="rounded-[var(--r-md)] border border-line bg-white px-3.5 py-2.5">
            <p className="rs-overline text-ink-3">{t.detected}</p>
            <p className="mt-1 text-[12.5px] text-ink-2">
              {initialPoint && (
                <span className="rs-tabular font-mono text-[11.5px]">
                  {initialPoint.lat.toFixed(3)}, {initialPoint.lon.toFixed(3)}
                </span>
              )}
              {initialPoint && (detectedPlace || nearestEvent) && <span> · </span>}
              {detectedPlace && <span>{detectedPlace}</span>}
            </p>
            {nearestEvent && (
              <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-2">
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: hazardMeta(nearestEvent.hazard).soft,
                    color: hazardMeta(nearestEvent.hazard).color,
                  }}
                  aria-hidden
                >
                  <WaterIcon size={10} />
                </span>
                {t.nearbyHazard}: {nearestEvent.title}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={t.chooseCountry}
            hint={detectedPlace ? `Detected near ${detectedPlace}` : undefined}
          >
            <Select value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="">Select a country…</option>
              {COUNTRIES.filter((c) => EMERGENCY_DIRECTORY.some((e) => e.code === c.code)).map((c) => (
                <option key={c.code} value={c.code}>
                  {flagEmoji(c.code)} {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button variant="secondary" onClick={onRequestLocation} disabled={locating} className="w-full">
              <LocateIcon size={14} className={locating ? "animate-spin" : undefined} />
              {locating ? dict.search.locating : t.detect}
            </Button>
          </div>
        </div>

        {/* Verified numbers */}
        {country && !entry && (
          <Notice tone="warn">
            <p className="font-semibold">{t.notVerified}</p>
            <p className="mt-0.5">{t.notVerifiedHint}</p>
          </Notice>
        )}

        {entry && (
          <div className="rounded-[var(--r-md)] border border-line bg-paper px-3.5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
                <ShieldIcon size={15} className="text-navy-3" />
                {flagEmoji(entry.code)} {entry.country}
              </p>
              <span
                className={cx(
                  "rounded-[var(--r-pill)] px-2 py-0.5 text-[10.5px] font-semibold",
                  entry.verified
                    ? "bg-safe-soft text-[#166534]"
                    : "bg-warn-soft text-[#854d0e]",
                )}
              >
                {entry.verified ? "Verified" : "Community-maintained"}
              </span>
            </div>

            {recommended && (
              <button
                onClick={() => setConfirmNumber(recommended.value)}
                className="mt-2.5 flex w-full items-center gap-2.5 rounded-[var(--r-sm)] border border-emergency/40 bg-emergency-soft px-3 py-2.5 text-left transition-colors hover:border-emergency"
              >
                <PhoneIcon size={15} className="shrink-0 text-emergency-strong" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium text-ink-2">
                    {recommended.caption}
                  </span>
                  <span className="rs-tabular block text-[17px] font-semibold leading-tight text-ink">
                    {recommended.value}
                  </span>
                </span>
              </button>
            )}

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {numberButtons.map((n) => (
                <button
                  key={`${n.label}-${n.value}`}
                  onClick={() => setConfirmNumber(n.value)}
                  className="inline-flex items-center gap-1.5 rounded-[var(--r-sm)] border border-line bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink transition-colors hover:border-emergency hover:text-emergency-strong"
                >
                  <PhoneIcon size={13} />
                  <span className="text-ink-3">{n.label}</span>
                  <span className="rs-tabular font-semibold">{n.value}</span>
                </button>
              ))}
            </div>

            {entry.numbers.note && (
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-2">{entry.numbers.note}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-3">
              <a
                href={entry.source}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-ink"
              >
                <ExternalIcon size={11} />
                Official source
              </a>
              <span>· Directory reviewed {EMERGENCY_LAST_REVIEWED}</span>
            </div>
          </div>
        )}

        {!country && (
          <Notice tone="info">{UNVERIFIED_MESSAGE}</Notice>
        )}

        {/* Situation category */}
        <div>
          <p className="rs-overline text-ink-3">What kind of emergency?</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(Object.keys(t.categories) as Category[]).map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {t.categories[c]}
              </Chip>
            ))}
          </div>
        </div>

        {/* Official guidance */}
        <div>
          <p className="rs-overline text-ink-3">{t.guidance}</p>
          {contextualGuidance.length === 0 ? (
            <p className="mt-1.5 text-[12px] text-ink-3">{t.guidanceEmpty}</p>
          ) : (
            <ul className="mt-1.5 space-y-2">
              {contextualGuidance.map((e) => (
                <li key={e.id} className="rounded-[var(--r-sm)] border border-line bg-white px-3 py-2.5">
                  <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: hazardMeta(e.hazard).soft,
                        color: hazardMeta(e.hazard).color,
                      }}
                      aria-hidden
                    >
                      <WaterIcon size={10} />
                    </span>
                    {e.title}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-ink-2">
                    {e.officialGuidance}
                  </p>
                  <p className="mt-1 text-[10.5px] text-ink-3">
                    {e.issuingAuthority ?? e.source.name} ·{" "}
                    {e.source.recordUrl && (
                      <a
                        href={e.source.recordUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="underline underline-offset-2 hover:text-ink"
                      >
                        source
                      </a>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Nearby services */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="rs-overline text-ink-3">{t.services}</p>
            {hasLookupPoint && (
              <button
                onClick={loadServices}
                disabled={servicesBusy}
                className="text-[11.5px] font-medium text-navy-3 hover:text-ink disabled:opacity-60"
              >
                {t.findServices}
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-snug text-ink-3">{t.servicesHint}</p>

          {!hasLookupPoint && (
            <Notice tone="info" className="mt-2">
              {t.detect} to list nearby mapped services.
            </Notice>
          )}

          {servicesBusy && (
            <div className="mt-2">
              <Spinner label="Searching OpenStreetMap…" />
            </div>
          )}

          {servicesError && (
            <Notice tone="warn" className="mt-2">
              {servicesError}
            </Notice>
          )}

          {services && services.length === 0 && !servicesBusy && (
            <Notice tone="info" className="mt-2">
              {t.noServices}
            </Notice>
          )}

          {services && services.length > 0 && (
            <ul className="rs-scroll mt-2 max-h-56 space-y-1 overflow-y-auto">
              {services.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-[var(--r-sm)] border border-line bg-white px-2.5 py-1.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-ink">{s.name}</span>
                    <span className="text-[10.5px] text-ink-3">
                      {serviceKindLabel(s.kind)} · {s.distanceKm.toFixed(1)} km
                    </span>
                  </span>
                  {s.phone && (
                    <button
                      onClick={() => setConfirmNumber(s.phone!)}
                      className="inline-flex items-center gap-1 rounded-[var(--r-xs)] border border-line px-2 py-0.5 text-[11px] font-medium text-ink hover:border-emergency hover:text-emergency-strong"
                    >
                      <PhoneIcon size={11} />
                      {s.phone}
                    </button>
                  )}
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}#map=17/${s.lat}/${s.lon}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[11px] text-ink-3 hover:text-ink"
                    title="View on OpenStreetMap"
                  >
                    <ExternalIcon size={12} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Explicit call confirmation — RiskSense never dials automatically. */}
      {confirmNumber && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/40 p-4">
          <div className="rs-rise w-full max-w-sm rounded-[var(--r-lg)] border border-line bg-white p-4 shadow-[var(--sh-4)]">
            <h3 className="text-[15px] font-semibold text-ink">{t.callConfirmTitle}</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{t.callConfirmBody}</p>
            <p className="rs-tabular mt-2 rounded-[var(--r-sm)] bg-paper-2 px-3 py-2 text-center text-[18px] font-semibold tracking-wide text-ink">
              {confirmNumber}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmNumber(null)}>
                {t.cancel}
              </Button>
              <a
                href={`tel:${confirmNumber.replace(/[^+0-9]/g, "")}`}
                onClick={() => setConfirmNumber(null)}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--r-sm)] bg-emergency px-3 text-[12px] font-semibold text-white hover:bg-emergency-strong"
              >
                <PhoneIcon size={13} />
                {t.confirm}
              </a>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
