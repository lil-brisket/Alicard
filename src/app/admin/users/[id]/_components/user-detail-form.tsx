"use client";

import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import type { RouterOutputs } from "~/trpc/react";

type User = RouterOutputs["admin"]["users"]["getUserById"];

const ALL_ROLES = ["PLAYER", "MODERATOR", "ADMIN", "CONTENT"] as const;
type UserRole = (typeof ALL_ROLES)[number];

export function UserDetailForm({ user }: { user: User }) {
  const utils = api.useUtils();
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState<"1h" | "6h" | "12h" | "24h" | "3d" | "7d" | "30d" | "permanent">("24h");
  const [muteReason, setMuteReason] = useState("");
  const [muteDuration, setMuteDuration] = useState<"15m" | "30m" | "1h" | "6h" | "12h" | "24h" | "3d" | "7d" | "permanent">("1h");
  const [role, setRole] = useState(user.role);
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(
    user.roles?.map((r) => r.role as UserRole) ?? [user.role as UserRole]
  );
  const [credit, setCredit] = useState(user.credit ?? 0);

  const updateUser = api.admin.users.updateUser.useMutation({
    onSuccess: () => {
      toast.success("User updated");
      void utils.admin.users.getUserById.invalidate({ id: user.id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

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

  const softDeleteUser = api.admin.users.softDeleteUser.useMutation({
    onSuccess: () => {
      toast.success("User soft deleted");
      void utils.admin.users.getUserById.invalidate({ id: user.id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300">
          Roles (Admin only) - Multi-select
        </label>
        <div className="mt-2 space-y-2">
          {ALL_ROLES.map((r) => (
            <label key={r} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedRoles.includes(r)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRoles([...selectedRoles, r]);
                  } else {
                    setSelectedRoles(selectedRoles.filter((role) => role !== r));
                  }
                }}
                className="rounded border-slate-700 bg-slate-800 text-cyan-600 focus:ring-cyan-500"
                disabled={updateUser.isPending}
              />
              <span className="text-sm text-slate-300">{r}</span>
            </label>
          ))}
        </div>
        <button
          onClick={() =>
            updateUser.mutate({
              id: user.id,
              roles: selectedRoles,
            })
          }
          disabled={updateUser.isPending || selectedRoles.length === 0}
          className="mt-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
        >
          Update Roles
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300">
          Credit
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="number"
            value={credit}
            onChange={(e) => setCredit(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            disabled={updateUser.isPending}
          />
          <button
            onClick={() =>
              updateUser.mutate({
                id: user.id,
                credit,
              })
            }
            disabled={updateUser.isPending}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
          >
            Update
          </button>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4">
        <h4 className="mb-2 text-sm font-semibold text-slate-300">Ban User</h4>
        {user.isBanned ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">
              Banned until: {user.bannedUntil ? new Date(user.bannedUntil).toLocaleString() : "Permanent"}
            </p>
            <button
              onClick={() => unbanUser.mutate({ id: user.id })}
              disabled={unbanUser.isPending}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
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
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
            <select
              value={banDuration}
              onChange={(e) => setBanDuration(e.target.value as typeof banDuration)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
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
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              Ban User
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 pt-4">
        <h4 className="mb-2 text-sm font-semibold text-slate-300">Mute User</h4>
        {user.isMuted ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">
              Muted until: {user.mutedUntil ? new Date(user.mutedUntil).toLocaleString() : "Permanent"}
            </p>
            <button
              onClick={() => unmuteUser.mutate({ id: user.id })}
              disabled={unmuteUser.isPending}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
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
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
            <select
              value={muteDuration}
              onChange={(e) => setMuteDuration(e.target.value as typeof muteDuration)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
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
              className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-700 disabled:opacity-50"
            >
              Mute User
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 pt-4">
        <h4 className="mb-2 text-sm font-semibold text-red-400">
          Danger Zone
        </h4>
        <button
          onClick={() => {
            if (
              confirm(
                "Are you sure you want to soft delete this user? This action can be reversed."
              )
            ) {
              softDeleteUser.mutate({
                id: user.id,
                reason: "Soft deleted by admin",
              });
            }
          }}
          disabled={softDeleteUser.isPending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          Soft Delete User
        </button>
      </div>
    </div>
  );
}
