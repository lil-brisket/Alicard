"use client";

import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { MapViewport } from "./_components/map-viewport";

export default function WorldPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-100">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl p-3 sm:p-4 md:p-8">
        <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-1 text-xl font-bold text-cyan-400 sm:mb-2 sm:text-2xl">World Map</h1>
            <p className="text-sm text-slate-400 sm:text-base">
              Explore the world and discover new areas
            </p>
          </div>
        </div>

        <MapViewport />
      </div>
    </div>
  );
}
