// Placeholder page for the Quests feature. Auth-protected and linked from the Hub.

import { redirect } from "next/navigation";
import Link from "next/link";

import { getServerAuthSession } from "~/server/auth";
import { SectionCard } from "~/components/ui/section-card";

export default async function QuestsPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-cyan-400">Quests</h1>
        <p className="mt-1 text-sm text-slate-400">
          Complete quests to earn rewards
        </p>
      </div>

      <SectionCard>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-100">
            Coming Soon
          </h2>
          <p className="mt-2 text-slate-400">
            This feature is under construction. Check back soon!
          </p>
        </div>
      </SectionCard>
    </div>
  );
}

