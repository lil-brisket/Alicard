"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { useDebounce } from "~/hooks/use-debounce";
import { toast } from "react-hot-toast";

export default function ContentSkillsPage() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [skillTypeFilter, setSkillTypeFilter] = useState<string | undefined>();
  const [damageTypeFilter, setDamageTypeFilter] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"updatedAt" | "basePower" | "staminaCost" | "cooldownTurns">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const debouncedSearch = useDebounce(search, 300);

  const { data: skills, isLoading, refetch } = api.content.skills.list.useQuery({
    includeArchived,
    status: statusFilter as "DRAFT" | "ACTIVE" | "DISABLED" | undefined,
    skillType: skillTypeFilter as "ATTACK" | "BUFF" | "HEAL" | "UTILITY" | "DEBUFF" | undefined,
    damageType: damageTypeFilter as "PHYSICAL" | "MAGIC" | "TRUE" | undefined,
    search: debouncedSearch || undefined,
    sortBy,
    sortOrder,
    limit: 100,
  });

  const archiveMutation = api.content.skills.archive.useMutation({
    onSuccess: () => {
      toast.success("Skill archived status updated");
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const cloneMutation = api.content.skills.clone.useMutation({
    onSuccess: () => {
      toast.success("Skill cloned");
      void refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleClone = (skill: { id: string; key: string; name: string }) => {
    const newKey = prompt(`Enter key for cloned skill:`, `${skill.key}_copy`);
    if (!newKey) return;
    
    cloneMutation.mutate({
      id: skill.id,
      key: newKey,
      name: `${skill.name} (Copy)`,
    });
  };

  const handleArchive = (skill: { id: string; isArchived: boolean }) => {
    archiveMutation.mutate({
      id: skill.id,
      isArchived: !skill.isArchived,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">Skill Templates</h2>
          <p className="mt-1 text-sm text-slate-400">
            Manage game skill templates with combat stats and effects
          </p>
        </div>
        <Link
          href="/content/skills/new"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
        >
          Create Skill
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, key, slug..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Status
            </label>
            <select
              value={statusFilter || ""}
              onChange={(e) => setStatusFilter(e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">All</option>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Skill Type
            </label>
            <select
              value={skillTypeFilter || ""}
              onChange={(e) => setSkillTypeFilter(e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">All</option>
              <option value="ATTACK">Attack</option>
              <option value="BUFF">Buff</option>
              <option value="HEAL">Heal</option>
              <option value="UTILITY">Utility</option>
              <option value="DEBUFF">Debuff</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Damage Type
            </label>
            <select
              value={damageTypeFilter || ""}
              onChange={(e) => setDamageTypeFilter(e.target.value || undefined)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">All</option>
              <option value="PHYSICAL">Physical</option>
              <option value="MAGIC">Magic</option>
              <option value="TRUE">True</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              className="rounded border-slate-700"
            />
            <span className="text-sm text-slate-300">Include Archived</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
            >
              <option value="updatedAt">Updated</option>
              <option value="basePower">Base Power</option>
              <option value="staminaCost">SP Cost</option>
              <option value="cooldownTurns">Cooldown</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 hover:bg-slate-700"
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
      </div>

      {/* Skills Table */}
      {isLoading ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">Loading skills...</p>
        </div>
      ) : skills && skills.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Damage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  SP Cost
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Cooldown
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {skills.map((skill) => (
                <tr key={skill.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{skill.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{skill.slug}</div>
                    {skill.isArchived && (
                      <span className="inline-flex mt-1 rounded-full bg-gray-500/20 px-2 py-0.5 text-xs text-gray-400">
                        Archived
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="text-slate-300">{skill.skillType}</div>
                    {skill.damageType && (
                      <div className="text-xs text-slate-500">{skill.damageType}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {skill.basePower ? (
                      <div>
                        <div>{skill.basePower}</div>
                        {skill.scalingStat && (
                          <div className="text-xs text-slate-500">
                            +{skill.scalingRatio}x {skill.scalingStat}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {skill.staminaCost}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {skill.cooldownTurns} turns
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs ${
                        skill.status === "ACTIVE"
                          ? "bg-green-500/20 text-green-400"
                          : skill.status === "DISABLED"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {skill.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/content/skills/${skill.id}`}
                        className="text-sm text-cyan-400 hover:text-cyan-300"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleClone(skill)}
                        className="text-sm text-blue-400 hover:text-blue-300"
                        disabled={cloneMutation.isPending}
                      >
                        Clone
                      </button>
                      <button
                        onClick={() => handleArchive(skill)}
                        className="text-sm text-gray-400 hover:text-gray-300"
                        disabled={archiveMutation.isPending}
                      >
                        {skill.isArchived ? "Unarchive" : "Archive"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">No skills found</p>
          <Link
            href="/content/skills/new"
            className="mt-4 inline-block text-cyan-400 hover:text-cyan-300"
          >
            Create your first skill
          </Link>
        </div>
      )}
    </div>
  );
}
