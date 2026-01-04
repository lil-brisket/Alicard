"use client";

import { useState, useMemo } from "react";
import { api } from "~/trpc/react";

interface ItemPickerProps {
  value: string;
  onChange: (itemId: string) => void;
  label?: string;
  required?: boolean;
}

export function ItemPicker({ value, onChange, label, required }: ItemPickerProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { data: items, isLoading } = api.content.items.list.useQuery({
    query: search || undefined,
    limit: 50,
  });

  const selectedItem = useMemo(() => {
    if (!value || !items) return null;
    return items.find((item) => item.id === value);
  }, [value, items]);

  const filteredItems = useMemo(() => {
    if (!items) return [];
    if (!search) return items.slice(0, 20);
    return items;
  }, [items, search]);

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-slate-300 mb-1">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          value={selectedItem?.name || ""}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay closing to allow click on dropdown
            setTimeout(() => setIsOpen(false), 200);
          }}
          placeholder="Search items..."
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
        />
        {selectedItem && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setSearch("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-800 shadow-lg">
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-slate-400">Loading...</div>
          ) : filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item.id);
                  setIsOpen(false);
                  setSearch("");
                }}
                className="w-full px-4 py-2 text-left text-sm text-slate-100 hover:bg-slate-700"
              >
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-slate-400">
                  {item.itemType} • ID: {item.id.slice(0, 8)}...
                </div>
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-slate-400">No items found</div>
          )}
        </div>
      )}
    </div>
  );
}

