"use client";

import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MapGrid } from "./_components/map-grid";
import { MovementControls } from "./_components/movement-controls";

export default function WorldMapPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-cyan-400">World Map</h1>
            <p className="text-slate-400">
              Explore the world and discover new areas
            </p>
          </div>
          <Link
            href="/hub"
            className="rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white"
          >
            Return to Hub
          </Link>
        </div>

        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <MapGrid />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <MovementControls />
        </div>
      </div>
    </div>
  );
}
