"use client";

import { signIn, useSession } from "next-auth/react";
import Link from "next/link";

export default function LandingPage() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-black text-slate-50">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center py-24">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-center">
          Alicard
        </h1>
        <p className="text-slate-300 mb-8 text-center max-w-xl">
          Turn-based MMO with real stakes. Five deaths and your account is gone.
        </p>

        {session ? (
          <Link
            href="/play"
            className="rounded-xl px-6 py-3 text-lg font-semibold bg-slate-100 text-black"
          >
            Enter the Tower
          </Link>
        ) : (
          <button
            onClick={() => void signIn(undefined, { callbackUrl: "/play" })}
            className="rounded-xl px-6 py-3 text-lg font-semibold bg-slate-100 text-black"
          >
            Play Now
          </button>
        )}
      </section>

      {/* Leaderboard section will go here later */}
    </main>
  );
}
