"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { PanelLayout } from "~/components/panels/panel-layout";
import { useDebounce } from "~/hooks/use-debounce";

const adminNavItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Actions", href: "/admin/actions" },
];

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const limit = 15;
  const debouncedSearch = useDebounce(searchQuery, 300);

  // List users with pagination (when no search query)
  const { data: listData, isLoading: isLoadingList } = api.admin.users.listUsers.useQuery(
    {
      page,
      limit,
    },
    {
      enabled: debouncedSearch.length === 0,
    }
  );

  // Search users (when search query exists)
  const { data: searchResults, isLoading: isLoadingSearch } = api.admin.users.searchUsers.useQuery(
    {
      query: debouncedSearch,
      limit: 100,
    },
    {
      enabled: debouncedSearch.length >= 1,
    }
  );

  const isLoading = isLoadingList || isLoadingSearch;
  let users = debouncedSearch.length > 0 ? searchResults : listData?.users;

  // Apply filters
  if (users) {
    if (roleFilter !== "all") {
      users = users.filter((u) => u.role === roleFilter);
    }
    if (statusFilter === "banned") {
      users = users.filter((u) => u.isBanned);
    } else if (statusFilter === "muted") {
      users = users.filter((u) => u.isMuted);
    } else if (statusFilter === "active") {
      users = users.filter((u) => !u.isBanned && !u.isMuted);
    }
  }

  const totalPages = listData?.totalPages ?? 1;

  return (
    <PanelLayout
      title="Admin Panel"
      navItems={adminNavItems}
      searchSlot={
        <input
          type="text"
          placeholder="Search by username, email, or ID..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
        />
      }
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">User Management</h2>
          <p className="mt-1 text-sm text-slate-400">
            Search and manage user accounts
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100"
          >
            <option value="all">All Roles</option>
            <option value="PLAYER">Player</option>
            <option value="MODERATOR">Moderator</option>
            <option value="ADMIN">Admin</option>
            <option value="CONTENT">Content</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
            <option value="muted">Muted</option>
          </select>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
            <p className="text-slate-400">Loading users...</p>
          </div>
        ) : users && users.length > 0 ? (
          <>
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
                                : user.role === "CONTENT"
                                  ? "bg-purple-500/20 text-purple-400"
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

            {/* Pagination - Only show when not searching */}
            {debouncedSearch.length === 0 && listData && totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-400">
                  Showing {(page - 1) * limit + 1} to{" "}
                  {Math.min(page * limit, listData.total)} of {listData.total}{" "}
                  users
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`rounded-lg px-3 py-2 text-sm transition ${
                            page === pageNum
                              ? "bg-cyan-600 text-white"
                              : "border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
            <p className="text-slate-400">
              {debouncedSearch.length === 0
                ? "No users found"
                : "No users found matching your search"}
            </p>
          </div>
        )}
      </div>
    </PanelLayout>
  );
}
