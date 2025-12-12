// Placeholder page for the Crafting feature. Auth-protected and linked from the Hub.

import { redirect } from "next/navigation";
import Link from "next/link";

import { getServerAuthSession } from "~/server/auth";

export default async function CraftingPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <Link
          href="/hub"
          className="inline-flex items-center gap-2 mb-6 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span>←</span>
          <span>Back to Hub</span>
        </Link>
        <h1 className="text-2xl font-bold text-cyan-400">Crafting</h1>
        <p className="mt-2 text-slate-400">
          Create items using recipes and materials
        </p>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-100">
            Coming Soon
          </h2>
          <p className="mt-2 text-slate-400">
            This feature is under construction. Check back soon!
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/hub"
            className="inline-block rounded-xl bg-cyan-500/20 px-6 py-3 text-cyan-400 transition hover:bg-cyan-500/30"
          >
            Return to Hub
          </Link>
        </div>
      </div>
    </div>
  );
}

