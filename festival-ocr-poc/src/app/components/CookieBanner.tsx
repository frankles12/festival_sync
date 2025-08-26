"use client";

import React, { useEffect, useState } from "react";
import {
  getConsentDecision,
  hasMadeConsentDecision,
  setConsentDecision,
  subscribeToConsentChange,
} from "@/app/lib/consent";
import { trackEvent } from "@/app/lib/analytics";

export default function CookieBanner(): React.ReactElement | null {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!hasMadeConsentDecision()) {
      setIsVisible(true);
    }
    const unsubscribe = subscribeToConsentChange(() => {
      const decided = hasMadeConsentDecision();
      setIsVisible(!decided);
    });
    return unsubscribe;
  }, []);

  if (!isVisible) return null;

  function handleAccept(): void {
    setConsentDecision("accepted");
    trackEvent("consent_accept", { previous: getConsentDecision() });
    setIsVisible(false);
  }

  function handleDismiss(): void {
    setConsentDecision("dismissed");
    trackEvent("consent_dismiss", { previous: getConsentDecision() });
    setIsVisible(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 sm:px-6 pb-4">
      <div className="mx-auto max-w-5xl rounded-lg border border-gray-200 bg-white/90 backdrop-blur shadow-lg">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-gray-700">
            We use essential cookies to run this site and optional analytics to improve
            your experience. You can change your choice anytime.
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handleAccept}
              className="px-3 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


