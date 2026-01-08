"use client";

import { api } from "~/trpc/react";

export function AdminActionsClient() {
  const { data: actions, isLoading } = api.admin.users.listAdminActions.useQuery(
    {
      limit: 100,
    }
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-400">Loading actions...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-cyan-400">Admin Action Log</h2>
        <p className="mt-1 text-sm text-slate-400">
          Audit trail of all admin actions
        </p>
      </div>

      {actions && actions.length > 0 ? (
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
                  Target User
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
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {action.targetUserId ? (
                      <a
                        href={`/admin/users/${action.targetUserId}`}
                        className="text-cyan-400 hover:text-cyan-300"
                      >
                        {action.targetUserId}
                      </a>
                    ) : (
                      "-"
                    )}
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
          <p className="text-slate-400">No actions logged</p>
        </div>
      )}
    </div>
  );
}


















