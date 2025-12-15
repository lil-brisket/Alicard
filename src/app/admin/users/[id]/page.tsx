"use client";

import { use, useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import { UserDetailForm } from "./_components/user-detail-form";

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
  const { data: user, isLoading } = api.admin.users.getUserById.useQuery({
    id,
  });
  const { data: actions } = api.admin.users.listAdminActions.useQuery({
    targetUserId: id,
    limit: 20,
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

          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-cyan-400">
              Recent Admin Actions
            </h3>
            {actions && actions.length > 0 ? (
              <div className="space-y-2">
                {actions.map((action) => (
                  <div
                    key={action.id}
                    className="rounded border border-slate-800 bg-slate-800/30 p-3 text-sm"
                  >
                    <div className="font-medium text-cyan-400">
                      {action.action}
                    </div>
                    <div className="text-slate-400">
                      by {action.actor.username} on{" "}
                      {new Date(action.createdAt).toLocaleString()}
                    </div>
                    {action.reason && (
                      <div className="mt-1 text-slate-500">
                        Reason: {action.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No actions logged</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
