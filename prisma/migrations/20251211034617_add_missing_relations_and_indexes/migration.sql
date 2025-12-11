-- CreateIndex
CREATE INDEX "Encounter_isActive_idx" ON "Encounter"("isActive");

-- CreateIndex
CREATE INDEX "GuildQuest_isActive_idx" ON "GuildQuest"("isActive");

-- CreateIndex
CREATE INDEX "MarketListing_expiresAt_idx" ON "MarketListing"("expiresAt");

-- CreateIndex
CREATE INDEX "MarketTransaction_itemId_idx" ON "MarketTransaction"("itemId");

-- CreateIndex
CREATE INDEX "Quest_isActive_idx" ON "Quest"("isActive");

-- CreateIndex
CREATE INDEX "Quest_questType_idx" ON "Quest"("questType");

-- AddForeignKey
ALTER TABLE "CombatLog" ADD CONSTRAINT "CombatLog_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketTransaction" ADD CONSTRAINT "MarketTransaction_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketTransaction" ADD CONSTRAINT "MarketTransaction_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketTransaction" ADD CONSTRAINT "MarketTransaction_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketTransaction" ADD CONSTRAINT "MarketTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
