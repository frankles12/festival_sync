"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { STEPS, getActiveIndex, getAllowedMaxStepIndex } from "@/app/lib/flowSteps";
import { useFlowState } from "@/app/lib/state/FlowStateProvider";
import { trackNavigation } from "@/app/lib/analytics";

export default function FlowNav(): React.ReactElement | null {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useFlowState();

  const activeIndex = getActiveIndex(pathname ?? null);
  if (activeIndex === -1) return null;
  const allowedMax = getAllowedMaxStepIndex(state);

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === STEPS.length - 1;
  const canGoNext = !isLast && activeIndex + 1 <= allowedMax;

  const goBack = () => {
    if (!isFirst) {
      const to = STEPS[activeIndex - 1];
      trackNavigation(STEPS[activeIndex]?.key ?? null, to.key);
      router.push(to.href);
    }
  };

  const goNext = () => {
    if (canGoNext) {
      const to = STEPS[activeIndex + 1];
      trackNavigation(STEPS[activeIndex]?.key ?? null, to.key);
      router.push(to.href);
    }
  };

  return (
    <div className="w-full py-6 flex items-center justify-between">
      <button
        type="button"
        onClick={goBack}
        disabled={isFirst}
        className={
          `rounded-md px-4 py-2 text-sm font-medium transition-colors ` +
          (isFirst
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-gray-200 text-gray-800 hover:bg-gray-300")
        }
      >
        Back
      </button>
      <button
        type="button"
        onClick={goNext}
        disabled={!canGoNext}
        className={
          `rounded-md px-4 py-2 text-sm font-medium transition-colors ` +
          (!canGoNext
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700")
        }
      >
        {isLast ? "Done" : `Next: ${STEPS[Math.min(activeIndex + 1, STEPS.length - 1)].label}`}
      </button>
    </div>
  );
}


