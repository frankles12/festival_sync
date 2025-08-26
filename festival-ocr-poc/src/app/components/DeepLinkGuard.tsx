"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { STEPS, getActiveIndex, getAllowedMaxStepIndex } from "@/app/lib/flowSteps";
import { useFlowState } from "@/app/lib/state/FlowStateProvider";

export default function DeepLinkGuard(): React.ReactElement | null {
  const pathname = usePathname();
  const router = useRouter();
  const { state, reset } = useFlowState();

  const activeIndex = getActiveIndex(pathname ?? null);
  if (activeIndex === -1) return null;

  const allowedMax = getAllowedMaxStepIndex(state);
  if (activeIndex <= allowedMax) return null;

  const targetHref = STEPS[allowedMax].href;
  const requiredStepLabel = STEPS[allowedMax].label;
  const currentStepLabel = STEPS[activeIndex]?.label ?? "this step";

  return (
    <div role="alert" className="mx-auto w-full max-w-5xl px-6 py-4">
      <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-900 p-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold">You're jumping ahead</p>
          <p className="text-sm mt-1">
            To use {currentStepLabel}, please complete the prior step: {requiredStepLabel}. We can take you there now.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => router.push(targetHref)}
            className="rounded-md bg-amber-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-amber-700 transition-colors"
          >
            Go to {requiredStepLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              reset();
              router.push(STEPS[0].href);
            }}
            className="rounded-md bg-gray-200 text-gray-900 px-3 py-1.5 text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            Start over
          </button>
        </div>
      </div>
    </div>
  );
}


