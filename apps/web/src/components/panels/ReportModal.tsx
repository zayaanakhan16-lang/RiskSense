"use client";

import { useEffect, useState } from "react";
import { LocateIcon } from "@/components/Icons";
import { Button, Field, Input, Modal, Notice, Select, Textarea } from "@/components/ui/Primitives";
import type { CommunityReport } from "@/lib/reports";
import type { Dict } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  dict: Dict;
  mapCenter: { lat: number; lon: number } | null;
  userLocation: { lat: number; lon: number } | null;
  onRequestLocation: () => void;
  locating: boolean;
  /** A point the user picked on the map; anchors the report to that place. */
  initialPoint?: { lat: number; lon: number; nonce: number } | null;
  /** Called with the stored report so the map can show it immediately. */
  onSubmitted?: (report: CommunityReport) => void;
}

type Category =
  | "fire-observed"
  | "flooding-observed"
  | "road-blocked"
  | "severe-damage"
  | "resource-needed"
  | "other";

/**
 * Community report submission.
 *
 * Reports are explicitly unverified, rate limited, and coarsened to ~1 km on the
 * server. They never trigger a dispatch and never appear as an official warning.
 */
export default function ReportModal({
  open,
  onClose,
  dict,
  mapCenter,
  userLocation,
  onRequestLocation,
  locating,
  initialPoint,
  onSubmitted,
}: Props) {
  const t = dict.report;
  const [category, setCategory] = useState<Category>("fire-observed");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [place, setPlace] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const point = lat !== null && lon !== null ? { lat, lon } : null;

  // A point picked on the map wins over whatever was there before, so opening
  // the form from "Report on this area" always starts at that exact place.
  useEffect(() => {
    if (!open || !initialPoint) return;
    setLat(initialPoint.lat);
    setLon(initialPoint.lon);
  }, [open, initialPoint]);

  const useMapCenter = () => {
    if (!mapCenter) return;
    setLat(mapCenter.lat);
    setLon(mapCenter.lon);
  };

  const useMyLocation = () => {
    onRequestLocation();
    if (userLocation) {
      setLat(userLocation.lat);
      setLon(userLocation.lon);
    }
  };

  const submit = async () => {
    if (!point) {
      setError("Choose an approximate location first.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Please describe what you can see (at least 10 characters).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          lat: point.lat,
          lon: point.lon,
          description: description.trim(),
          place: place.trim() || undefined,
          photoUrl: photoUrl.trim() || undefined,
        }),
      });
      if (res.status === 429) {
        setRateLimited(true);
        return;
      }
      if (!res.ok) throw new Error(t.error);
      const payload = (await res.json()) as { report?: CommunityReport };
      if (payload.report) onSubmitted?.(payload.report);
      setDone(true);
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setDone(false);
    setDescription("");
    setPhotoUrl("");
    setPlace("");
    setLat(null);
    setLon(null);
    setError(null);
    setRateLimited(false);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t.title}
      subtitle={t.subtitle}
    >
      {done ? (
        <div className="space-y-3">
          <Notice tone="safe">
            <p className="font-semibold">{t.success}</p>
            <p className="mt-0.5">{t.successDetail}</p>
          </Notice>
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              {dict.common.close}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          <Notice tone="warn">{t.privacy}</Notice>

          <Field label={t.category} htmlFor="report-category">
            <Select
              id="report-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {(Object.keys(t.categories) as Category[]).map((c) => (
                <option key={c} value={c}>
                  {t.categories[c]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t.location} hint="Rounded to about 1 km before storage.">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={useMapCenter} disabled={!mapCenter}>
                {t.useMapCenter}
              </Button>
              <Button size="sm" variant="secondary" onClick={useMyLocation} disabled={locating}>
                <LocateIcon size={12} className={locating ? "animate-spin" : undefined} />
                {t.useMyLocation}
              </Button>
            </div>
            <p className="rs-tabular mt-1.5 font-mono text-[11px] text-ink-3">
              {point ? `${point.lat.toFixed(3)}, ${point.lon.toFixed(3)}` : "No location selected"}
            </p>
          </Field>

          <Field label="Nearby landmark (optional)" htmlFor="report-place">
            <Input
              id="report-place"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="e.g. north of the harbour"
            />
          </Field>

          <Field label={t.description} htmlFor="report-desc">
            <Textarea
              id="report-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.descriptionPlaceholder}
              maxLength={1200}
            />
            <span className="rs-tabular mt-1 block text-right text-[10.5px] text-ink-3">
              {description.length}/1200
            </span>
          </Field>

          <Field label={t.photoUrl} htmlFor="report-photo">
            <Input
              id="report-photo"
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>

          {rateLimited && <Notice tone="warn">{t.rateLimited}</Notice>}
          {error && <Notice tone="danger">{error}</Notice>}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={() => {
                reset();
                onClose();
              }}
            >
              {dict.alerts.cancel}
            </Button>
            <Button variant="primary" onClick={submit} disabled={busy || !point}>
              {busy ? t.submitting : t.submit}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
