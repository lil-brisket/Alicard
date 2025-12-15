"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

export default function PlayerAssignmentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedItemTemplateId, setSelectedItemTemplateId] = useState<string | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);

  const { data: players, isLoading: playersLoading } =
    api.content.playerAssignment.listPlayers.useQuery({
      search: searchQuery,
      limit: 20,
    });

  const { data: skills, isLoading: skillsLoading } =
    api.content.skills.list.useQuery({
      status: "ACTIVE",
      limit: 100,
    });

  const { data: items, isLoading: itemsLoading } =
    api.content.items.list.useQuery({
      status: "ACTIVE",
      limit: 100,
    });

  const { data: playerInventory, refetch: refetchPlayerInventory } =
    api.content.playerAssignment.getPlayerInventory.useQuery(
      { playerId: selectedPlayerId! },
      { enabled: !!selectedPlayerId }
    );

  const { data: playerSkills, refetch: refetchPlayerSkills } =
    api.content.playerAssignment.getPlayerSkills.useQuery(
      { playerId: selectedPlayerId! },
      { enabled: !!selectedPlayerId }
    );

  const assignSkill = api.content.playerAssignment.assignSkill.useMutation({
    onSuccess: () => {
      toast.success("Skill assigned successfully");
      setSelectedSkillId(null);
      void refetchPlayerSkills();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeSkill = api.content.playerAssignment.removeSkill.useMutation({
    onSuccess: () => {
      toast.success("Skill removed successfully");
      void refetchPlayerSkills();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const assignItem = api.content.playerAssignment.assignItem.useMutation({
    onSuccess: () => {
      toast.success("Item assigned successfully");
      setSelectedItemTemplateId(null);
      setItemQuantity(1);
      void refetchPlayerInventory();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const removeItem = api.content.playerAssignment.removeItem.useMutation({
    onSuccess: () => {
      toast.success("Item removed successfully");
      void refetchPlayerInventory();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const selectedPlayer = players?.find((p) => p.id === selectedPlayerId);

  const handleAssignSkill = () => {
    if (!selectedPlayerId || !selectedSkillId) {
      toast.error("Please select both a player and a skill");
      return;
    }

    assignSkill.mutate({
      playerId: selectedPlayerId,
      skillId: selectedSkillId,
    });
  };

  const handleRemoveSkill = (skillId: string) => {
    if (!selectedPlayerId) return;

    if (
      confirm(
        "Are you sure you want to remove this skill from the player?"
      )
    ) {
      removeSkill.mutate({
        playerId: selectedPlayerId,
        skillId,
      });
    }
  };

  const handleAssignItem = () => {
    if (!selectedPlayerId || !selectedItemTemplateId) {
      toast.error("Please select both a player and an item");
      return;
    }

    assignItem.mutate({
      playerId: selectedPlayerId,
      itemTemplateId: selectedItemTemplateId,
      quantity: itemQuantity,
    });
  };

  const handleRemoveItem = (inventoryItemId: string, quantity?: number) => {
    if (!selectedPlayerId) return;

    const message = quantity
      ? `Are you sure you want to remove ${quantity} of this item?`
      : "Are you sure you want to remove this item from the player?";

    if (confirm(message)) {
      removeItem.mutate({
        playerId: selectedPlayerId,
        inventoryItemId,
        quantity,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-cyan-400">
          Assign Content to Players
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Assign items, quests, and skills to players
        </p>
      </div>

      {/* Player Search */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-cyan-400">
          Select Player
        </h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search by character name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          />

          {playersLoading ? (
            <p className="text-slate-400">Loading players...</p>
          ) : players && players.length > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayerId(player.id)}
                  className={`w-full rounded-lg border px-4 py-2 text-left transition ${
                    selectedPlayerId === player.id
                      ? "border-cyan-500 bg-cyan-500/20"
                      : "border-slate-700 bg-slate-800 hover:border-slate-600"
                  }`}
                >
                  <div className="font-medium text-slate-200">
                    {player.characterName}
                  </div>
                  <div className="text-xs text-slate-400">
                    User: {player.user.username} | Level: {player.level}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">No players found</p>
          )}
        </div>
      </div>

      {/* Selected Player Info and Assignments */}
      {selectedPlayer && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Assign Skills */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">
              Assign Skill
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Select Skill
                </label>
                <select
                  value={selectedSkillId || ""}
                  onChange={(e) => setSelectedSkillId(e.target.value || null)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  disabled={skillsLoading}
                >
                  <option value="">-- Select a skill --</option>
                  {skills?.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name} ({skill.key})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleAssignSkill}
                disabled={!selectedSkillId || assignSkill.isPending}
                className="w-full rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
              >
                {assignSkill.isPending ? "Assigning..." : "Assign Skill"}
              </button>
            </div>

            {/* Player's Current Skills */}
            <div className="mt-6">
              <h4 className="mb-2 text-sm font-medium text-slate-300">
                Current Skills
              </h4>
              {playerSkills && playerSkills.length > 0 ? (
                <div className="space-y-2">
                  {playerSkills.map((playerSkill) => (
                    <div
                      key={playerSkill.id}
                      className="flex items-center justify-between rounded bg-slate-800/50 px-3 py-2"
                    >
                      <div>
                        <div className="font-medium text-slate-200">
                          {playerSkill.skill?.name ?? "Unknown Skill"}
                        </div>
                        {playerSkill.skill?.key && (
                          <div className="text-xs text-slate-400 font-mono">
                            {playerSkill.skill.key}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveSkill(playerSkill.skillId)}
                        disabled={removeSkill.isPending}
                        className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No skills assigned yet
                </p>
              )}
            </div>
          </div>

          {/* Assign Items */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">
              Assign Item
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Select Item Template
                </label>
                <select
                  value={selectedItemTemplateId || ""}
                  onChange={(e) => setSelectedItemTemplateId(e.target.value || null)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  disabled={itemsLoading}
                >
                  <option value="">-- Select an item --</option>
                  {items?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.rarity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(parseInt(e.target.value) || 1)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>

              <button
                onClick={handleAssignItem}
                disabled={!selectedItemTemplateId || assignItem.isPending}
                className="w-full rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
              >
                {assignItem.isPending ? "Assigning..." : "Assign Item"}
              </button>
            </div>

            {/* Player's Current Inventory */}
            <div className="mt-6">
              <h4 className="mb-2 text-sm font-medium text-slate-300">
                Current Inventory
              </h4>
              {playerInventory && playerInventory.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {playerInventory.map((inventoryItem) => (
                    <div
                      key={inventoryItem.id}
                      className="flex items-center justify-between rounded bg-slate-800/50 px-3 py-2"
                    >
                      <div>
                        <div className="font-medium text-slate-200">
                          {inventoryItem.item.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          Quantity: {inventoryItem.quantity} | Type: {inventoryItem.item.itemType}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(inventoryItem.id)}
                        disabled={removeItem.isPending}
                        className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  No items in inventory
                </p>
              )}
            </div>
          </div>

          {/* Player Info */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">
              Player Info
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Character:</span>{" "}
                <span className="text-slate-300">{selectedPlayer.characterName}</span>
              </div>
              <div>
                <span className="text-slate-400">User:</span>{" "}
                <span className="text-slate-300">{selectedPlayer.user.username}</span>
              </div>
              <div>
                <span className="text-slate-400">Level:</span>{" "}
                <span className="text-slate-300">{selectedPlayer.level}</span>
              </div>
              <div>
                <span className="text-slate-400">Experience:</span>{" "}
                <span className="text-slate-300">{selectedPlayer.experience}</span>
              </div>
              <div>
                <span className="text-slate-400">Gold:</span>{" "}
                <span className="text-slate-300">{selectedPlayer.gold}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quest Assignment - Placeholder */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-cyan-400">
          Quest Assignment
        </h3>
        <p className="text-slate-400">
          Quest assignment coming soon. This requires proper Quest/QuestTemplate
          relationship implementation.
        </p>
      </div>
    </div>
  );
}
