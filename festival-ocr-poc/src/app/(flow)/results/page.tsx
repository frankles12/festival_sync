"use client";

import { useStepAnalytics } from "@/app/lib/analytics";

export default function ResultsPage() {
  useStepAnalytics();
  return (
    <main className="flex min-h-[60vh] flex-col items-start py-6 sm:py-8">
      <h1 className="text-3xl font-bold mb-4">Results</h1>
      <p className="text-sm text-gray-600">View matched artists and insights.</p>
    </main>
  );
}


