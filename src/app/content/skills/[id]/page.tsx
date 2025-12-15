"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import { PermissionIndicator } from "./_components/permission-indicator";

export default function SkillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: skill, isLoading } = api.content.skills.get.useQuery({ id });
  const utils = api.useUtils();

  const [affectsExisting, setAffectsExisting] = useState(false);
  
  const updateSkill = api.content.skills.update.useMutation({
    onSuccess: () => {
      toast.success("Skill updated");
      void utils.content.skills.get.invalidate({ id });
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

  const enableSkill = api.content.skills.enable.useMutation({
    onSuccess: () => {
      toast.success("Skill enabled");
      void utils.content.skills.get.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const disableSkill = api.content.skills.disable.useMutation({
    onSuccess: () => {
      toast.success("Skill disabled");
      void utils.content.skills.get.invalidate({ id });
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

  const tags = (skill.tags as string[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">{skill.name}</h2>
          <p className="text-sm text-slate-400">
            Key: <span className="font-mono">{skill.key}</span> | ID: {skill.id}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-cyan-400">
            Skill Details
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Name
              </label>
              <input
                type="text"
                defaultValue={skill.name}
                onBlur={(e) =>
                  updateSkill.mutate({ id, name: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Key
              </label>
              <input
                type="text"
                defaultValue={skill.key}
                onBlur={(e) =>
                  updateSkill.mutate({ id, key: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-slate-100"
                disabled
              />
              <p className="mt-1 text-xs text-slate-400">
                Key cannot be changed after creation
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Description
              </label>
              <textarea
                defaultValue={skill.description || ""}
                onBlur={(e) =>
                  updateSkill.mutate({ id, description: e.target.value || null })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Status
              </label>
              <select
                defaultValue={skill.status}
                onChange={(e) =>
                  updateSkill.mutate({
                    id,
                    status: e.target.value as "DRAFT" | "ACTIVE" | "DISABLED",
                    affectsExisting,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Stamina Cost
              </label>
              <input
                type="number"
                min={0}
                defaultValue={skill.staminaCost}
                onBlur={(e) =>
                  updateSkill.mutate({
                    id,
                    staminaCost: parseInt(e.target.value) || 0,
                    affectsExisting,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Cooldown (Turns)
              </label>
              <input
                type="number"
                min={0}
                defaultValue={skill.cooldownTurns}
                onBlur={(e) =>
                  updateSkill.mutate({
                    id,
                    cooldownTurns: parseInt(e.target.value) || 0,
                    affectsExisting,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300">
                Level Unlock
              </label>
              <input
                type="number"
                min={1}
                defaultValue={skill.levelUnlock ?? ""}
                onBlur={(e) =>
                  updateSkill.mutate({
                    id,
                    levelUnlock: e.target.value ? parseInt(e.target.value) : null,
                    affectsExisting,
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
                placeholder="e.g., 5, 10, 20"
              />
            </div>
            <div>
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
              <p className="mt-1 text-xs text-slate-400">
                If unchecked, only newly assigned skills will use new stats
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Preview</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-slate-300">{skill.name}</span>
              </div>
              {skill.description && (
                <div className="text-slate-400">{skill.description}</div>
              )}
              <div className="mt-4 space-y-1 text-xs">
                <div>
                  <span className="text-slate-400">Stamina Cost:</span>{" "}
                  <span className="text-slate-300">{skill.staminaCost}</span>
                </div>
                <div>
                  <span className="text-slate-400">Cooldown:</span>{" "}
                  <span className="text-slate-300">{skill.cooldownTurns} turns</span>
                </div>
                {skill.levelUnlock && (
                  <div>
                    <span className="text-slate-400">Unlocked at level:</span>{" "}
                    <span className="text-slate-300">{skill.levelUnlock}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400">Status:</span>{" "}
                  <span
                    className={
                      skill.status === "DISABLED"
                        ? "text-red-400"
                        : skill.status === "ACTIVE"
                          ? "text-green-400"
                          : "text-yellow-400"
                    }
                  >
                    {skill.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Version:</span>{" "}
                  <span className="text-slate-300">{skill.version}</span>
                </div>
                {tags.length > 0 && (
                  <div className="mt-2">
                    <div className="text-slate-400 mb-1">Tags:</div>
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  const key = prompt("Enter key for cloned skill:", `${skill.key}_copy`);
                  const name = prompt("Enter name for cloned skill:", `${skill.name} (Copy)`);
                  if (key && name) {
                    cloneSkill.mutate({ id, key, name });
                  }
                }}
                disabled={cloneSkill.isPending}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                Clone Skill
              </button>
              {skill.status === "DISABLED" ? (
                <button
                  onClick={() => enableSkill.mutate({ id })}
                  disabled={enableSkill.isPending}
                  className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  Enable Skill
                </button>
              ) : (
                <button
                  onClick={() => disableSkill.mutate({ id })}
                  disabled={disableSkill.isPending}
                  className="w-full rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-700 disabled:opacity-50"
                >
                  Disable Skill
                </button>
              )}
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

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">Metadata</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Created:</span>{" "}
                <span className="text-slate-300">
                  {new Date(skill.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Updated:</span>{" "}
                <span className="text-slate-300">
                  {new Date(skill.updatedAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>{" "}
                <span
                  className={
                    skill.status === "DISABLED"
                      ? "text-red-400"
                      : skill.status === "ACTIVE"
                        ? "text-green-400"
                        : "text-yellow-400"
                  }
                >
                  {skill.status}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Version:</span>{" "}
                <span className="text-slate-300">{skill.version}</span>
              </div>
              {tags.length > 0 && (
                <div>
                  <span className="text-slate-400">Tags:</span>{" "}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
