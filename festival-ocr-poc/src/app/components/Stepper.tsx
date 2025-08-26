"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { STEPS, FLOW_PREFIX, getActiveIndex, getAllowedMaxStepIndex } from "@/app/lib/flowSteps";
import { useFlowState } from "@/app/lib/state/FlowStateProvider";
import { trackEvent, trackNavigation } from "@/app/lib/analytics";

export default function Stepper(): React.ReactElement | null {
  const pathname = usePathname();
  const { state } = useFlowState();

  // Only show on flow routes
  if (!pathname || !pathname.startsWith("/")) return null;

  const activeIndex = getActiveIndex(pathname);
  const allowedMaxIndex = getAllowedMaxStepIndex(state);

  return (
    <nav aria-label="Progress" className="w-full border-b border-gray-200/20 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <ol className="mx-auto w-full max-w-5xl px-6 py-3 flex items-center gap-3 overflow-x-auto">
        {STEPS.map((step, index) => {
          const isActive = index === activeIndex;
          const isCompleted = activeIndex !== -1 && index < activeIndex;
          const isDisabled = index > allowedMaxIndex;
          const state = isActive ? "current" : isCompleted ? "complete" : "upcoming";

          return (
            <li key={step.key} className="flex items-center" aria-current={isActive ? "step" : undefined}>
              <Link
                href={step.href}
                aria-disabled={isDisabled}
                tabIndex={isDisabled ? -1 : undefined}
                onClick={(e) => {
                  if (isDisabled) e.preventDefault();
                  const from = activeIndex !== -1 ? STEPS[activeIndex].key : null;
                  if (isDisabled) {
                    trackEvent("nav_blocked", { from, attempted: step.key });
                  } else {
                    trackNavigation(from, step.key);
                  }
                }}
                className={
                  `group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors ` +
                  (isDisabled
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                    : isActive
                    ? "bg-blue-600 text-white"
                    : isCompleted
                    ? "bg-green-100 text-green-800 hover:bg-green-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200")
                }
              >
                <span
                  aria-hidden
                  className={
                    `flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ` +
                    (isDisabled
                      ? "bg-gray-200 text-gray-500"
                      : isActive
                      ? "bg-white/20"
                      : isCompleted
                      ? "bg-green-600 text-white"
                      : "bg-gray-300 text-gray-700")
                  }
                >
                  {isCompleted ? "✓" : index + 1}
                </span>
                <span className="font-medium">{step.label}</span>
                <span className="sr-only">{` ${state} step`}</span>
              </Link>

              {index < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className={
                    `mx-2 h-[1px] w-6 sm:w-10 ` +
                    (index < activeIndex ? "bg-green-400" : "bg-gray-300")
                  }
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}


