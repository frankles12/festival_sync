import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProviderWrapper from "@/app/components/SessionProviderWrapper";
import Header from "@/app/components/Header";
import Stepper from "@/app/components/Stepper";
import FlowNav from "@/app/components/FlowNav";
import FlowStateProvider from "@/app/lib/state/FlowStateProvider";
import CookieBanner from "@/app/components/CookieBanner";
import DeepLinkGuard from "@/app/components/DeepLinkGuard";
import { Analytics } from "@vercel/analytics/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Festival Sync",
  description: "Sync your Spotify with festival lineups",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProviderWrapper>
          <FlowStateProvider>
            <Header />
            <Stepper />
            <DeepLinkGuard />
            <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
              {children}
            </div>
            <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
              <FlowNav />
            </div>
            <Analytics />
            <CookieBanner />
          </FlowStateProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
