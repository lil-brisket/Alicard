import Link from "next/link";

export function HallOfDeadCard() {
  return (
    <div className="rounded-2xl border border-red-900/60 bg-gradient-to-r from-red-950/80 to-slate-950/80 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-red-200">Hall of the Dead</h3>
          <p className="text-xs text-red-200/80 md:text-sm">
            Every death is permanent after your final fall. View the fallen and the floors they reached.
          </p>
        </div>
        <Link
          href="/hall-of-the-dead"
          className="inline-flex items-center justify-center rounded-full border border-red-500/60 px-4 py-2 text-xs font-medium text-red-100 hover:bg-red-500/20"
        >
          View Hall
        </Link>
      </div>
    </div>
  );
}

