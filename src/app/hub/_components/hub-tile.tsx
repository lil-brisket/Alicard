"use client";

import Link from "next/link";

type HubTileProps = {
  label: string;
  href: string;
  description?: string;
};

export function HubTile({ label, href, description }: HubTileProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left text-xs transition hover:border-emerald-400/70 hover:bg-slate-900/80 active:bg-slate-800/80 min-h-[44px]"
    >
      <span className="text-sm font-semibold text-slate-100 group-hover:text-emerald-300">
        {label}
      </span>
      {description && (
        <span className="mt-1 text-[10px] text-slate-400">{description}</span>
      )}
    </Link>
  );
}

