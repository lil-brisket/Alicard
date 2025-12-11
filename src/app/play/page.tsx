"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

export default function PlayPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-slate-100">
        <p>Linking you to your fate…</p>
      </main>
    );
  }

  if (!session) {
    // Not logged in – bounce back to landing
    router.push("/");
    return null;
  }

  const { data: character, isLoading } = api.character.getOrCreateCurrent.useQuery();

  if (isLoading || !character) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-slate-100">
        <p>Spawning your first avatar…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-slate-100 flex flex-col items-center py-16">
      <h1 className="text-3xl font-bold mb-4">Welcome, {character.name}</h1>
      <p className="text-slate-400 mb-8">
        This is your only life. Deaths used: {character.deathsUsed}/5
      </p>

      <div className="w-full max-w-md space-y-4">
        <div className="border border-slate-700 rounded-2xl p-4">
          <h2 className="font-semibold mb-2">Stats</h2>
          <ul className="text-sm text-slate-300">
            <li>Level: {character.level}</li>
            <li>Vitality: {character.vitality}</li>
            <li>Strength: {character.strength}</li>
            <li>Speed: {character.speed}</li>
            <li>Dexterity: {character.dexterity}</li>
          </ul>
        </div>

        <div className="border border-red-700 rounded-2xl p-4 bg-gradient-to-br from-red-950/60 to-black">
          <h2 className="font-semibold mb-2 text-red-300">Perma-Death Warning</h2>
          <p className="text-sm text-slate-200">
            You get five deaths. On the fifth, your account and character are deleted.
            No revives. No rollbacks. The Hall of the Dead remembers you… maybe.
          </p>
        </div>
      </div>
    </main>
  );
}

