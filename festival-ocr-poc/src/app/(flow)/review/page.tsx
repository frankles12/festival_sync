"use client";

import { useStepAnalytics } from "@/app/lib/analytics";

export default function ReviewPage() {
  useStepAnalytics();
  return (
    <main className="flex min-h-[60vh] flex-col items-start py-6 sm:py-8">
      <h1 className="text-3xl font-bold mb-4">Review</h1>
      <p className="text-sm text-gray-600">Edit and confirm the detected artist names.</p>
    </main>
  );
}


