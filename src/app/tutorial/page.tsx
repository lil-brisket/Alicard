// Placeholder page for the Tutorial feature. Auth-protected and linked from the Hub.

import { redirect } from "next/navigation";
import Link from "next/link";

import { getServerAuthSession } from "~/server/auth";

export default async function TutorialPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-cyan-400">Tutorial</h1>
      <p className="mt-2 text-slate-400">
        Learn how to play the game
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
  );
}

