"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function ContentSkillsPage() {
  const { data: skills, isLoading } = api.content.skills.list.useQuery({
    limit: 100,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">Skill Templates</h2>
          <p className="mt-1 text-sm text-slate-400">
            Manage game skill templates
          </p>
        </div>
        <Link
          href="/content/skills/new"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
        >
          Create Skill
        </Link>
      </div>

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
                  Key
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Stamina Cost
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
                  <td className="px-4 py-3 font-medium">{skill.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-400 font-mono">{skill.key}</span>
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
                    <Link
                      href={`/content/skills/${skill.id}`}
                      className="text-sm text-cyan-400 hover:text-cyan-300"
                    >
                      Edit
                    </Link>
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
