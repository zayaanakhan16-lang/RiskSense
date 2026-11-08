"use client";

import { useMemo, useState } from "react";
import TopBar from "@/components/TopBar";
import SiteFooter from "@/components/SiteFooter";
import AlertsPanel from "@/components/panels/AlertsPanel";
import EmergencyModal from "@/components/panels/EmergencyModal";
import ReportModal from "@/components/panels/ReportModal";
import { useEvents } from "@/hooks/useEvents";
import { useAlerts } from "@/hooks/useAlerts";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { dictFor, type Locale } from "@/lib/i18n";

/**
 * Standalone alert configuration page. Areas and preferences live in this
 * browser only; matching runs against real events.
 */
export default function AlertsPage() {
  const [locale, setLocale] = useLocalStorage<Locale>("risksense.locale", "en");
  const dict = useMemo(() => dictFor(locale), [locale]);
  const { data } = useEvents(72);
  const alerts = useAlerts(data?.events ?? []);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <TopBar
        dict={dict}
        locale={locale}
        onLocaleChange={setLocale}
        onEmergency={() => setEmergencyOpen(true)}
        onAlerts={() => {}}
        onReport={() => setReportOpen(true)}
        alertMatchCount={alerts.matches.length}
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <AlertsPanel
          dict={dict}
          alerts={alerts}
          onClose={() => {
            window.location.href = "/";
          }}
          mapCenter={null}
          onFocusEvent={() => {
            window.location.href = "/";
          }}
        />
      </main>
      <SiteFooter dict={dict} />
      <EmergencyModal
        open={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        dict={dict}
        userLocation={null}
        onRequestLocation={() => {}}
        locating={false}
        events={data?.events ?? []}
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
