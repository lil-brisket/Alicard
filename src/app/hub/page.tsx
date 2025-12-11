import { redirect } from "next/navigation";

import { getServerAuthSession } from "~/server/auth";
import { db } from "~/server/db";
import { HubHeader } from "./_components/hub-header";
import { CharacterSummaryCard } from "./_components/character-summary-card";
import { CoreStatsCard } from "./_components/core-stats-card";
import { ActionGrid } from "./_components/action-grid";
import { HallOfDeadCard } from "./_components/hall-of-dead-card";

export default async function HubPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Fetch user from database
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, gender: true },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  // Fetch user's main character
  let character = await db.character.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  // If no character exists, create a default one
  if (!character) {
    const baseName = user.username ?? "Alicard";
    const suffix = Math.floor(Math.random() * 9000 + 1000); // 1000-9999
    const name = `${baseName} #${suffix}`;

    // Calculate starting HP and Stamina based on default stats
    const defaultVitality = 5;
    const defaultSpeed = 5;
    const maxHp = 50 + defaultVitality * 5; // 75
    const maxStamina = 20 + defaultVitality * 2 + defaultSpeed * 1; // 35

    character = await db.character.create({
      data: {
        userId: user.id,
        name,
        gender: user.gender,
        level: 1,
        deaths: 0,
        vitality: defaultVitality,
        strength: 5,
        speed: defaultSpeed,
        dexterity: 5,
        currentHp: maxHp,
        maxHp,
        currentStamina: maxStamina,
        maxStamina,
        floor: 1,
        location: "Town Square",
      },
    });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-4 md:p-8">
        <HubHeader
          characterName={character.name}
          level={character.level}
        />

        <main className="mt-4 grid flex-1 grid-cols-1 gap-4 md:mt-6 md:grid-cols-12">
          {/* Left column: md:col-span-5 */}
          <section className="space-y-4 md:col-span-5">
            {/* character card */}
            <CharacterSummaryCard character={character} />
            {/* stats card */}
            <CoreStatsCard
              vitality={character.vitality}
              strength={character.strength}
              speed={character.speed}
              dexterity={character.dexterity}
            />
          </section>

          {/* Right column: md:col-span-7 */}
          <section className="space-y-4 md:col-span-7">
            {/* actions card */}
            <ActionGrid />
            {/* hall of the dead card */}
            <HallOfDeadCard />
          </section>
        </main>
      </div>
    </div>
  );
}

