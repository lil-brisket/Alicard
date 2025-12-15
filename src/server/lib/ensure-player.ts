import { db } from "~/server/db";
import { TRPCError } from "@trpc/server";

/**
 * Ensures a Player record exists for the given userId.
 * If it doesn't exist, creates one from the user's Character.
 * 
 * @param userId - The user ID to ensure has a Player record
 * @returns The Player record (existing or newly created)
 * @throws TRPCError if Character is not found
 */
export async function ensurePlayerExists(userId: string) {
  // Check if Player already exists
  let player = await db.player.findUnique({
    where: { userId },
    include: {
      stats: true,
    },
  });

  if (player && !player.isDeleted) {
    return player;
  }

  // Player doesn't exist or is deleted, create from Character
  const character = await db.character.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!character) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Character not found. Please create a character first.",
    });
  }

  // Create Player from Character
  player = await db.player.create({
    data: {
      userId: character.userId,
      characterName: character.name,
      level: character.level,
      deathCount: character.deaths,
      stats: {
        create: {
          // Base stats from character
          vitalityBase: character.vitality,
          strengthBase: character.strength,
          speedBase: character.speed,
          dexterityBase: character.dexterity,
          // Trained stats start at 0
          vitalityTrain: 0,
          strengthTrain: 0,
          speedTrain: 0,
          dexterityTrain: 0,
          // Computed totals (base + trained, which equals base for new players)
          vitality: character.vitality,
          strength: character.strength,
          speed: character.speed,
          dexterity: character.dexterity,
          // HP/SP from character
          maxHP: character.maxHp,
          currentHP: character.currentHp,
          maxSP: character.maxStamina,
          currentSP: character.currentStamina,
          // Other fields use defaults from schema
        },
      },
    },
    include: {
      stats: true,
    },
  });

  return player;
}
