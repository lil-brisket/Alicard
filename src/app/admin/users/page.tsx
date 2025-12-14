"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: users, isLoading } = api.admin.users.searchUsers.useQuery(
    {
      query: searchQuery || "a", // Default query to show some results
      limit: 50,
    },
    {
      enabled: searchQuery.length >= 1,
    }
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-cyan-400">User Management</h2>
        <p className="mt-1 text-sm text-slate-400">
          Search and manage user accounts
        </p>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by username, email, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">Loading users...</p>
        </div>
      ) : users && users.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Username
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Characters
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-sm">{user.username}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        user.role === "ADMIN"
                          ? "bg-red-500/20 text-red-400"
                          : user.role === "MODERATOR"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {user.isBanned && (
                        <span className="inline-flex rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400">
                          Banned
                        </span>
                      )}
                      {user.isMuted && (
                        <span className="inline-flex rounded-full bg-yellow-500/20 px-2 py-1 text-xs text-yellow-400">
                          Muted
                        </span>
                      )}
                      {!user.isBanned && !user.isMuted && (
                        <span className="text-xs text-slate-400">Active</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {user._count.characters}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="text-sm text-cyan-400 hover:text-cyan-300"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">
            {searchQuery.length === 0
              ? "Enter a search query to find users"
              : "No users found"}
          </p>
        </div>
      )}
    </div>
  );
}
