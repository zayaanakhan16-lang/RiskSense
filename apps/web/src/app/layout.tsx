import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "RiskSense — Global emergency intelligence & early warning",
    template: "%s · RiskSense",
  },
  description:
    "RiskSense is an open-source platform for monitoring wildfires, floods, " +
    "earthquakes, storms, volcanoes and other hazards worldwide, using official " +
    "and open data sources. See the risk. Understand the danger. Act sooner.",
  applicationName: "RiskSense",
  keywords: [
    "emergency intelligence",
    "early warning",
    "wildfire map",
    "earthquake map",
    "flood warnings",
    "global hazards",
    "open source",
  ],
  openGraph: {
    title: "RiskSense — Global emergency intelligence & early warning",
    description:
      "A live, multi-hazard map of the world built on official and open data. " +
      "Open source, self-hostable, honest about uncertainty.",
    type: "website",
    siteName: "RiskSense",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#102a43",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
