"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function ContentItemsPage() {
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data: items, isLoading } = api.content.items.list.useQuery({
    includeArchived,
    limit: 100,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">Item Templates</h2>
          <p className="mt-1 text-sm text-slate-400">
            Manage game item templates
          </p>
        </div>
        <Link
          href="/content/items/new"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
        >
          Create Item
        </Link>
      </div>

      <div className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            className="rounded border-slate-700"
          />
          <span className="text-sm text-slate-400">Include archived</span>
        </label>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">Loading items...</p>
        </div>
      ) : items && items.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/50">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Rarity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Stackable
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-400">{item.rarity}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {item.value}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {item.stackable ? `Yes (max ${item.maxStack})` : "No"}
                  </td>
                  <td className="px-4 py-3">
                    {item.isArchived ? (
                      <span className="inline-flex rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400">
                        Archived
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-500/20 px-2 py-1 text-xs text-green-400">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/content/items/${item.id}`}
                      className="text-sm text-cyan-400 hover:text-cyan-300"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">No items found</p>
          <Link
            href="/content/items/new"
            className="mt-4 inline-block text-cyan-400 hover:text-cyan-300"
          >
            Create your first item
          </Link>
        </div>
      )}
    </div>
  );
}
