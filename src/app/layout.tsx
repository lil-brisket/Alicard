import "~/styles/globals.css";

import { type Metadata } from "next";
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

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body className="bg-black text-slate-100 antialiased w-full max-w-full overflow-x-hidden">
        <TRPCReactProvider>
          <AuthSessionProvider>
            <ConditionalAppShell>
              {children}
            </ConditionalAppShell>
            <Toaster position="top-right" />
          </AuthSessionProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
