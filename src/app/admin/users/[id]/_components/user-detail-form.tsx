"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";
import type { RouterOutputs } from "~/trpc/react";

type User = RouterOutputs["admin"]["users"]["getUserById"];

export function UserDetailForm({ user }: { user: User }) {
  const utils = api.useUtils();
  const [banReason, setBanReason] = useState("");
  const [muteReason, setMuteReason] = useState("");
  const [role, setRole] = useState(user.role);

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
          Role (Admin only)
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "PLAYER" | "MODERATOR" | "ADMIN")}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
          disabled={updateUser.isPending}
        >
          <option value="PLAYER">PLAYER</option>
          <option value="MODERATOR">MODERATOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <button
          onClick={() =>
            updateUser.mutate({
              id: user.id,
              role: role as "PLAYER" | "MODERATOR" | "ADMIN",
            })
          }
          disabled={updateUser.isPending || role === user.role}
          className="mt-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50"
        >
          Update Role
        </button>
      </div>

      <div className="border-t border-slate-800 pt-4">
        <h4 className="mb-2 text-sm font-semibold text-slate-300">Ban User</h4>
        {user.isBanned ? (
          <button
            onClick={() => unbanUser.mutate({ id: user.id })}
            disabled={unbanUser.isPending}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            Unban User
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Ban reason..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
            <button
              onClick={() =>
                banUser.mutate({
                  id: user.id,
                  reason: banReason,
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
          <button
            onClick={() => unmuteUser.mutate({ id: user.id })}
            disabled={unmuteUser.isPending}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            Unmute User
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Mute reason..."
              value={muteReason}
              onChange={(e) => setMuteReason(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            />
            <button
              onClick={() =>
                muteUser.mutate({
                  id: user.id,
                  reason: muteReason,
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
