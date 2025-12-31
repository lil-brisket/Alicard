"use client";

import { api } from "~/trpc/react";
import { SectionCard } from "~/components/ui/section-card";
import { ListRow } from "~/components/ui/list-row";

export default function InventoryPage() {
  const { data: inventoryItems, isLoading } = api.player.getInventory.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">Inventory</h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage your items and equipment
          </p>
        </div>
        <SectionCard>
          <p className="text-center text-slate-400">Loading inventory...</p>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-cyan-400">Inventory</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage your items and equipment
        </p>
      </div>

      {inventoryItems && inventoryItems.length > 0 ? (
        <SectionCard>
          <div className="space-y-3">
            {inventoryItems.map((inventoryItem) => (
              <ListRow key={inventoryItem.id} interactive>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-100">
                      {inventoryItem.item.name}
                    </h3>
                    {inventoryItem.quantity > 1 && (
                      <span className="text-sm text-cyan-400">
                        ×{inventoryItem.quantity}
                        {inventoryItem.item.stackable && (
                          <span className="text-slate-500">
                            {" "}/ {inventoryItem.item.maxStack}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {inventoryItem.item.description && (
                    <p className="mt-1 text-xs text-slate-400">
                      {inventoryItem.item.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded bg-slate-800/50 px-2 py-0.5 text-xs text-slate-300">
                      {inventoryItem.item.itemType}
                    </span>
                    <span className="rounded bg-slate-800/50 px-2 py-0.5 text-xs text-slate-300">
                      {inventoryItem.item.itemRarity}
                    </span>
                  </div>
                </div>
              </ListRow>
            ))}
          </div>
        </SectionCard>
      ) : (
        <SectionCard>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-100">
              Inventory Empty
            </h2>
            <p className="mt-2 text-slate-400">
              Your inventory is empty. Gather items from nodes or purchase them from shops.
            </p>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

