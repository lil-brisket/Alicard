"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import { PermissionIndicator } from "./_components/permission-indicator";
import { SkillPreviewPanel } from "./_components/skill-preview-panel";
import { EffectsManager } from "./_components/effects-manager";

type Tab = "basics" | "combat" | "effects" | "preview" | "history";

export default function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: skill, isLoading, refetch } = api.content.skills.get.useQuery({ id });
  const utils = api.useUtils();

  const [activeTab, setActiveTab] = useState<Tab>("basics");
  const [affectsExisting, setAffectsExisting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Form state
  const [basicsForm, setBasicsForm] = useState({
    name: "",
    slug: "",
    description: "",
    status: "DRAFT" as "DRAFT" | "ACTIVE" | "DISABLED",
    isArchived: false,
  });

  const [combatForm, setCombatForm] = useState({
    skillType: "ATTACK" as "ATTACK" | "BUFF" | "HEAL" | "UTILITY" | "DEBUFF",
    damageType: null as "PHYSICAL" | "MAGIC" | "TRUE" | null,
    staminaCost: 0,
    cooldownTurns: 0,
    castTimeTurns: 0,
    hits: 1,
    targeting: "SINGLE" as "SINGLE" | "MULTI" | "AOE",
    maxTargets: null as number | null,
    basePower: null as number | null,
    scalingStat: null as "VITALITY" | "STRENGTH" | "SPEED" | "DEXTERITY" | null,
    scalingRatio: 1.0,
    flatBonus: 0,
    levelUnlock: null as number | null,
  });

  useEffect(() => {
    if (skill) {
      setBasicsForm({
        name: skill.name,
        slug: skill.slug,
        description: skill.description ?? "",
        status: skill.status,
        isArchived: skill.isArchived,
      });
      setCombatForm({
        skillType: skill.skillType,
        damageType: skill.damageType,
        staminaCost: skill.staminaCost,
        cooldownTurns: skill.cooldownTurns,
        castTimeTurns: skill.castTimeTurns,
        hits: skill.hits,
        targeting: skill.targeting,
        maxTargets: skill.maxTargets,
        basePower: skill.basePower,
        scalingStat: skill.scalingStat,
        scalingRatio: skill.scalingRatio,
        flatBonus: skill.flatBonus,
        levelUnlock: skill.levelUnlock,
      });
      setHasChanges(false);
    }
  }, [skill]);

  const updateSkill = api.content.skills.update.useMutation({
    onSuccess: () => {
      toast.success("Skill saved");
      setHasChanges(false);
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSave = () => {
    updateSkill.mutate({
      id,
      ...basicsForm,
      ...combatForm,
      affectsExisting,
    });
  };

  const archiveMutation = api.content.skills.archive.useMutation({
    onSuccess: () => {
      toast.success("Archive status updated");
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cloneSkill = api.content.skills.clone.useMutation({
    onSuccess: (cloned) => {
      toast.success("Skill cloned");
      router.push(`/content/skills/${cloned.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteSkill = api.content.skills.delete.useMutation({
    onSuccess: () => {
      toast.success("Skill deleted");
      router.push("/content/skills");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">Loading skill...</p>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">Skill not found</p>
        <Link
          href="/content/skills"
          className="mt-4 inline-block text-cyan-400 hover:text-cyan-300"
        >
          Back to Skills
        </Link>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "basics", label: "Basics" },
    { id: "combat", label: "Combat Stats" },
    { id: "effects", label: "Effects" },
    { id: "preview", label: "Preview" },
    { id: "history", label: "History" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">{skill.name}</h2>
          <p className="text-sm text-slate-400">
            Key: <span className="font-mono">{skill.key}</span> | Slug:{" "}
            <span className="font-mono">{skill.slug}</span>
            {skill.isArchived && (
              <span className="ml-2 inline-flex rounded-full bg-gray-500/20 px-2 py-0.5 text-xs text-gray-400">
                Archived
              </span>
            )}
          </p>
        </div>
        <Link
          href="/content/skills"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Back to Skills
        </Link>
      </div>

      <PermissionIndicator />

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "border-b-2 border-cyan-400 text-cyan-400"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        {activeTab === "basics" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={basicsForm.name}
                onChange={(e) => {
                  setBasicsForm((prev) => ({ ...prev, name: e.target.value }));
                  setHasChanges(true);
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={basicsForm.slug}
                onChange={(e) => {
                  setBasicsForm((prev) => ({ ...prev, slug: e.target.value }));
                  setHasChanges(true);
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Description
              </label>
              <textarea
                value={basicsForm.description}
                onChange={(e) => {
                  setBasicsForm((prev) => ({ ...prev, description: e.target.value }));
                  setHasChanges(true);
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Status
              </label>
              <select
                value={basicsForm.status}
                onChange={(e) => {
                  setBasicsForm((prev) => ({
                    ...prev,
                    status: e.target.value as typeof basicsForm.status,
                  }));
                  setHasChanges(true);
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={basicsForm.isArchived}
                  onChange={(e) => {
                    setBasicsForm((prev) => ({ ...prev, isArchived: e.target.checked }));
                    setHasChanges(true);
                  }}
                  className="rounded border-slate-700"
                />
                <span className="text-sm text-slate-300">Archived</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === "combat" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Skill Type
                </label>
                <select
                  value={combatForm.skillType}
                  onChange={(e) => {
                    setCombatForm((prev) => ({
                      ...prev,
                      skillType: e.target.value as typeof combatForm.skillType,
                    }));
                    setHasChanges(true);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                >
                  <option value="ATTACK">Attack</option>
                  <option value="BUFF">Buff</option>
                  <option value="HEAL">Heal</option>
                  <option value="UTILITY">Utility</option>
                  <option value="DEBUFF">Debuff</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Damage Type
                </label>
                <select
                  value={combatForm.damageType || ""}
                  onChange={(e) => {
                    setCombatForm((prev) => ({
                      ...prev,
                      damageType: (e.target.value || null) as typeof combatForm.damageType,
                    }));
                    setHasChanges(true);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                >
                  <option value="">None</option>
                  <option value="PHYSICAL">Physical</option>
                  <option value="MAGIC">Magic</option>
                  <option value="TRUE">True</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  SP Cost
                </label>
                <input
                  type="number"
                  min={0}
                  value={combatForm.staminaCost}
                  onChange={(e) => {
                    setCombatForm((prev) => ({
                      ...prev,
                      staminaCost: parseInt(e.target.value) || 0,
                    }));
                    setHasChanges(true);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Cooldown (turns)
                </label>
                <input
                  type="number"
                  min={0}
                  value={combatForm.cooldownTurns}
                  onChange={(e) => {
                    setCombatForm((prev) => ({
                      ...prev,
                      cooldownTurns: parseInt(e.target.value) || 0,
                    }));
                    setHasChanges(true);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Cast Time (turns)
                </label>
                <input
                  type="number"
                  min={0}
                  value={combatForm.castTimeTurns}
                  onChange={(e) => {
                    setCombatForm((prev) => ({
                      ...prev,
                      castTimeTurns: parseInt(e.target.value) || 0,
                    }));
                    setHasChanges(true);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Hits
                </label>
                <input
                  type="number"
                  min={1}
                  value={combatForm.hits}
                  onChange={(e) => {
                    setCombatForm((prev) => ({
                      ...prev,
                      hits: parseInt(e.target.value) || 1,
                    }));
                    setHasChanges(true);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Targeting
                </label>
                <select
                  value={combatForm.targeting}
                  onChange={(e) => {
                    setCombatForm((prev) => ({
                      ...prev,
                      targeting: e.target.value as typeof combatForm.targeting,
                    }));
                    setHasChanges(true);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                >
                  <option value="SINGLE">Single</option>
                  <option value="MULTI">Multi</option>
                  <option value="AOE">AOE</option>
                </select>
              </div>
            </div>
            {combatForm.targeting !== "SINGLE" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Max Targets
                </label>
                <input
                  type="number"
                  min={2}
                  value={combatForm.maxTargets ?? ""}
                  onChange={(e) => {
                    setCombatForm((prev) => ({
                      ...prev,
                      maxTargets: e.target.value ? parseInt(e.target.value) : null,
                    }));
                    setHasChanges(true);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                />
              </div>
            )}
            <div className="border-t border-slate-700 pt-4">
              <h4 className="mb-4 text-md font-semibold text-cyan-400">Damage Definition</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Base Power
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={combatForm.basePower ?? ""}
                    onChange={(e) => {
                      setCombatForm((prev) => ({
                        ...prev,
                        basePower: e.target.value ? parseInt(e.target.value) : null,
                      }));
                      setHasChanges(true);
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Scaling Stat
                  </label>
                  <select
                    value={combatForm.scalingStat || ""}
                    onChange={(e) => {
                      setCombatForm((prev) => ({
                        ...prev,
                        scalingStat: (e.target.value || null) as typeof combatForm.scalingStat,
                      }));
                      setHasChanges(true);
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  >
                    <option value="">None</option>
                    <option value="VITALITY">Vitality</option>
                    <option value="STRENGTH">Strength</option>
                    <option value="SPEED">Speed</option>
                    <option value="DEXTERITY">Dexterity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Scaling Ratio
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={3}
                    value={combatForm.scalingRatio}
                    onChange={(e) => {
                      setCombatForm((prev) => ({
                        ...prev,
                        scalingRatio: parseFloat(e.target.value) || 0,
                      }));
                      setHasChanges(true);
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Flat Bonus
                  </label>
                  <input
                    type="number"
                    value={combatForm.flatBonus}
                    onChange={(e) => {
                      setCombatForm((prev) => ({
                        ...prev,
                        flatBonus: parseInt(e.target.value) || 0,
                      }));
                      setHasChanges(true);
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Level Unlock
              </label>
              <input
                type="number"
                min={1}
                value={combatForm.levelUnlock ?? ""}
                onChange={(e) => {
                  setCombatForm((prev) => ({
                    ...prev,
                    levelUnlock: e.target.value ? parseInt(e.target.value) : null,
                  }));
                  setHasChanges(true);
                }}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                placeholder="Optional"
              />
            </div>
          </div>
        )}

        {activeTab === "effects" && (
          <EffectsManager
            skillId={id}
            effects={skill.effects ?? []}
            onUpdate={() => void refetch()}
          />
        )}

        {activeTab === "preview" && (
          <SkillPreviewPanel skill={skill} />
        )}

        {activeTab === "history" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-cyan-400">Change History</h3>
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
              <p>TODO: Implement audit event history viewer</p>
              <p className="mt-2 text-xs">
                Created: {new Date(skill.createdAt).toLocaleString()}
              </p>
              <p className="text-xs">
                Updated: {new Date(skill.updatedAt).toLocaleString()}
              </p>
              <p className="text-xs">Version: {skill.version}</p>
            </div>
          </div>
        )}

        {/* Save Button */}
        {activeTab !== "preview" && activeTab !== "history" && (
          <div className="mt-6 border-t border-slate-700 pt-4">
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={affectsExisting}
                  onChange={(e) => setAffectsExisting(e.target.checked)}
                  className="rounded border-slate-700"
                />
                <span className="text-sm text-slate-300">
                  Affects existing skills (versioning)
                </span>
              </label>
            </div>
            <button
              onClick={handleSave}
              disabled={!hasChanges || updateSkill.isPending}
              className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateSkill.isPending
                ? "Saving..."
                : hasChanges
                  ? "Save Changes"
                  : "No Changes"}
            </button>
          </div>
        )}
      </div>

      {/* Actions Sidebar */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-cyan-400">Actions</h3>
        <div className="space-y-3">
          <button
            onClick={() => {
              const key = prompt("Enter key for cloned skill:", `${skill.key}_copy`);
              if (key) {
                cloneSkill.mutate({ id, key, name: `${skill.name} (Copy)` });
              }
            }}
            disabled={cloneSkill.isPending}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            Clone Skill
          </button>
          <button
            onClick={() => {
              archiveMutation.mutate({
                id,
                isArchived: !skill.isArchived,
              });
            }}
            disabled={archiveMutation.isPending}
            className="w-full rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700 disabled:opacity-50"
          >
            {skill.isArchived ? "Unarchive" : "Archive"}
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  "Are you sure you want to permanently delete this skill? This action cannot be undone."
                )
              ) {
                deleteSkill.mutate({ id });
              }
            }}
            disabled={deleteSkill.isPending}
            className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            Delete Skill
          </button>
        </div>
      </div>
    </div>
  );
}
