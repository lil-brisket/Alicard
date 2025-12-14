import Link from "next/link";

type AdminPanelSectionProps = {
  role: "MODERATOR" | "ADMIN";
};

export function AdminPanelSection({ role }: AdminPanelSectionProps) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-red-500/10 backdrop-blur-sm">
      <h2 className="mb-4 text-lg font-bold text-red-400">
        Admin Panel {role === "ADMIN" && "• Full Access"}
      </h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Link
          href="/admin"
          className="group rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition hover:border-red-500/50 hover:bg-slate-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-red-400 group-hover:text-red-300">
                User Management
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Manage users, bans, mutes, and roles
              </p>
            </div>
            <svg
              className="h-5 w-5 text-slate-500 transition group-hover:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </Link>

        {role === "ADMIN" && (
          <Link
            href="/content"
            className="group rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition hover:border-red-500/50 hover:bg-slate-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-red-400 group-hover:text-red-300">
                  Content CMS
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Manage items, monsters, quests, and maps
                </p>
              </div>
              <svg
                className="h-5 w-5 text-slate-500 transition group-hover:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
