/*
  Warnings:

  - You are about to drop the column `feetId` on the `Equipment` table. All the data in the column will be lost.
  - You are about to drop the column `headId` on the `Equipment` table. All the data in the column will be lost.
  - You are about to drop the column `legsId` on the `Equipment` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Equipment" DROP CONSTRAINT "Equipment_feetId_fkey";

-- DropForeignKey
ALTER TABLE "Equipment" DROP CONSTRAINT "Equipment_headId_fkey";

-- DropForeignKey
ALTER TABLE "Equipment" DROP CONSTRAINT "Equipment_legsId_fkey";

-- AlterTable
ALTER TABLE "Equipment" DROP COLUMN "feetId",
DROP COLUMN "headId",
DROP COLUMN "legsId";
