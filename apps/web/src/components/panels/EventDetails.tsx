"use client";

import { formatCoord, hazardMeta, humanAge, type HazardEvent } from "@risksense/shared";
import { legendSwatch } from "@/lib/mapIcons";
import {
  AlertIcon,
  BellIcon,
  CloseIcon,
  ExternalIcon,
  InfoIcon,
  ShieldIcon,
} from "@/components/Icons";
import { Badge, Button, Notice, cx } from "@/components/ui/Primitives";
import { formatDateTime } from "@/lib/format";
import type { Dict } from "@/lib/i18n";

interface Props {
  event: HazardEvent;
  onClose: () => void;
  onFocus: () => void;
  onCreateAlert: () => void;
  dict: Dict;
}

/**
 * Event detail view. It states exactly what the source published, who published
 * it, how fresh it is, and how much confidence to place in it — including an
 * explicit label when the record is a satellite detection rather than a
 * confirmed incident.
 */
export default function EventDetails({ event, onClose, onFocus, onCreateAlert, dict }: Props) {
  const meta = hazardMeta(event.hazard);
  const ageMinutes = (Date.now() - new Date(event.detectedAt).getTime()) / 60_000;

  const severityTone =
    event.severity.level === "extreme"
      ? { color: "#991b1b", soft: "#fdeaea" }
      : event.severity.level === "severe"
        ? { color: "#9a3412", soft: "#feeedf" }
        : event.severity.level === "moderate"
          ? { color: "#854d0e", soft: "#faf1d6" }
          : { color: "#475569", soft: "#eef1f5" };

  const confidenceTone =
    event.confidence.level === "high"
      ? { color: "#166534", soft: "#e3f5ec" }
      : event.confidence.level === "medium"
        ? { color: "#854d0e", soft: "#faf1d6" }
        : { color: "#475569", soft: "#eef1f5" };

  const isOfficial = event.status === "warning" || event.status === "confirmed";

  return (
    <section
      aria-label={`${dict.details.event}: ${event.title}`}
      className="rs-rise pointer-events-auto flex max-h-full w-full flex-col overflow-hidden rounded-[var(--r-lg)] border border-line bg-white/97 shadow-[var(--sh-4)] backdrop-blur-md"
    >
      <header
        className="flex items-start gap-2.5 border-b border-line px-4 py-3"
        style={{ background: `linear-gradient(180deg, ${meta.soft}, transparent)` }}
      >
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[16px] leading-none"
          style={{ background: legendSwatch(meta.color, meta.glow) }}
          aria-hidden
        >
          {meta.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="rs-overline" style={{ color: meta.color }}>
            {meta.label}
          </p>
          <h2 className="mt-0.5 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">
            {event.title}
          </h2>
          {event.place && <p className="mt-0.5 text-[12px] text-ink-2">{event.place}</p>}
        </div>
        <button
          onClick={onClose}
          aria-label={dict.details.close}
          className="rounded-[var(--r-sm)] p-1.5 text-ink-3 transition-colors hover:bg-white/70 hover:text-ink"
        >
          <CloseIcon size={17} />
        </button>
      </header>

      <div className="rs-scroll min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge color={severityTone.color} soft={severityTone.soft}>
            {dict.details.severity}: {dict.severity[event.severity.level]}
          </Badge>
          <Badge color={confidenceTone.color} soft={confidenceTone.soft}>
            {dict.details.confidence}: {dict.confidence[event.confidence.level]}
          </Badge>
          <Badge
            color={isOfficial ? "#166534" : "#475569"}
            soft={isOfficial ? "#e3f5ec" : "#eef1f5"}
          >
            {dict.status[event.status]}
          </Badge>
        </div>

        {event.isDetection && (
          <Notice tone="warn">
            <span className="inline-flex items-start gap-1.5">
              <AlertIcon size={13} className="mt-0.5 shrink-0" />
              {dict.details.detectionNotice}
            </span>
          </Notice>
        )}

        {event.description && (
          <p className="text-[12.5px] leading-relaxed text-ink-2">{event.description}</p>
        )}

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <Detail label={dict.details.detected} value={formatDateTime(event.detectedAt)} />
          <Detail
            label={dict.freshness.label}
            value={humanAge(ageMinutes)}
            hint={event.updatedAt ? `${dict.details.updated}: ${formatDateTime(event.updatedAt)}` : undefined}
          />
          <Detail
            label={dict.details.coordinates}
            value={formatCoord(event.lat, event.lon)}
            mono
          />
          {event.depthKm !== undefined && (
            <Detail label={dict.details.depth} value={`${event.depthKm.toFixed(1)} km`} />
          )}
          {event.measurement && (
            <Detail
              label={event.measurement.label}
              value={`${formatMeasurement(event.measurement.value)} ${event.measurement.unit}`}
            />
          )}
          <Detail
            label={dict.details.severity}
            value={dict.severity[event.severity.level]}
            hint={event.severity.basis}
          />
          <Detail
            label={dict.details.confidence}
            value={dict.confidence[event.confidence.level]}
            hint={event.confidence.basis}
          />
        </dl>

        {event.issuingAuthority && (
          <div className="rounded-[var(--r-sm)] border border-line bg-paper px-3 py-2.5">
            <p className="rs-overline flex items-center gap-1.5 text-ink-3">
              <ShieldIcon size={12} />
              {dict.details.authority}
            </p>
            <p className="mt-1 text-[12.5px] font-medium text-ink">{event.issuingAuthority}</p>
            {event.officialGuidance && (
              <>
                <p className="rs-overline mt-2.5 text-ink-3">{dict.details.guidance}</p>
                <p className="mt-1 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-2">
                  {event.officialGuidance}
                </p>
              </>
            )}
          </div>
        )}

        <div className="rounded-[var(--r-sm)] border border-line bg-paper px-3 py-2.5">
          <p className="rs-overline text-ink-3">{dict.details.source}</p>
          <p className="mt-1 text-[12.5px] font-medium text-ink">{event.source.name}</p>
          {event.source.license && (
            <p className="mt-0.5 text-[11px] leading-snug text-ink-3">{event.source.license}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {event.source.recordUrl && (
              <a
                href={event.source.recordUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-navy-3 underline underline-offset-2 hover:text-ink"
              >
                <ExternalIcon size={12} />
                {dict.details.openSource}
              </a>
            )}
            <a
              href={event.source.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink-3 underline underline-offset-2 hover:text-ink"
            >
              <ExternalIcon size={12} />
              {event.source.name}
            </a>
          </div>
        </div>

        {event.raw && Object.keys(event.raw).length > 0 && (
          <details className="rounded-[var(--r-sm)] border border-line bg-white">
            <summary className="cursor-pointer px-3 py-2 text-[11.5px] font-medium text-ink-2">
              <span className="inline-flex items-center gap-1.5">
                <InfoIcon size={12} />
                Source record fields
              </span>
            </summary>
            <pre className="rs-scroll max-h-44 overflow-auto border-t border-line px-3 py-2 font-mono text-[10.5px] leading-relaxed text-ink-2">
              {JSON.stringify(event.raw, null, 2)}
            </pre>
          </details>
        )}

        <p className="text-[11px] leading-relaxed text-ink-3">{dict.common.disclaimer}</p>
      </div>

      <footer className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
        <Button size="sm" variant="primary" onClick={onFocus}>
          {dict.details.focusOnMap}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCreateAlert}>
          <BellIcon size={13} />
          {dict.details.createAlert}
        </Button>
      </footer>
    </section>
  );
}

function Detail({
  label,
  value,
  hint,
  mono,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="rs-overline text-ink-3">{label}</dt>
      <dd className={cx("mt-0.5 text-[12.5px] text-ink", mono && "font-mono text-[11.5px]")}>
        {value}
        {hint && <span className="mt-0.5 block text-[11px] leading-snug text-ink-3">{hint}</span>}
      </dd>
    </div>
  );
}

function formatMeasurement(value: number): string {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 10) return value.toFixed(0);
  return value.toFixed(1);
}
