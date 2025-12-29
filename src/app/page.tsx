"use client";

import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { HallOfTheDeadWidget } from "./_components/hall-of-the-dead-widget";

export default function LandingPage() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-black text-slate-50 flex flex-col w-full max-w-full overflow-x-hidden">
      <section className="flex flex-col items-center justify-center min-h-screen px-4 w-full max-w-full">
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-400 bg-clip-text text-transparent animate-pulse">
            Alicard
          </h1>
          <p className="text-slate-300 mb-8 text-lg md:text-xl max-w-xl">
            Turn-based MMO with perma-death. Five deaths and your account is gone.
          </p>

          {session ? (
            <Link
              href="/hub"
              className="rounded-xl px-8 py-4 text-lg font-semibold bg-gradient-to-r from-cyan-500 to-purple-600 text-white transition hover:from-cyan-600 hover:to-purple-700 active:from-cyan-700 active:to-purple-800 min-h-[44px] inline-flex items-center justify-center shadow-lg shadow-cyan-500/50"
            >
              Enter the Tower
            </Link>
          ) : (
            <button
              onClick={() => void signIn(undefined, { callbackUrl: "/hub" })}
              className="rounded-xl px-8 py-4 text-lg font-semibold bg-gradient-to-r from-cyan-500 to-purple-600 text-white transition hover:from-cyan-600 hover:to-purple-700 active:from-cyan-700 active:to-purple-800 min-h-[44px] shadow-lg shadow-cyan-500/50"
            >
              Play Now
            </button>
          )}
        </div>
      </section>

      <HallOfTheDeadWidget />
    </main>
  );
}
