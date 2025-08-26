"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { revokeConsentDecision } from "@/app/lib/consent";
import { trackEvent } from "@/app/lib/analytics";
import React, { useEffect, useRef, useState } from "react";

export default function Header(): React.ReactElement {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isMenuOpen &&
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  return (
    <header className="w-full border-b border-gray-200/20 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-40">
      <div className="mx-auto w-full max-w-5xl px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-semibold text-xl tracking-tight">
          Festival Sync
        </Link>

        <div className="flex items-center gap-4">
          {status === "loading" && (
            <span className="text-sm text-gray-500">Loading…</span>
          )}

          {status === "unauthenticated" && (
            <button
              onClick={() => signIn("spotify")}
              className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Connect Spotify
            </button>
          )}

          {status === "authenticated" && session?.user && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100/60 transition-colors"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
              >
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name || session.user.email || "User"}
                    className="h-7 w-7 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-700">
                    {(session.user.name || session.user.email || "U").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <span className="text-sm max-w-40 truncate">
                  {session.user.name || session.user.email}
                </span>
              </button>

              {isMenuOpen && (
                <div
                  role="menu"
                  aria-label="User menu"
                  className="absolute right-0 mt-2 w-48 rounded-md border border-gray-200 bg-white shadow-lg focus:outline-none"
                >
                  <div className="px-3 py-2 text-xs text-gray-500">
                    Signed in
                  </div>
                  <button
                    onClick={() => {
                      revokeConsentDecision();
                      trackEvent("consent_revoke");
                    }}
                    role="menuitem"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    Cookie preferences
                  </button>
                  <button
                    onClick={() => signOut()}
                    role="menuitem"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


