"use client";

import StepError from "@/app/components/StepError";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <StepError error={error} reset={reset} step="compare" />;
}


