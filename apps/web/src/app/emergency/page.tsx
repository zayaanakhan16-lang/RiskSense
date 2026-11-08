"use client";

import { useMemo, useState } from "react";
import TopBar from "@/components/TopBar";
import SiteFooter from "@/components/SiteFooter";
import EmergencyModal from "@/components/panels/EmergencyModal";
import ReportModal from "@/components/panels/ReportModal";
import { useEvents } from "@/hooks/useEvents";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { dictFor, type Locale } from "@/lib/i18n";

/**
 * Standalone Emergency Assistance page. The same verified directory and official
 * guidance shown in the modal, reachable directly by URL.
 */
export default function EmergencyPage() {
  const [locale, setLocale] = useLocalStorage<Locale>("risksense.locale", "en");
  const dict = useMemo(() => dictFor(locale), [locale]);
  const { data } = useEvents(72);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const locate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  };

  return (
    <div className="flex min-h-dvh flex-col bg-paper">
      <TopBar
        dict={dict}
        locale={locale}
        onLocaleChange={setLocale}
        onEmergency={() => {}}
        onAlerts={() => {
          window.location.href = "/alerts";
        }}
        onReport={() => setReportOpen(true)}
        alertMatchCount={0}
      />
      <main className="flex-1">
        <EmergencyModal
          open
          onClose={() => {
            window.location.href = "/";
          }}
          dict={dict}
          userLocation={userLocation}
          onRequestLocation={locate}
          locating={locating}
          events={data?.events ?? []}
        />
      </main>
      <SiteFooter dict={dict} />
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        dict={dict}
        mapCenter={null}
        userLocation={userLocation}
        onRequestLocation={locate}
        locating={locating}
      />
    </div>
  );
}
