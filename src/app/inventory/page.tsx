// Placeholder page for the Inventory feature. Auth-protected and linked from the Hub.

import { redirect } from "next/navigation";
import Link from "next/link";

import { getServerAuthSession } from "~/server/auth";

export default async function InventoryPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <div className="w-full max-w-md rounded-xl border border-white/20 bg-white/10 p-6">
          <h1 className="mb-4 text-3xl font-bold">Inventory</h1>
          <p className="mb-6 text-slate-300">
            This feature is under construction.
          </p>
          <Link
            href="/hub"
            className="inline-block rounded-lg bg-[hsl(280,100%,70%)] px-6 py-3 font-semibold text-white transition hover:bg-[hsl(280,100%,65%)]"
          >
            Back to Hub
          </Link>
        </div>
      </div>
    </main>
  );
}

