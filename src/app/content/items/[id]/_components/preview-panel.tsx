"use client";

import type { ItemTemplate } from "~/generated/prisma/client";

interface PreviewPanelProps {
  item: ItemTemplate;
}

export function ItemPreviewPanel({ item }: PreviewPanelProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
      <h3 className="mb-4 text-lg font-semibold text-cyan-400">Preview</h3>
      
      <div className="space-y-4">
        {/* Item Card Preview */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-lg font-semibold text-white">{item.name}</h4>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                item.rarity === "LEGENDARY"
                  ? "bg-purple-500/20 text-purple-400"
                  : item.rarity === "EPIC"
                    ? "bg-blue-500/20 text-blue-400"
                    : item.rarity === "RARE"
                      ? "bg-cyan-500/20 text-cyan-400"
                      : item.rarity === "UNCOMMON"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-slate-500/20 text-slate-400"
              }`}
            >
              {item.rarity}
            </span>
          </div>
          
          {item.description && (
            <p className="mb-3 text-sm text-slate-300">{item.description}</p>
          )}
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Value:</span>
              <span className="text-slate-300">{item.value} gold</span>
            </div>
            
            {item.stackable && (
              <div className="flex justify-between">
                <span className="text-slate-400">Stackable:</span>
                <span className="text-slate-300">
                  Yes (max {item.maxStack})
                </span>
              </div>
            )}
            
            {(item as any).tags && ((item as any).tags as string[]).length > 0 && (
              <div>
                <span className="text-slate-400">Tags: </span>
                {((item as any).tags as string[]).map((tag, idx) => (
                  <span
                    key={idx}
                    className="mr-1 inline-block rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs text-cyan-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Status Indicator */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Status:</span>
            <span
              className={`text-sm font-medium ${
                (item as any).status === "ACTIVE"
                  ? "text-green-400"
                  : (item as any).status === "DISABLED"
                    ? "text-red-400"
                    : "text-yellow-400"
              }`}
            >
              {(item as any).status ?? "DRAFT"}
            </span>
          </div>
          {(item as any).version && (
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm text-slate-400">Version:</span>
              <span className="text-sm text-slate-300">
                {(item as any).version}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
