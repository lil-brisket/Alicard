/*
  Warnings:

  - You are about to drop the column `currentHealth` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `deathAt` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `deathReason` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `deathsUsed` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `floorsCleared` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `isDead` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `maxHealth` on the `Character` table. All the data in the column will be lost.
  - You are about to drop the column `totalPlayTime` on the `Character` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `currentHp` to the `Character` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `Character` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxHp` to the `Character` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `password` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `gender` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Character" DROP COLUMN "currentHealth",
DROP COLUMN "deathAt",
DROP COLUMN "deathReason",
DROP COLUMN "deathsUsed",
DROP COLUMN "floorsCleared",
DROP COLUMN "isDead",
DROP COLUMN "maxHealth",
DROP COLUMN "totalPlayTime",
ADD COLUMN     "currentHp" INTEGER NOT NULL,
ADD COLUMN     "deaths" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "floor" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "gender" TEXT NOT NULL,
ADD COLUMN     "location" TEXT NOT NULL DEFAULT 'Town Square',
ADD COLUMN     "maxHp" INTEGER NOT NULL,
ALTER COLUMN "maxStamina" DROP DEFAULT,
ALTER COLUMN "currentStamina" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "password" SET NOT NULL,
ALTER COLUMN "gender" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
