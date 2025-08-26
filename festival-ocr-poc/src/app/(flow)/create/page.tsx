"use client";

import SpotifyAuthGate from "@/app/components/SpotifyAuthGate";
import { useStepAnalytics } from "@/app/lib/analytics";

export default function CreatePage() {
  useStepAnalytics();
  return (
    <SpotifyAuthGate
      title="Connect Spotify to create a playlist"
      description="We need permission to create a playlist in your account."
    >
      <main className="flex min-h-[60vh] flex-col items-start py-6 sm:py-8">
        <h1 className="text-3xl font-bold mb-4">Create</h1>
        <p className="text-sm text-gray-600">Name your playlist and create it on Spotify.</p>
      </main>
    </SpotifyAuthGate>
  );
}


