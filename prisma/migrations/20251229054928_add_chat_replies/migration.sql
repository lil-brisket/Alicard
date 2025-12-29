-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "parentMessageId" TEXT;

-- CreateIndex
CREATE INDEX "ChatMessage_parentMessageId_idx" ON "ChatMessage"("parentMessageId");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
