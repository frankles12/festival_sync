"use client";

// Simple cookie consent persistence with localStorage and change events

export type CookieConsentDecision = "accepted" | "dismissed" | null;

const STORAGE_KEY = "fs_cookie_consent_v1";
const CHANGE_EVENT = "cookie-consent-change";

let inMemoryDecision: CookieConsentDecision = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function safeGetStorage(): Storage | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getConsentDecision(): CookieConsentDecision {
  const storage = safeGetStorage();
  if (!storage) return inMemoryDecision;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === "accepted" || raw === "dismissed") return raw;
    return null;
  } catch {
    return inMemoryDecision;
  }
}

export function setConsentDecision(decision: Exclude<CookieConsentDecision, null>): void {
  inMemoryDecision = decision;
  const storage = safeGetStorage();
  try {
    storage?.setItem(STORAGE_KEY, decision);
  } catch {
    // ignore storage errors
  }
  dispatchChange(decision);
}

export function revokeConsentDecision(): void {
  inMemoryDecision = null;
  const storage = safeGetStorage();
  try {
    storage?.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
  dispatchChange(null);
}

export function hasMadeConsentDecision(): boolean {
  return getConsentDecision() !== null;
}

export function canTrackWithConsent(): boolean {
  return getConsentDecision() === "accepted";
}

function dispatchChange(decision: CookieConsentDecision): void {
  if (!isBrowser()) return;
  try {
    const event = new CustomEvent(CHANGE_EVENT, { detail: decision });
    window.dispatchEvent(event);
  } catch {
    // noop
  }
}

export function subscribeToConsentChange(
  listener: (decision: CookieConsentDecision) => void
): () => void {
  if (!isBrowser()) return () => {};
  const handler = (e: Event) => {
    const ce = e as CustomEvent<CookieConsentDecision>;
    listener(ce.detail ?? null);
  };
  window.addEventListener(CHANGE_EVENT, handler as EventListener);
  return () => window.removeEventListener(CHANGE_EVENT, handler as EventListener);
}

// Optional: expose a global revoke for quick manual testing until header link is added
// @ts-expect-error attaching test hook on window
if (isBrowser() && !window.__cookieConsentRevoke) {
  // @ts-expect-error test hook
  window.__cookieConsentRevoke = revokeConsentDecision;
}


