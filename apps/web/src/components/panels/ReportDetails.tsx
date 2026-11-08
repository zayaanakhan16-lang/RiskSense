"use client";

import { CloseIcon, ExternalIcon, InfoIcon, ShieldIcon } from "@/components/Icons";
import { Badge, Button, Notice } from "@/components/ui/Primitives";
import { formatDateTime } from "@/lib/format";
import type { CommunityReport, ReportCategory } from "@/lib/reports";
import type { Dict } from "@/lib/i18n";

interface Props {
  report: CommunityReport;
  onClose: () => void;
  onFocus: () => void;
  dict: Dict;
}

const CATEGORY_LABEL: Record<ReportCategory, string> = {
  "fire-observed": "Fire observed",
  "flooding-observed": "Flooding observed",
  "road-blocked": "Road blocked",
  "severe-damage": "Severe damage",
  "resource-needed": "Emergency resource needed",
  other: "Other",
};

/**
 * Detail view for a citizen report. It is deliberately plainer than the hazard
 * event view and leads with the unverified status: a community report is not a
 * detection, not an official warning, and must never be read as one.
 */
export default function ReportDetails({ report, onClose, onFocus, dict }: Props) {
  const t = dict.feed;

  return (
    <section
      aria-label={`${t.communityReports}: ${CATEGORY_LABEL[report.category]}`}
      className="rs-rise pointer-events-auto flex max-h-full w-full flex-col overflow-hidden rounded-[var(--r-lg)] border border-line bg-white/97 shadow-[var(--sh-4)] backdrop-blur-md"
    >
      <header
        className="flex items-start gap-2.5 border-b border-line px-4 py-3"
        style={{ background: "linear-gradient(180deg, #fff4e8, transparent)" }}
      >
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-emergency bg-white text-[15px]"
          aria-hidden
        >
          📍
        </span>
        <div className="min-w-0 flex-1">
          <p className="rs-overline text-emergency-strong">{t.communityReports}</p>
          <h2 className="truncate text-[15px] font-semibold leading-tight text-ink">
            {CATEGORY_LABEL[report.category]}
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label={dict.common.close}
          className="rounded-[var(--r-sm)] p-1 text-ink-3 transition-colors hover:bg-paper-2 hover:text-ink"
        >
          <CloseIcon size={16} />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <Notice tone="warn">
          <p className="font-semibold">Unverified community report</p>
          <p className="mt-0.5">
            This was submitted by a member of the public. RiskSense has not confirmed it and it is
            not an official warning. If you are in danger, contact your local emergency service.
          </p>
        </Notice>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge color="#9a3412" soft="#feeedf">
            <ShieldIcon size={11} />
            {t.reportStatus}: {report.status.replace("-", " ")}
          </Badge>
          <Badge color="#475569" soft="#eef1f5">Not a detection</Badge>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[12.5px]">
          <div>
            <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">{dict.details.detected}</dt>
            <dd className="rs-tabular text-ink">{formatDateTime(report.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-[10.5px] uppercase tracking-wide text-ink-3">
              {dict.details.coordinates}
            </dt>
            <dd className="rs-tabular font-mono text-[11.5px] text-ink">
              {report.lat.toFixed(3)}, {report.lon.toFixed(3)}
            </dd>
          </div>
        </dl>

        <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-3">
          <InfoIcon size={12} className="mt-0.5 shrink-0" />
          The location is deliberately rounded to about 1 km so a report never exposes a private
          address.
        </p>

        {report.place && (
          <div>
            <p className="text-[10.5px] uppercase tracking-wide text-ink-3">Nearby landmark</p>
            <p className="text-[12.5px] text-ink">{report.place}</p>
          </div>
        )}

        <div>
          <p className="text-[10.5px] uppercase tracking-wide text-ink-3">
            {dict.report.description}
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-2">
            {report.description}
          </p>
        </div>

        {report.photoUrl && (
          <a
            href={report.photoUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-navy-3 underline underline-offset-2 hover:text-ink"
          >
            <ExternalIcon size={12} />
            {dict.report.photoUrl}
          </a>
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
        <Button size="sm" variant="secondary" onClick={onFocus}>
          {dict.details.focusOnMap}
        </Button>
        <p className="text-[10.5px] text-ink-3">Never triggers emergency dispatch</p>
      </footer>
    </section>
  );
}
