-- CreateEnum
CREATE TYPE "TileType" AS ENUM ('GRASS', 'FOREST', 'MOUNTAIN', 'RIVER', 'DESERT', 'DUNGEON', 'TOWN', 'SHRINE', 'ROAD');

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('SAFE', 'LOW_DANGER', 'MEDIUM_DANGER', 'HIGH_DANGER', 'EXTREME_DANGER');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ORE', 'HERB', 'FISH', 'WOOD', 'RARE_ITEM');

-- CreateEnum
CREATE TYPE "NPCType" AS ENUM ('MERCHANT', 'QUEST_GIVER', 'TRAINER', 'BANKER', 'GUILD_MASTER', 'GUARD', 'TAVERN_KEEPER');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('WEAPON', 'ARMOR', 'ACCESSORY', 'CONSUMABLE', 'MATERIAL', 'QUEST_ITEM', 'TOOL');

-- CreateEnum
CREATE TYPE "ItemRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "EquipmentSlot" AS ENUM ('WEAPON', 'HEAD', 'CHEST', 'LEGS', 'FEET', 'ACCESSORY_1', 'ACCESSORY_2');

-- CreateEnum
CREATE TYPE "PrimaryOccupation" AS ENUM ('BLACKSMITH', 'ALCHEMIST', 'COOK', 'TAILOR', 'MERCHANT', 'BEAST_HANDLER');

-- CreateEnum
CREATE TYPE "SecondaryOccupation" AS ENUM ('MINER', 'HERBALIST', 'FISHER', 'LOGGER', 'FORAGER');

-- CreateEnum
CREATE TYPE "GuildRole" AS ENUM ('LEADER', 'OFFICER', 'MEMBER');

-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('KILL', 'GATHER', 'DELIVER', 'EXPLORE', 'CRAFT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT;

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "vitality" INTEGER NOT NULL DEFAULT 5,
    "strength" INTEGER NOT NULL DEFAULT 5,
    "speed" INTEGER NOT NULL DEFAULT 5,
    "dexterity" INTEGER NOT NULL DEFAULT 5,
    "maxHealth" INTEGER NOT NULL DEFAULT 100,
    "currentHealth" INTEGER NOT NULL DEFAULT 100,
    "maxStamina" INTEGER NOT NULL DEFAULT 50,
    "currentStamina" INTEGER NOT NULL DEFAULT 50,
    "deathsUsed" INTEGER NOT NULL DEFAULT 0,
    "floorsCleared" INTEGER NOT NULL DEFAULT 0,
    "totalPlayTime" INTEGER NOT NULL DEFAULT 0,
    "isDead" BOOLEAN NOT NULL DEFAULT false,
    "deathAt" TIMESTAMP(3),
    "deathReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterName" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "deathCount" INTEGER NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerStats" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "vitality" INTEGER NOT NULL DEFAULT 10,
    "strength" INTEGER NOT NULL DEFAULT 10,
    "speed" INTEGER NOT NULL DEFAULT 10,
    "dexterity" INTEGER NOT NULL DEFAULT 10,
    "maxHP" INTEGER NOT NULL DEFAULT 100,
    "currentHP" INTEGER NOT NULL DEFAULT 100,
    "maxSP" INTEGER NOT NULL DEFAULT 50,
    "currentSP" INTEGER NOT NULL DEFAULT 50,
    "statPoints" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapTile" (
    "id" SERIAL NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "tileType" "TileType" NOT NULL,
    "zoneType" "ZoneType" NOT NULL,
    "isSafeZone" BOOLEAN NOT NULL DEFAULT false,
    "hasResource" BOOLEAN NOT NULL DEFAULT false,
    "resourceType" "ResourceType",
    "description" TEXT,

    CONSTRAINT "MapTile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapPosition" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "tileX" INTEGER NOT NULL,
    "tileY" INTEGER NOT NULL,
    "tileId" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NPC" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "npcType" "NPCType" NOT NULL,
    "tileX" INTEGER NOT NULL,
    "tileY" INTEGER NOT NULL,
    "tileId" INTEGER,
    "dialogue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NPC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" TEXT NOT NULL,
    "npcId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "itemType" "ItemType" NOT NULL,
    "itemRarity" "ItemRarity" NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "value" INTEGER NOT NULL,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "maxStack" INTEGER NOT NULL DEFAULT 1,
    "equipmentSlot" "EquipmentSlot",
    "vitalityBonus" INTEGER NOT NULL DEFAULT 0,
    "strengthBonus" INTEGER NOT NULL DEFAULT 0,
    "speedBonus" INTEGER NOT NULL DEFAULT 0,
    "dexterityBonus" INTEGER NOT NULL DEFAULT 0,
    "hpBonus" INTEGER NOT NULL DEFAULT 0,
    "spBonus" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "weaponId" TEXT,
    "headId" TEXT,
    "chestId" TEXT,
    "legsId" TEXT,
    "feetId" TEXT,
    "accessory1Id" TEXT,
    "accessory2Id" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Occupation" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "primaryJob" "PrimaryOccupation",
    "secondaryJob" "SecondaryOccupation",
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Occupation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerSkill" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "skillName" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Encounter" (
    "id" TEXT NOT NULL,
    "tileX" INTEGER NOT NULL,
    "tileY" INTEGER NOT NULL,
    "tileId" INTEGER,
    "enemyType" TEXT NOT NULL,
    "enemyLevel" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Encounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombatLog" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "encounterId" TEXT,
    "turnNumber" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CombatLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeathLog" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "deathCount" INTEGER NOT NULL,
    "cause" TEXT,
    "locationX" INTEGER,
    "locationY" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeathLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMember" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "role" "GuildRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildBank" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildQuest" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reward" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildQuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "vaultLevel" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankVaultItem" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankVaultItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketListing" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerUnit" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "listingTax" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "soldAt" TIMESTAMP(3),

    CONSTRAINT "MarketListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketTransaction" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "npcId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "questType" "QuestType" NOT NULL,
    "reward" TEXT,
    "requirements" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_characterName_key" ON "Player"("characterName");

-- CreateIndex
CREATE INDEX "Player_characterName_idx" ON "Player"("characterName");

-- CreateIndex
CREATE INDEX "Player_userId_idx" ON "Player"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStats_playerId_key" ON "PlayerStats"("playerId");

-- CreateIndex
CREATE INDEX "MapTile_x_y_idx" ON "MapTile"("x", "y");

-- CreateIndex
CREATE INDEX "MapTile_tileType_idx" ON "MapTile"("tileType");

-- CreateIndex
CREATE INDEX "MapTile_zoneType_idx" ON "MapTile"("zoneType");

-- CreateIndex
CREATE UNIQUE INDEX "MapTile_x_y_key" ON "MapTile"("x", "y");

-- CreateIndex
CREATE UNIQUE INDEX "MapPosition_playerId_key" ON "MapPosition"("playerId");

-- CreateIndex
CREATE INDEX "MapPosition_tileX_tileY_idx" ON "MapPosition"("tileX", "tileY");

-- CreateIndex
CREATE INDEX "NPC_tileX_tileY_idx" ON "NPC"("tileX", "tileY");

-- CreateIndex
CREATE INDEX "NPC_npcType_idx" ON "NPC"("npcType");

-- CreateIndex
CREATE INDEX "NPC_tileId_idx" ON "NPC"("tileId");

-- CreateIndex
CREATE INDEX "Item_itemType_idx" ON "Item"("itemType");

-- CreateIndex
CREATE INDEX "Item_itemRarity_idx" ON "Item"("itemRarity");

-- CreateIndex
CREATE INDEX "Item_tier_idx" ON "Item"("tier");

-- CreateIndex
CREATE INDEX "InventoryItem_playerId_idx" ON "InventoryItem"("playerId");

-- CreateIndex
CREATE INDEX "InventoryItem_itemId_idx" ON "InventoryItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_playerId_key" ON "Equipment"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Occupation_playerId_key" ON "Occupation"("playerId");

-- CreateIndex
CREATE INDEX "PlayerSkill_playerId_idx" ON "PlayerSkill"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSkill_playerId_skillName_key" ON "PlayerSkill"("playerId", "skillName");

-- CreateIndex
CREATE INDEX "Encounter_tileX_tileY_idx" ON "Encounter"("tileX", "tileY");

-- CreateIndex
CREATE INDEX "Encounter_tileId_idx" ON "Encounter"("tileId");

-- CreateIndex
CREATE INDEX "CombatLog_playerId_idx" ON "CombatLog"("playerId");

-- CreateIndex
CREATE INDEX "CombatLog_encounterId_idx" ON "CombatLog"("encounterId");

-- CreateIndex
CREATE INDEX "DeathLog_playerId_idx" ON "DeathLog"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_name_key" ON "Guild"("name");

-- CreateIndex
CREATE INDEX "Guild_name_idx" ON "Guild"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMember_playerId_key" ON "GuildMember"("playerId");

-- CreateIndex
CREATE INDEX "GuildMember_guildId_idx" ON "GuildMember"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildBank_guildId_key" ON "GuildBank"("guildId");

-- CreateIndex
CREATE INDEX "GuildQuest_guildId_idx" ON "GuildQuest"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_playerId_key" ON "BankAccount"("playerId");

-- CreateIndex
CREATE INDEX "BankVaultItem_accountId_idx" ON "BankVaultItem"("accountId");

-- CreateIndex
CREATE INDEX "BankVaultItem_itemId_idx" ON "BankVaultItem"("itemId");

-- CreateIndex
CREATE INDEX "MarketListing_playerId_idx" ON "MarketListing"("playerId");

-- CreateIndex
CREATE INDEX "MarketListing_itemId_idx" ON "MarketListing"("itemId");

-- CreateIndex
CREATE INDEX "MarketListing_isActive_idx" ON "MarketListing"("isActive");

-- CreateIndex
CREATE INDEX "MarketTransaction_buyerId_idx" ON "MarketTransaction"("buyerId");

-- CreateIndex
CREATE INDEX "MarketTransaction_sellerId_idx" ON "MarketTransaction"("sellerId");

-- CreateIndex
CREATE INDEX "MarketTransaction_listingId_idx" ON "MarketTransaction"("listingId");

-- CreateIndex
CREATE INDEX "Quest_npcId_idx" ON "Quest"("npcId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStats" ADD CONSTRAINT "PlayerStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPosition" ADD CONSTRAINT "MapPosition_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapPosition" ADD CONSTRAINT "MapPosition_tileId_fkey" FOREIGN KEY ("tileId") REFERENCES "MapTile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NPC" ADD CONSTRAINT "NPC_tileId_fkey" FOREIGN KEY ("tileId") REFERENCES "MapTile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopItem" ADD CONSTRAINT "ShopItem_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "NPC"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopItem" ADD CONSTRAINT "ShopItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_headId_fkey" FOREIGN KEY ("headId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_chestId_fkey" FOREIGN KEY ("chestId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_legsId_fkey" FOREIGN KEY ("legsId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_feetId_fkey" FOREIGN KEY ("feetId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_accessory1Id_fkey" FOREIGN KEY ("accessory1Id") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_accessory2Id_fkey" FOREIGN KEY ("accessory2Id") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occupation" ADD CONSTRAINT "Occupation_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkill" ADD CONSTRAINT "PlayerSkill_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Encounter" ADD CONSTRAINT "Encounter_tileId_fkey" FOREIGN KEY ("tileId") REFERENCES "MapTile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombatLog" ADD CONSTRAINT "CombatLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeathLog" ADD CONSTRAINT "DeathLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildBank" ADD CONSTRAINT "GuildBank_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildQuest" ADD CONSTRAINT "GuildQuest_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankVaultItem" ADD CONSTRAINT "BankVaultItem_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankVaultItem" ADD CONSTRAINT "BankVaultItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketListing" ADD CONSTRAINT "MarketListing_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketListing" ADD CONSTRAINT "MarketListing_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "NPC"("id") ON DELETE SET NULL ON UPDATE CASCADE;
