"use client";

import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";
import { MapViewport } from "./_components/map-viewport";
import { SectionCard } from "~/components/ui/section-card";

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
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          World Map
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Explore the world and discover new areas
        </p>
      </div>

      <SectionCard>
        <MapViewport />
      </SectionCard>
    </div>
  );
}
