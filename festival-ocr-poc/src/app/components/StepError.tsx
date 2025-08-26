"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { type StepKey } from "@/app/lib/state/FlowStateProvider";
import { STEPS } from "@/app/lib/flowSteps";
import { trackStepError, trackStepRetry } from "@/app/lib/analytics";

interface StepErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  step: StepKey;
}

export default function StepError({ error, reset, step }: StepErrorProps) {
  const router = useRouter();

  React.useEffect(() => {
    trackStepError(step, error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, error?.message]);

  const stepConfig = React.useMemo(() => STEPS.find((s) => s.key === step), [step]);

  const handleRetry = () => {
    trackStepRetry(step);
    // Prefer reset() to re-render the errored segment
    try {
      reset();
    } catch {
      // If reset throws for any reason, fall back to reload the step path
      if (stepConfig?.href) router.replace(stepConfig.href);
    }
  };

  return (
    <main className="flex min-h-[60vh] flex-col items-start py-6 sm:py-8">
      <h1 className="text-3xl font-bold mb-3">Something went wrong</h1>
      <p className="text-sm text-gray-600 mb-6">
        We hit an unexpected error on the {stepConfig?.label ?? step} step.
      </p>
      {error?.message ? (
        <pre className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-md p-3 mb-6 max-w-full overflow-auto">
          {error.message}
        </pre>
      ) : null}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleRetry}
          className="inline-flex items-center rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:opacity-90 active:opacity-80"
        >
          Try again
        </button>
        {stepConfig?.href ? (
          <button
            type="button"
            onClick={() => router.replace(stepConfig.href)}
            className="inline-flex items-center rounded-md border border-gray-300 text-gray-800 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Back to {stepConfig.label}
          </button>
        ) : null}
      </div>
    </main>
  );
}


