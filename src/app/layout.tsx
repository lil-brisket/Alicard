import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "react-hot-toast";

import { TRPCReactProvider } from "~/trpc/react";
import { AuthSessionProvider } from "./_components/session-provider";
import { ConditionalAppShell } from "~/components/layout/ConditionalAppShell";

export const metadata: Metadata = {
  title: "Alicard – SAO-inspired Turn-Based Tower MMO",
  description:
    "Alicard is a 2D, turn-based MMO RPG with a 100-floor tower, perma-death, and a player-driven economy.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#000000",
  viewportFit: "cover",
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} font-sans`}>
      <body className="min-h-dvh bg-black text-slate-100 antialiased overflow-x-hidden">
        <div className="min-h-dvh bg-gradient-to-b from-black via-black to-slate-950">
          <TRPCReactProvider>
            <AuthSessionProvider>
              <ConditionalAppShell>{children}</ConditionalAppShell>
              <Toaster
                position="top-right"
                toastOptions={{
                  className: "responsive-toast",
                  duration: 4000,
                }}
              />
            </AuthSessionProvider>
          </TRPCReactProvider>
        </div>
      </body>
    </html>
  );
}
