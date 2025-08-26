"use client";

import { useStepAnalytics } from "@/app/lib/analytics";

export default function UploadPage() {
  useStepAnalytics();
  return (
    <main className="flex min-h-[60vh] flex-col items-start py-6 sm:py-8">
      <h1 className="text-3xl font-bold mb-4">Upload</h1>
      <p className="text-sm text-gray-600">Start by uploading your festival poster image.</p>
    </main>
  );
}


