"use client";

type NodeCardProps = {
  node: {
    id: string;
    key: string;
    name: string;
    description: string | null;
    dangerTier: number;
    job: {
      name: string;
    };
    yields: Array<{
      minQty: number;
      maxQty: number;
      item: {
        name: string;
      };
    }>;
  };
};

export function NodeCard({ node }: NodeCardProps) {
  const dangerStars = "⚠".repeat(node.dangerTier);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-100">
              {node.name}
            </h3>
            <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
              {node.job.name}
            </span>
          </div>
          {node.description && (
            <p className="mt-1 text-sm text-slate-400">{node.description}</p>
          )}
          <div className="mt-3 space-y-2">
            <div className="text-xs text-slate-400">
              <span className="font-medium">Danger:</span>{" "}
              <span className="text-red-400">{dangerStars}</span>
            </div>
            {node.yields.length > 0 && (
              <div className="text-xs text-slate-400">
                <span className="font-medium">Yields:</span>{" "}
                {node.yields
                  .map(
                    (yield_) =>
                      `${yield_.minQty}-${yield_.maxQty}x ${yield_.item.name}`
                  )
                  .join(", ")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
