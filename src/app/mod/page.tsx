"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import { PanelLayout } from "~/components/panels/panel-layout";
import { useDebounce } from "~/hooks/use-debounce";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import type { RouterOutputs } from "~/trpc/react";

type User = RouterOutputs["admin"]["users"]["getUserById"];

const modNavItems = [
  { label: "User Search", href: "/mod" },
];

export default function ModPanelPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: users, isLoading } = api.admin.users.searchUsers.useQuery(
    {
      query: debouncedQuery,
      limit: 20,
    },
    {
      enabled: debouncedQuery.length > 0,
    }
  );

  return (
    <PanelLayout
      title="Mod Panel"
      navItems={modNavItems}
      searchSlot={
        <input
          type="text"
          placeholder="Search users by username, email, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
        />
      }
    >
      <div className="space-y-6">
        {isLoading && <p className="text-slate-400">Searching...</p>}

        {users && users.length > 0 && (
          <div className="grid gap-4">
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

        {debouncedQuery.length === 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
            <p className="text-slate-400">Enter a search query to find users</p>
          </div>
        )}

        {selectedUserId && (
          <ModUserDetail userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
        )}
      </div>
    </PanelLayout>
  );
}

function ModUserDetail({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data: user, isLoading } = api.admin.users.getUserById.useQuery({ id: userId });
  const { data: ipHistory } = api.admin.users.getIpHistory.useQuery({ userId, limit: 50 });
  // Note: Using AdminActionLog for now, can be migrated to AuditEvent later
  const { data: auditEvents } = api.admin.users.listAdminActions.useQuery({
    targetUserId: userId,
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
              <div className="max-h-48 space-y-2 overflow-y-auto">
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

          <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4">
            <h3 className="mb-2 text-sm font-semibold text-cyan-400">Moderation History</h3>
            {auditEvents && auditEvents.length > 0 ? (
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {auditEvents.map((event) => (
                  <div key={event.id} className="rounded bg-slate-900/50 p-2 text-xs">
                    <div className="font-medium text-slate-200">{event.action}</div>
                    <div className="text-slate-400">
                      {event.actor.username} - {new Date(event.createdAt).toLocaleString()}
                    </div>
                    {event.reason && (
                      <div className="mt-1 text-slate-500">{event.reason}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No moderation history</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4">
            <h3 className="mb-2 text-sm font-semibold text-cyan-400">Context Links</h3>
            <div className="space-y-2">
              <button
                disabled
                className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-500 transition disabled:cursor-not-allowed"
              >
                Chat Logs (TODO)
              </button>
              <button
                disabled
                className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-500 transition disabled:cursor-not-allowed"
              >
                Combat Logs (TODO)
              </button>
              <button
                disabled
                className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-500 transition disabled:cursor-not-allowed"
              >
                Trade History (TODO)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModBanMuteSection({ user }: { user: User }) {
  const utils = api.useUtils();
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<"1h" | "6h" | "12h" | "24h" | "3d" | "7d" | "30d" | "permanent">("24h");
  const [muteReason, setMuteReason] = useState("");
  const [muteDuration, setMuteDuration] = useState<"15m" | "30m" | "1h" | "6h" | "12h" | "24h" | "3d" | "7d" | "permanent">("1h");
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [showUnbanConfirm, setShowUnbanConfirm] = useState(false);
  const [showMuteConfirm, setShowMuteConfirm] = useState(false);
  const [showUnmuteConfirm, setShowUnmuteConfirm] = useState(false);

  const banUser = api.admin.users.banUser.useMutation({
    onSuccess: () => {
      toast.success("User banned");
      void utils.admin.users.getUserById.invalidate({ id: user.id });
      void utils.admin.users.listAdminActions.invalidate({ targetUserId: user.id });
      setBanReason("");
      setShowBanConfirm(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unbanUser = api.admin.users.unbanUser.useMutation({
    onSuccess: () => {
      toast.success("User unbanned");
      void utils.admin.users.getUserById.invalidate({ id: user.id });
      void utils.admin.users.listAdminActions.invalidate({ targetUserId: user.id });
      setShowUnbanConfirm(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const muteUser = api.admin.users.muteUser.useMutation({
    onSuccess: () => {
      toast.success("User muted");
      void utils.admin.users.getUserById.invalidate({ id: user.id });
      void utils.admin.users.listAdminActions.invalidate({ targetUserId: user.id });
      setMuteReason("");
      setShowMuteConfirm(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unmuteUser = api.admin.users.unmuteUser.useMutation({
    onSuccess: () => {
      toast.success("User unmuted");
      void utils.admin.users.getUserById.invalidate({ id: user.id });
      void utils.admin.users.listAdminActions.invalidate({ targetUserId: user.id });
      setShowUnmuteConfirm(false);
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
              onClick={() => setShowUnbanConfirm(true)}
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
              placeholder="Ban reason (required, 3-200 chars)..."
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
              onClick={() => {
                if (banReason.length >= 3 && banReason.length <= 200) {
                  setShowBanConfirm(true);
                } else {
                  toast.error("Reason must be between 3 and 200 characters");
                }
              }}
              disabled={banUser.isPending || banReason.length < 3 || banReason.length > 200}
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
              onClick={() => setShowUnmuteConfirm(true)}
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
              placeholder="Mute reason (required, 3-200 chars)..."
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
              onClick={() => {
                if (muteReason.length >= 3 && muteReason.length <= 200) {
                  setShowMuteConfirm(true);
                } else {
                  toast.error("Reason must be between 3 and 200 characters");
                }
              }}
              disabled={muteUser.isPending || muteReason.length < 3 || muteReason.length > 200}
              className="w-full rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-700 disabled:opacity-50"
            >
              Mute User
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showBanConfirm}
        onClose={() => setShowBanConfirm(false)}
        onConfirm={() => banUser.mutate({ id: user.id, reason: banReason, duration: banDuration })}
        title="Ban User"
        description={`Are you sure you want to ban ${user.username}?`}
        confirmText="Ban"
        variant="danger"
      />

      <ConfirmDialog
        open={showUnbanConfirm}
        onClose={() => setShowUnbanConfirm(false)}
        onConfirm={() => unbanUser.mutate({ id: user.id })}
        title="Unban User"
        description={`Are you sure you want to unban ${user.username}?`}
        confirmText="Unban"
      />

      <ConfirmDialog
        open={showMuteConfirm}
        onClose={() => setShowMuteConfirm(false)}
        onConfirm={() => muteUser.mutate({ id: user.id, reason: muteReason, duration: muteDuration })}
        title="Mute User"
        description={`Are you sure you want to mute ${user.username}?`}
        confirmText="Mute"
        variant="danger"
      />

      <ConfirmDialog
        open={showUnmuteConfirm}
        onClose={() => setShowUnmuteConfirm(false)}
        onConfirm={() => unmuteUser.mutate({ id: user.id })}
        title="Unmute User"
        description={`Are you sure you want to unmute ${user.username}?`}
        confirmText="Unmute"
      />
    </div>
  );
}
