"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { STEPS, getActiveIndex } from "@/app/lib/flowSteps";

type AnalyticsPayload = Record<string, unknown>;

// Lightweight wrapper so we can no-op on server and during tests
export function trackEvent(eventName: string, payload?: AnalyticsPayload): void {
  try {
    // @vercel/analytics exposes a global queue via window.va if not using the import
    // But we prefer dynamic import to keep bundle light and avoid SSR issues
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    import("@vercel/analytics").then((mod) => {
      // mod.track is safe in browser
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      (mod as any).track?.(eventName, payload ?? {});
    }).catch(() => {
      // swallow analytics errors
    });
  } catch {
    // noop
  }
}

export function trackStepMounted(stepKey: string): void {
  trackEvent("step_mounted", { step: stepKey });
}

export function trackStepUnmounted(stepKey: string): void {
  trackEvent("step_unmounted", { step: stepKey });
}

export function trackNavigation(fromStep: string | null, toStep: string): void {
  trackEvent("nav_click", { from: fromStep, to: toStep });
}

export function trackStepError(stepKey: string, error?: unknown): void {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : undefined;
  trackEvent("step_error", { step: stepKey, message });
}

export function trackStepRetry(stepKey: string): void {
  trackEvent("step_retry", { step: stepKey });
}

export function useStepAnalytics(): void {
  const pathname = usePathname();

  useEffect(() => {
    const activeIndex = getActiveIndex(pathname ?? null);
    if (activeIndex === -1) return;
    const stepKey = STEPS[activeIndex]?.key;
    if (!stepKey) return;

    trackStepMounted(stepKey);
    return () => {
      trackStepUnmounted(stepKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
}


