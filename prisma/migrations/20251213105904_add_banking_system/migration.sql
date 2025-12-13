-- CreateEnum
CREATE TYPE "BankTransactionType" AS ENUM ('TRANSFER', 'DEPOSIT', 'WITHDRAW', 'INTEREST');

-- AlterTable: Rename gold to balanceCoins and add lastInterestClaimedAt
ALTER TABLE "BankAccount" RENAME COLUMN "gold" TO "balanceCoins";
ALTER TABLE "BankAccount" ADD COLUMN "lastInterestClaimedAt" TIMESTAMP(3);

-- CreateTable: BankTransaction
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "type" "BankTransactionType" NOT NULL,
    "amountCoins" INTEGER NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "note" TEXT,
    "accountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankTransaction_fromUserId_idx" ON "BankTransaction"("fromUserId");

-- CreateIndex
CREATE INDEX "BankTransaction_toUserId_idx" ON "BankTransaction"("toUserId");

-- CreateIndex
CREATE INDEX "BankTransaction_accountId_idx" ON "BankTransaction"("accountId");

-- CreateIndex
CREATE INDEX "BankTransaction_createdAt_idx" ON "BankTransaction"("createdAt");

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
