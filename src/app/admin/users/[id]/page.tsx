"use client";

import { use, useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import { UserDetailForm } from "./_components/user-detail-form";

type Tab = "details" | "action-log";

function PlayerDataEditor({
  player,
  userId,
}: {
  player: {
    id: string;
    level: number;
    experience: number;
    userJobs: Array<{
      id: string;
      level: number;
      xp: number;
      job: {
        id: string;
        key: string;
        name: string;
      };
    }>;
  };
  userId: string;
}) {
  const utils = api.useUtils();
  const [editingLevel, setEditingLevel] = useState(false);
  const [editingExp, setEditingExp] = useState(false);
  const [editingJobs, setEditingJobs] = useState<Record<string, boolean>>({});
  const [level, setLevel] = useState(player.level);
  const [experience, setExperience] = useState(player.experience);
  const [jobLevels, setJobLevels] = useState<Record<string, number>>(
    Object.fromEntries(player.userJobs.map((job) => [job.id, job.level]))
  );
  const [jobXp, setJobXp] = useState<Record<string, number>>(
    Object.fromEntries(player.userJobs.map((job) => [job.id, job.xp]))
  );
  const [levelReason, setLevelReason] = useState("");
  const [expReason, setExpReason] = useState("");
  const [jobReasons, setJobReasons] = useState<Record<string, string>>({});

  const updateLevel = api.admin.users.updatePlayerLevel.useMutation({
    onSuccess: () => {
      toast.success("Player level updated");
      void utils.admin.users.getUserById.invalidate({ id: userId });
      setEditingLevel(false);
      setLevelReason("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateExperience = api.admin.users.updatePlayerExperience.useMutation({
    onSuccess: () => {
      toast.success("Player experience updated");
      void utils.admin.users.getUserById.invalidate({ id: userId });
      setEditingExp(false);
      setExpReason("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateJobLevel = api.admin.users.updateJobLevel.useMutation({
    onSuccess: async () => {
      toast.success("Job level updated");
      setEditingJobs({});
      setJobReasons({});
      await utils.admin.users.getUserById.invalidate({ id: userId });
      // Also invalidate jobs queries that the hub/professions pages use
      await utils.jobs.getMyJobs.invalidate();
      await utils.jobs.getJobProgression.invalidate();
    },
    onError: (error) => {
      console.error("Update job level error:", error);
      toast.error(error.message || "Failed to update job level");
    },
  });

  return (
    <div className="mt-4 space-y-4 border-t border-slate-800 pt-4">
      <h4 className="text-sm font-semibold text-cyan-400">Player Stats</h4>
      
      {/* Level Editor */}
      <div className="rounded border border-slate-800 bg-slate-800/30 p-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-slate-400">Level:</span>{" "}
            <span className="text-sm font-medium text-slate-200">
              {player.level}
            </span>
          </div>
          {editingLevel ? (
            <div className="flex-1 space-y-2 pl-4">
              <input
                type="number"
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                min="1"
              />
              <input
                type="text"
                placeholder="Reason for change..."
                value={levelReason}
                onChange={(e) => setLevelReason(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    updateLevel.mutate({
                      playerId: player.id,
                      level,
                      reason: levelReason,
                    });
                  }}
                  disabled={updateLevel.isPending || !levelReason}
                  className="rounded bg-cyan-600 px-3 py-1 text-xs text-white transition hover:bg-cyan-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingLevel(false);
                    setLevel(player.level);
                    setLevelReason("");
                  }}
                  className="rounded bg-slate-600 px-3 py-1 text-xs text-white transition hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditingLevel(true)}
              className="rounded bg-cyan-600 px-3 py-1 text-xs text-white transition hover:bg-cyan-700"
            >
              Edit Level
            </button>
          )}
        </div>
      </div>

      {/* Experience Editor */}
      <div className="rounded border border-slate-800 bg-slate-800/30 p-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-slate-400">Experience:</span>{" "}
            <span className="text-sm font-medium text-slate-200">
              {player.experience.toLocaleString()}
            </span>
          </div>
          {editingExp ? (
            <div className="flex-1 space-y-2 pl-4">
              <input
                type="number"
                value={experience}
                onChange={(e) => setExperience(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                min="0"
              />
              <input
                type="text"
                placeholder="Reason for change..."
                value={expReason}
                onChange={(e) => setExpReason(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    updateExperience.mutate({
                      playerId: player.id,
                      experience,
                      reason: expReason,
                    });
                  }}
                  disabled={updateExperience.isPending || !expReason}
                  className="rounded bg-cyan-600 px-3 py-1 text-xs text-white transition hover:bg-cyan-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingExp(false);
                    setExperience(player.experience);
                    setExpReason("");
                  }}
                  className="rounded bg-slate-600 px-3 py-1 text-xs text-white transition hover:bg-slate-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditingExp(true)}
              className="rounded bg-cyan-600 px-3 py-1 text-xs text-white transition hover:bg-cyan-700"
            >
              Edit Experience
            </button>
          )}
        </div>
      </div>

      {/* Job Levels Editor */}
      {player.userJobs.length > 0 && (
        <div className="rounded border border-slate-800 bg-slate-800/30 p-3">
          <h5 className="mb-2 text-sm font-semibold text-cyan-400">Job Levels</h5>
          <div className="space-y-2">
            {player.userJobs.map((userJob) => (
              <div key={userJob.id} className="rounded border border-slate-700 bg-slate-900/50 p-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-200">
                      {userJob.job.name}
                    </span>
                    <div className="text-xs text-slate-400">
                      Level {userJob.level} | XP: {userJob.xp.toLocaleString()}
                    </div>
                  </div>
                  {editingJobs[userJob.id] ? (
                    <div className="flex-1 space-y-2 pl-4">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-slate-400">Level</label>
                          <input
                            type="number"
                            value={jobLevels[userJob.id] ?? userJob.level}
                            onChange={(e) =>
                              setJobLevels({
                                ...jobLevels,
                                [userJob.id]: Number(e.target.value),
                              })
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                            min="1"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-slate-400">XP</label>
                          <input
                            type="number"
                            value={jobXp[userJob.id] ?? userJob.xp}
                            onChange={(e) =>
                              setJobXp({
                                ...jobXp,
                                [userJob.id]: Number(e.target.value),
                              })
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                            min="0"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Reason for change..."
                        value={jobReasons[userJob.id] ?? ""}
                        onChange={(e) =>
                          setJobReasons({
                            ...jobReasons,
                            [userJob.id]: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            updateJobLevel.mutate({
                              userJobId: userJob.id,
                              level: jobLevels[userJob.id] ?? userJob.level,
                              xp: jobXp[userJob.id] ?? userJob.xp,
                              reason: jobReasons[userJob.id] ?? "",
                            });
                          }}
                          disabled={updateJobLevel.isPending || !jobReasons[userJob.id]}
                          className="rounded bg-cyan-600 px-3 py-1 text-xs text-white transition hover:bg-cyan-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingJobs({
                              ...editingJobs,
                              [userJob.id]: false,
                            });
                            setJobLevels({
                              ...jobLevels,
                              [userJob.id]: userJob.level,
                            });
                            setJobXp({
                              ...jobXp,
                              [userJob.id]: userJob.xp,
                            });
                            setJobReasons({
                              ...jobReasons,
                              [userJob.id]: "",
                            });
                          }}
                          className="rounded bg-slate-600 px-3 py-1 text-xs text-white transition hover:bg-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingJobs({
                          ...editingJobs,
                          [userJob.id]: true,
                        });
                      }}
                      className="rounded bg-cyan-600 px-3 py-1 text-xs text-white transition hover:bg-cyan-700"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CharacterCard({ 
  character, 
  userId 
}: { 
  character: { id: string; name: string; level: number; currentHp: number; maxHp: number; deaths: number; permDeaths?: number | null }; 
  userId: string;
}) {
  const utils = api.useUtils();
  const [permDeaths, setPermDeaths] = useState(character.permDeaths ?? 0);
  const [reason, setReason] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const updatePermDeaths = api.admin.users.updatePermDeaths.useMutation({
    onSuccess: () => {
      toast.success("Perm deaths updated");
      void utils.admin.users.getUserById.invalidate({ id: userId });
      setIsEditing(false);
      setReason("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="rounded border border-slate-800 bg-slate-800/30 p-3">
      <div className="font-medium">{character.name}</div>
      <div className="text-sm text-slate-400">
        Level {character.level} | HP: {character.currentHp}/{character.maxHp} |
        Deaths: {character.deaths} | Perm Deaths: {character.permDeaths ?? 0}
      </div>
      {isEditing ? (
        <div className="mt-2 space-y-2">
          <input
            type="number"
            value={permDeaths}
            onChange={(e) => setPermDeaths(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100"
            min="0"
          />
          <input
            type="text"
            placeholder="Reason for change..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-100"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                updatePermDeaths.mutate({
                  characterId: character.id,
                  permDeaths,
                  reason,
                });
              }}
              disabled={updatePermDeaths.isPending || !reason}
              className="rounded bg-cyan-600 px-3 py-1 text-xs text-white transition hover:bg-cyan-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setPermDeaths(character.permDeaths ?? 0);
                setReason("");
              }}
              className="rounded bg-slate-600 px-3 py-1 text-xs text-white transition hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="mt-2 rounded bg-cyan-600 px-3 py-1 text-xs text-white transition hover:bg-cyan-700"
        >
          Edit Perm Deaths
        </button>
      )}
    </div>
  );
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const { data: user, isLoading } = api.admin.users.getUserById.useQuery({
    id,
  });
  const { data: actions, isLoading: isLoadingActions } = api.admin.users.listAdminActions.useQuery({
    targetUserId: id,
    limit: 100,
  });
  const { data: ipHistory } = api.admin.users.getIpHistory.useQuery({
    userId: id,
    limit: 50,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">Loading user...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">User not found</p>
        <Link
          href="/admin/users"
          className="mt-4 inline-block text-cyan-400 hover:text-cyan-300"
        >
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">
            User: {user.username}
          </h2>
          <p className="text-sm text-slate-400">{user.email}</p>
        </div>
        <Link
          href="/admin/users"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Back to Users
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab("details")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              activeTab === "details"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("action-log")}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              activeTab === "action-log"
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300"
            }`}
          >
            Action Log
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "details" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">
              Account Details
            </h3>
            <UserDetailForm user={user} />
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-cyan-400">
                Characters ({user.characters.length})
              </h3>
              {user.characters.length > 0 ? (
                <div className="space-y-2">
                  {user.characters.map((char) => (
                    <CharacterCard key={char.id} character={char} userId={user.id} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No characters</p>
              )}
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-cyan-400">
                Player Data
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-slate-400">Created:</span>{" "}
                  <span className="text-slate-200">
                    {new Date(user.createdAt).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Credit:</span>{" "}
                  <span className="text-slate-200">{user.credit ?? 0}</span>
                </div>
                {user.deletedAt && (
                  <div>
                    <span className="text-slate-400">Deleted:</span>{" "}
                    <span className="text-red-400">
                      {new Date(user.deletedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              {user.player && (
                <PlayerDataEditor player={user.player} userId={user.id} />
              )}
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="mb-4 text-lg font-semibold text-cyan-400">
                IP History
              </h3>
              {ipHistory && ipHistory.length > 0 ? (
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {ipHistory.map((ip) => (
                    <div key={ip.id} className="rounded border border-slate-800 bg-slate-800/30 p-3 text-sm">
                      <div className="font-medium text-slate-200">{ip.ipAddress}</div>
                      <div className="text-slate-400">
                        {new Date(ip.createdAt).toLocaleString()}
                      </div>
                      {ip.userAgent && (
                        <div className="mt-1 text-xs text-slate-500">{ip.userAgent}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No IP history</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "action-log" && (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-cyan-400">Admin Action Log</h3>
            <p className="mt-1 text-sm text-slate-400">
              Audit trail of all admin actions for this user
            </p>
          </div>

          {isLoadingActions ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
              <p className="text-slate-400">Loading actions...</p>
            </div>
          ) : actions && actions.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                      Actor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {actions.map((action) => (
                    <tr key={action.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {new Date(action.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">{action.actor.username}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-cyan-500/20 px-2 py-1 text-xs font-medium text-cyan-400">
                          {action.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {action.reason || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
              <p className="text-slate-400">No actions logged for this user</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
