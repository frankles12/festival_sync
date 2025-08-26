"use client";

import { type FlowState, type StepKey } from "@/app/lib/state/FlowStateProvider";

// Route groups like (flow) are not part of the URL path, so hrefs should omit it
export const FLOW_PREFIX = "";

export interface StepConfig {
  key: StepKey;
  label: string;
  href: string;
}

export const STEPS: StepConfig[] = [
  { key: "upload", label: "Upload", href: `${FLOW_PREFIX}/upload` },
  { key: "review", label: "Review", href: `${FLOW_PREFIX}/review` },
  { key: "compare", label: "Compare", href: `${FLOW_PREFIX}/compare` },
  { key: "results", label: "Results", href: `${FLOW_PREFIX}/results` },
  { key: "create", label: "Create", href: `${FLOW_PREFIX}/create` },
];

export function getActiveIndex(pathname: string | null): number {
  if (!pathname) return -1;
  const stepIndex = STEPS.findIndex((s) => pathname.startsWith(s.href));
  return stepIndex;
}

export function getAllowedMaxStepIndex(state: FlowState): number {
  // Start at Upload (index 0) always allowed
  let allowed = 0;

  const hasOcrInput = Boolean(state.ocr.imageDataUrl) || state.ocr.text.trim().length > 0 || state.ocr.candidateNames.length > 0;
  if (hasOcrInput) allowed = Math.max(allowed, 1); // can reach Review

  const mappingKeys = Object.keys(state.review.artistMappings);
  const hasAnyMappings = mappingKeys.length > 0 && mappingKeys.some((k) => state.review.artistMappings[k] !== null);
  if (hasAnyMappings) allowed = Math.max(allowed, 2); // can reach Compare

  const hasResults = state.results.matchedArtists.length > 0;
  if (hasResults) allowed = Math.max(allowed, 3); // can reach Results

  const canCreate = hasResults; // enable Create once results exist
  if (canCreate) allowed = Math.max(allowed, 4);

  return allowed;
}


