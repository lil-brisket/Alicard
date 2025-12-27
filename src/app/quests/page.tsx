// Placeholder page for the Quests feature. Auth-protected and linked from the Hub.

import { redirect } from "next/navigation";
import Link from "next/link";

import { getServerAuthSession } from "~/server/auth";

export default async function QuestsPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <h1 className="text-2xl font-bold text-cyan-400">Quests</h1>
        <p className="mt-2 text-slate-400">
          Complete quests to earn rewards
        </p>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-100">
            Coming Soon
          </h2>
          <p className="mt-2 text-slate-400">
            This feature is under construction. Check back soon!
          </p>
        </div>

      </div>
    </div>
  );
}

