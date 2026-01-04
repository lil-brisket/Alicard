-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "requiredJobLevel" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Recipe_requiredJobLevel_idx" ON "Recipe"("requiredJobLevel");
