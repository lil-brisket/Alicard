import { redirect } from "next/navigation";

import { getServerAuthSession } from "~/server/auth";
import { db } from "~/server/db";
import { CharacterSummary } from "./_components/character-summary";
import { NavigationSection } from "./_components/navigation-section";

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
    <main className="min-h-screen bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-8 text-4xl font-bold">Player Hub</h1>

        <div className="space-y-6">
          <CharacterSummary character={character} />
          <NavigationSection />
        </div>
      </div>
    </main>
  );
}

