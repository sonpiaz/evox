import { MobileCEODashboard } from "@/components/evox/redesign";

export const metadata = {
  title: "EVOX Mobile",
  description: "CEO Dashboard - Mobile View",
};

/**
 * Mobile CEO Dashboard Route
 * Access at: /mobile
 *
 * Optimized for iPhone SE (375px)
 * Shows system health in 3 seconds
 */
export default function MobilePage() {
  return (
    <main className="min-h-screen bg-black">
      <MobileCEODashboard />
    </main>
  );
}
