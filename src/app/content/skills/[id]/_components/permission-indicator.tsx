"use client";

import { api } from "~/trpc/react";

export function PermissionIndicator() {
  const { data: permissionsData } = api.content.permissions.get.useQuery();

  if (!permissionsData) {
    return null;
  }

  const permissions = permissionsData.permissions;

  return (
    <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
      <div className="mb-2 text-sm font-medium text-slate-300">
        Your Permissions
      </div>
      <div className="flex flex-wrap gap-2">
        {permissions.includes("content.create") && (
          <span className="rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
            Can Create
          </span>
        )}
        {permissions.includes("content.edit") && (
          <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs text-blue-400">
            Can Edit
          </span>
        )}
        {permissions.includes("content.disable") && (
          <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs text-yellow-400">
            Can Disable
          </span>
        )}
        {permissions.includes("content.delete") && (
          <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400">
            Can Delete
          </span>
        )}
      </div>
    </div>
  );
}
