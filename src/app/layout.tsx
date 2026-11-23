import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/components/providers";
import { RegionNotice } from "@/components/region/region-notice";
import { RegionProvider } from "@/components/region/region-provider";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SetupRequired } from "@/components/setup-required";
import { isSupabaseConfigured } from "@/lib/env";
import { getActiveRegions, getCurrentUser, getRegion } from "@/lib/region/server";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "PCForge", template: "%s · PCForge" },
  description:
    "Plan, price and validate a complete PC build with the components, retailers and prices available in your country.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const configured = isSupabaseConfigured();
  const [region, regions, user] = configured
    ? await Promise.all([getRegion(), getActiveRegions(), getCurrentUser()])
    : [null, [], null];

  return (
    <html lang={region?.locale.split("-")[0] ?? "en"} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground flex min-h-dvh flex-col antialiased`}
      >
        <Providers>
          <a
            href="#main"
            className="focus:bg-background sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2"
          >
            Skip to content
          </a>
          {region ? (
            <RegionProvider
              value={{
                regionCode: region.region.code,
                regionName: region.region.name,
                currency: region.currency,
                locale: region.locale,
                regions,
              }}
            >
              <SiteHeader email={user?.email ?? null} />
              {region.source !== "cookie" && region.source !== "profile" && <RegionNotice />}
              <main id="main" className="flex-1">
                {children}
              </main>
              <SiteFooter />
            </RegionProvider>
          ) : (
            <main id="main" className="flex-1">
              <SetupRequired />
            </main>
          )}
        </Providers>
      </body>
    </html>
  );
}
