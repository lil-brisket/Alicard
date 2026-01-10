-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "category" TEXT,
ADD COLUMN     "isDiscoverable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stationDefinitionId" TEXT,
ADD COLUMN     "successRate" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "StationDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tags" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stationType" TEXT NOT NULL,
    "unlockLevel" INTEGER NOT NULL DEFAULT 1,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,

    CONSTRAINT "StationDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EffectDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tags" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "magnitude" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER,
    "tickSeconds" INTEGER,
    "stackingRule" TEXT NOT NULL DEFAULT 'NONE',
    "pvpScalar" DOUBLE PRECISION,
    "cooldownSeconds" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "EffectDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemEffect" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "effectId" TEXT NOT NULL,
    "ordering" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemEffect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StationDefinition_key_key" ON "StationDefinition"("key");

-- CreateIndex
CREATE INDEX "StationDefinition_key_idx" ON "StationDefinition"("key");

-- CreateIndex
CREATE INDEX "StationDefinition_status_idx" ON "StationDefinition"("status");

-- CreateIndex
CREATE INDEX "StationDefinition_stationType_idx" ON "StationDefinition"("stationType");

-- CreateIndex
CREATE INDEX "StationDefinition_unlockLevel_idx" ON "StationDefinition"("unlockLevel");

-- CreateIndex
CREATE INDEX "StationDefinition_isEnabled_idx" ON "StationDefinition"("isEnabled");

-- CreateIndex
CREATE INDEX "StationDefinition_createdBy_idx" ON "StationDefinition"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "EffectDefinition_key_key" ON "EffectDefinition"("key");

-- CreateIndex
CREATE INDEX "EffectDefinition_key_idx" ON "EffectDefinition"("key");

-- CreateIndex
CREATE INDEX "EffectDefinition_status_idx" ON "EffectDefinition"("status");

-- CreateIndex
CREATE INDEX "EffectDefinition_type_idx" ON "EffectDefinition"("type");

-- CreateIndex
CREATE INDEX "EffectDefinition_createdBy_idx" ON "EffectDefinition"("createdBy");

-- CreateIndex
CREATE INDEX "ItemEffect_itemId_idx" ON "ItemEffect"("itemId");

-- CreateIndex
CREATE INDEX "ItemEffect_effectId_idx" ON "ItemEffect"("effectId");

-- CreateIndex
CREATE INDEX "ItemEffect_ordering_idx" ON "ItemEffect"("ordering");

-- CreateIndex
CREATE UNIQUE INDEX "ItemEffect_itemId_effectId_ordering_key" ON "ItemEffect"("itemId", "effectId", "ordering");

-- CreateIndex
CREATE INDEX "Recipe_stationDefinitionId_idx" ON "Recipe"("stationDefinitionId");

-- CreateIndex
CREATE INDEX "Recipe_category_idx" ON "Recipe"("category");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_stationDefinitionId_fkey" FOREIGN KEY ("stationDefinitionId") REFERENCES "StationDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemEffect" ADD CONSTRAINT "ItemEffect_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemEffect" ADD CONSTRAINT "ItemEffect_effectId_fkey" FOREIGN KEY ("effectId") REFERENCES "EffectDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
