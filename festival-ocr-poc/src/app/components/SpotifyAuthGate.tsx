"use client";

import React from "react";
import { useSession, signIn } from "next-auth/react";

interface SpotifyAuthGateProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function SpotifyAuthGate({
  children,
  title = "Connect Spotify to continue",
  description = "You need to connect your Spotify account to use this feature.",
}: SpotifyAuthGateProps): React.ReactElement {
  const { status } = useSession();

  if (status === "loading") {
    return (
      <div className="w-full rounded-md border border-gray-200/60 bg-white/60 p-4">
        <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="mt-2 h-4 w-80 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="w-full rounded-md border border-gray-200 bg-white shadow-sm p-5">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
        <button
          type="button"
          onClick={() => signIn("spotify")}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          Connect Spotify
        </button>
      </div>
    );
  }

  return <>{children}</>;
}


