"use client";

import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
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
        <h1 className="mb-4 text-2xl font-bold text-cyan-400">World Map</h1>
        <p className="mb-6 text-slate-400">
          Explore the world and discover new areas
        </p>

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
