"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import Link from "next/link";

export default function ModPanelPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: users, isLoading } = api.admin.users.searchUsers.useQuery(
    {
      query: searchQuery,
      limit: 20,
    },
    {
      enabled: searchQuery.length > 0,
    }
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-cyan-400">Mod Panel</h1>
          <Link
            href="/hub"
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
          >
            Back to Hub
          </Link>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search users by username, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 placeholder:text-slate-500"
          />
        </div>

        {isLoading && <p className="text-slate-400">Searching...</p>}

        {users && users.length > 0 && (
          <div className="mb-6 grid gap-4">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUserId(user.id)}
                className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-left transition hover:bg-slate-800"
              >
                <div className="font-medium">{user.username}</div>
                <div className="text-sm text-slate-400">{user.email}</div>
                <div className="text-xs text-slate-500">
                  Role: {user.role} | Created: {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedUserId && (
          <ModUserDetail userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
        )}
      </div>
    </div>
  );
}

function ModUserDetail({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data: user, isLoading } = api.admin.users.getUserById.useQuery({ id: userId });
  const { data: ipHistory } = api.admin.users.getIpHistory.useQuery({ userId, limit: 50 });

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
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">{user.username}</h2>
          <p className="text-sm text-slate-400">{user.email}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4">
            <h3 className="mb-2 text-sm font-semibold text-cyan-400">Account Information</h3>
            <div className="space-y-1 text-sm">
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
              <div>
                <span className="text-slate-400">Roles:</span>{" "}
                <span className="text-slate-200">
                  {user.roles && user.roles.length > 0
                    ? user.roles.map((r) => r.role).join(", ")
                    : user.role}
                </span>
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

          <ModBanMuteSection user={user} />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4">
            <h3 className="mb-2 text-sm font-semibold text-cyan-400">IP History</h3>
            {ipHistory && ipHistory.length > 0 ? (
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {ipHistory.map((ip) => (
                  <div key={ip.id} className="rounded bg-slate-900/50 p-2 text-xs">
                    <div className="font-medium text-slate-200">{ip.ipAddress}</div>
                    <div className="text-slate-400">
                      {new Date(ip.createdAt).toLocaleString()}
                    </div>
                    {ip.userAgent && (
                      <div className="mt-1 text-slate-500">{ip.userAgent}</div>
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
    </div>
  );
}

function ModBanMuteSection({ user }: { user: any }) {
  const utils = api.useUtils();
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<"1h" | "6h" | "12h" | "24h" | "3d" | "7d" | "30d" | "permanent">("24h");
  const [muteReason, setMuteReason] = useState("");
  const [muteDuration, setMuteDuration] = useState<"15m" | "30m" | "1h" | "6h" | "12h" | "24h" | "3d" | "7d" | "permanent">("1h");

  const banUser = api.admin.users.banUser.useMutation({
    onSuccess: () => {
      toast.success("User banned");
      void utils.admin.users.getUserById.invalidate({ id: user.id });
      setBanReason("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unbanUser = api.admin.users.unbanUser.useMutation({
    onSuccess: () => {
      toast.success("User unbanned");
      void utils.admin.users.getUserById.invalidate({ id: user.id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const muteUser = api.admin.users.muteUser.useMutation({
    onSuccess: () => {
      toast.success("User muted");
      void utils.admin.users.getUserById.invalidate({ id: user.id });
      setMuteReason("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unmuteUser = api.admin.users.unmuteUser.useMutation({
    onSuccess: () => {
      toast.success("User unmuted");
      void utils.admin.users.getUserById.invalidate({ id: user.id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4">
        <h3 className="mb-2 text-sm font-semibold text-cyan-400">Ban User</h3>
        {user.isBanned ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">
              Banned until: {user.bannedUntil ? new Date(user.bannedUntil).toLocaleString() : "Permanent"}
            </p>
            <button
              onClick={() => unbanUser.mutate({ id: user.id })}
              disabled={unbanUser.isPending}
              className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              Unban User
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Ban reason..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <select
              value={banDuration}
              onChange={(e) => setBanDuration(e.target.value as typeof banDuration)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="1h">1 Hour</option>
              <option value="6h">6 Hours</option>
              <option value="12h">12 Hours</option>
              <option value="24h">24 Hours</option>
              <option value="3d">3 Days</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
              <option value="permanent">Permanent</option>
            </select>
            <button
              onClick={() =>
                banUser.mutate({
                  id: user.id,
                  reason: banReason,
                  duration: banDuration,
                })
              }
              disabled={banUser.isPending || !banReason}
              className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              Ban User
            </button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4">
        <h3 className="mb-2 text-sm font-semibold text-cyan-400">Mute User</h3>
        {user.isMuted ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">
              Muted until: {user.mutedUntil ? new Date(user.mutedUntil).toLocaleString() : "Permanent"}
            </p>
            <button
              onClick={() => unmuteUser.mutate({ id: user.id })}
              disabled={unmuteUser.isPending}
              className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              Unmute User
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Mute reason..."
              value={muteReason}
              onChange={(e) => setMuteReason(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <select
              value={muteDuration}
              onChange={(e) => setMuteDuration(e.target.value as typeof muteDuration)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="15m">15 Minutes</option>
              <option value="30m">30 Minutes</option>
              <option value="1h">1 Hour</option>
              <option value="6h">6 Hours</option>
              <option value="12h">12 Hours</option>
              <option value="24h">24 Hours</option>
              <option value="3d">3 Days</option>
              <option value="7d">7 Days</option>
              <option value="permanent">Permanent</option>
            </select>
            <button
              onClick={() =>
                muteUser.mutate({
                  id: user.id,
                  reason: muteReason,
                  duration: muteDuration,
                })
              }
              disabled={muteUser.isPending || !muteReason}
              className="w-full rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-700 disabled:opacity-50"
            >
              Mute User
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
