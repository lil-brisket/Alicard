-- CreateEnum
CREATE TYPE "JobCategory" AS ENUM ('CRAFT', 'GATHER');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "JobCategory" NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserJob" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "outputItemId" TEXT NOT NULL,
    "outputQty" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeInput" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CraftAttempt" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "xpGained" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CraftAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatheringNode" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "dangerTier" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GatheringNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeYield" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL DEFAULT 1,
    "maxQty" INTEGER NOT NULL DEFAULT 1,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodeYield_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatherAttempt" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "xpGained" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GatherAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Job_key_key" ON "Job"("key");

-- CreateIndex
CREATE INDEX "Job_category_idx" ON "Job"("category");

-- CreateIndex
CREATE INDEX "Job_key_idx" ON "Job"("key");

-- CreateIndex
CREATE INDEX "UserJob_playerId_idx" ON "UserJob"("playerId");

-- CreateIndex
CREATE INDEX "UserJob_jobId_idx" ON "UserJob"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "UserJob_playerId_jobId_key" ON "UserJob"("playerId", "jobId");

-- CreateIndex
CREATE INDEX "Recipe_jobId_idx" ON "Recipe"("jobId");

-- CreateIndex
CREATE INDEX "Recipe_outputItemId_idx" ON "Recipe"("outputItemId");

-- CreateIndex
CREATE INDEX "RecipeInput_recipeId_idx" ON "RecipeInput"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeInput_itemId_idx" ON "RecipeInput"("itemId");

-- CreateIndex
CREATE INDEX "CraftAttempt_playerId_idx" ON "CraftAttempt"("playerId");

-- CreateIndex
CREATE INDEX "CraftAttempt_recipeId_idx" ON "CraftAttempt"("recipeId");

-- CreateIndex
CREATE INDEX "CraftAttempt_createdAt_idx" ON "CraftAttempt"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GatheringNode_key_key" ON "GatheringNode"("key");

-- CreateIndex
CREATE INDEX "GatheringNode_jobId_idx" ON "GatheringNode"("jobId");

-- CreateIndex
CREATE INDEX "GatheringNode_key_idx" ON "GatheringNode"("key");

-- CreateIndex
CREATE INDEX "NodeYield_nodeId_idx" ON "NodeYield"("nodeId");

-- CreateIndex
CREATE INDEX "NodeYield_itemId_idx" ON "NodeYield"("itemId");

-- CreateIndex
CREATE INDEX "GatherAttempt_playerId_idx" ON "GatherAttempt"("playerId");

-- CreateIndex
CREATE INDEX "GatherAttempt_nodeId_idx" ON "GatherAttempt"("nodeId");

-- CreateIndex
CREATE INDEX "GatherAttempt_createdAt_idx" ON "GatherAttempt"("createdAt");

-- AddForeignKey
ALTER TABLE "UserJob" ADD CONSTRAINT "UserJob_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJob" ADD CONSTRAINT "UserJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_outputItemId_fkey" FOREIGN KEY ("outputItemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeInput" ADD CONSTRAINT "RecipeInput_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeInput" ADD CONSTRAINT "RecipeInput_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CraftAttempt" ADD CONSTRAINT "CraftAttempt_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CraftAttempt" ADD CONSTRAINT "CraftAttempt_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatheringNode" ADD CONSTRAINT "GatheringNode_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeYield" ADD CONSTRAINT "NodeYield_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "GatheringNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeYield" ADD CONSTRAINT "NodeYield_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatherAttempt" ADD CONSTRAINT "GatherAttempt_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatherAttempt" ADD CONSTRAINT "GatherAttempt_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "GatheringNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
