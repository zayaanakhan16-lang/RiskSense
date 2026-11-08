import RiskSenseApp from "@/components/RiskSenseApp";

export const dynamic = "force-dynamic";

/**
 * The RiskSense main experience: a global hazard map with a live event feed.
 * Everything rendered here is driven by real data fetched through /api/events.
 */
export default function HomePage() {
  return <RiskSenseApp />;
}
