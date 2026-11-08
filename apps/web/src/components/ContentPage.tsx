"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import TopBar from "@/components/TopBar";
import SiteFooter from "@/components/SiteFooter";
import EmergencyModal from "@/components/panels/EmergencyModal";
import ReportModal from "@/components/panels/ReportModal";
import { ChevronRightIcon, RiskSenseLogo } from "@/components/Icons";
import { cx } from "@/components/ui/Primitives";
import { dictFor, type Locale } from "@/lib/i18n";
import { useLocalStorage } from "@/hooks/useLocalStorage";

/**
 * Shell for the informational pages. It reuses the main navigation so the
 * product identity is consistent, but frees the page body for long-form content.
 */
export default function ContentPage({
  title,
  lede,
  breadcrumb,
  children,
}: {
  title: string;
  lede?: string;
  breadcrumb: string;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useLocalStorage<Locale>("risksense.locale", "en");
  const dict = useMemo(() => dictFor(locale), [locale]);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <TopBar
        dict={dict}
        locale={locale}
        onLocaleChange={setLocale}
        onEmergency={() => setEmergencyOpen(true)}
        onAlerts={() => {
          window.location.href = "/";
        }}
        onReport={() => setReportOpen(true)}
        alertMatchCount={0}
      />

      <main className="flex-1">
        <div className="border-b border-line bg-white">
          <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[11.5px] text-ink-3">
              <Link href="/" className="inline-flex items-center gap-1 hover:text-ink">
                <RiskSenseLogo size={14} />
                RiskSense
              </Link>
              <ChevronRightIcon size={12} />
              <span className="text-ink-2">{breadcrumb}</span>
            </nav>
            <h1 className="mt-3 text-[30px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[38px]">
              {title}
            </h1>
            {lede && (
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-2">{lede}</p>
            )}
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">{children}</div>
      </main>

      <SiteFooter dict={dict} />

      <EmergencyModal
        open={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        dict={dict}
        userLocation={null}
        onRequestLocation={() => {}}
        locating={false}
        events={[]}
      />
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        dict={dict}
        mapCenter={null}
        userLocation={null}
        onRequestLocation={() => {}}
        locating={false}
      />
    </div>
  );
}

export function Prose({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("space-y-4 text-[14px] leading-[1.75] text-ink-2", className)}>{children}</div>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-20 first:mt-0">
      <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">{title}</h2>
      <div className="mt-3 space-y-4 text-[14px] leading-[1.75] text-ink-2">{children}</div>
    </section>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-[var(--r-md)] border border-line bg-white p-4", className)}>
      {children}
    </div>
  );
}

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warn";
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-[var(--r-md)] border px-4 py-3",
        tone === "warn"
          ? "border-warn/30 bg-warn-soft text-[#7c4a03]"
          : "border-water/25 bg-water-soft text-[#075985]",
      )}
    >
      {title && <p className="text-[13px] font-semibold">{title}</p>}
      <div className="mt-1 text-[13px] leading-relaxed">{children}</div>
    </div>
  );
}
