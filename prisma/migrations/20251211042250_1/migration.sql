-- CreateTable
CREATE TABLE "DeathRecord" (
    "id" TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "userId" TEXT,
    "floorReached" INTEGER NOT NULL,
    "causeOfDeath" TEXT NOT NULL,
    "deathsUsed" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeathRecord_pkey" PRIMARY KEY ("id")
);
