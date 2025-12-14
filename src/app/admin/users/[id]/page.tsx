"use client";

import { use } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { UserDetailForm } from "./_components/user-detail-form";

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
                  <div
                    key={char.id}
                    className="rounded border border-slate-800 bg-slate-800/30 p-3"
                  >
                    <div className="font-medium">{char.name}</div>
                    <div className="text-sm text-slate-400">
                      Level {char.level} | HP: {char.currentHp}/{char.maxHp} |
                      Deaths: {char.deaths}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No characters</p>
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
