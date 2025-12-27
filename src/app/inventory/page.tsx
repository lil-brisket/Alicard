"use client";

import { api } from "~/trpc/react";
import Link from "next/link";

export default function InventoryPage() {
  const { data: inventoryItems, isLoading } = api.player.getInventory.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <h1 className="text-2xl font-bold text-cyan-400">Inventory</h1>
          <p className="mt-2 text-slate-400">
            Manage your items and equipment
          </p>
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
            <p className="text-slate-400">Loading inventory...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <h1 className="text-2xl font-bold text-cyan-400">Inventory</h1>
        <p className="mt-2 text-slate-400">
          Manage your items and equipment
        </p>

        {inventoryItems && inventoryItems.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {inventoryItems.map((inventoryItem) => (
              <div
                key={inventoryItem.id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-100">
                      {inventoryItem.item.name}
                    </h3>
                    {inventoryItem.quantity > 1 && (
                      <p className="mt-1 text-sm text-cyan-400">
                        Quantity: {inventoryItem.quantity}
                        {inventoryItem.item.stackable && (
                          <span className="text-slate-500">
                            {" "}/ {inventoryItem.item.maxStack}
                          </span>
                        )}
                      </p>
                    )}
                    {inventoryItem.item.description && (
                      <p className="mt-2 text-xs text-slate-400">
                        {inventoryItem.item.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        {inventoryItem.item.itemType}
                      </span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                        {inventoryItem.item.itemRarity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-100">
              Inventory Empty
            </h2>
            <p className="mt-2 text-slate-400">
              Your inventory is empty. Gather items from nodes or purchase them from shops.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

