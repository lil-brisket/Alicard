"use client";

import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { HallOfTheDeadWidget } from "./_components/hall-of-the-dead-widget";

export default function LandingPage() {
  const { data: session } = useSession();

  return (
    <main className="min-h-screen bg-black text-slate-50 flex flex-col">
      <section className="flex flex-col items-center justify-center py-24 px-4">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-center">
          Alicard
        </h1>
        <p className="text-slate-300 mb-8 text-center max-w-xl">
          Turn-based MMO with perma-death. Five deaths and your account is gone.
        </p>

        {session ? (
          <Link
            href="/hub"
            className="rounded-xl px-6 py-3 text-lg font-semibold bg-slate-100 text-black transition hover:bg-slate-200 active:bg-slate-300 min-h-[44px] inline-flex items-center justify-center"
          >
            Enter the Tower
          </Link>
        ) : (
          <button
            onClick={() => void signIn(undefined, { callbackUrl: "/hub" })}
            className="rounded-xl px-6 py-3 text-lg font-semibold bg-slate-100 text-black transition hover:bg-slate-200 active:bg-slate-300 min-h-[44px]"
          >
            Play Now
          </button>
        )}
      </section>

      <HallOfTheDeadWidget />
    </main>
  );
}
