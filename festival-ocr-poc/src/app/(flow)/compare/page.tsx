"use client";

import { useStepAnalytics } from "@/app/lib/analytics";
import SpotifyAuthGate from "@/app/components/SpotifyAuthGate";

export default function ComparePage() {
  useStepAnalytics();
  return (
    <SpotifyAuthGate
      title="Connect Spotify to compare"
      description="We need access to your playlists to find matches."
    >
      <main className="flex min-h-[60vh] flex-col items-start py-6 sm:py-8">
        <h1 className="text-3xl font-bold mb-4">Compare</h1>
        <p className="text-sm text-gray-600">Select playlists and compare for matches.</p>
      </main>
    </SpotifyAuthGate>
  );
}


