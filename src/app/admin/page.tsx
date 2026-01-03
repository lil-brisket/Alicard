import { PanelLayout } from "~/components/panels/panel-layout";
import { db } from "~/server/db";
import { getServerAuthSession } from "~/server/auth";
import { redirect } from "next/navigation";
import { requireRole } from "~/server/lib/rbac";

const adminNavItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Actions", href: "/admin/actions" },
];

export default async function AdminDashboardPage() {
  const session = await getServerAuthSession();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check admin role
  await requireRole(db, session.user.id, "ADMIN");

  // Get system stats
  const [
    totalUsers,
    usersLast24h,
    bannedUsers,
    mutedUsers,
  ] = await Promise.all([
    db.user.count({ where: { deletedAt: null } }),
    db.user.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
    db.user.count({ where: { isBanned: true, deletedAt: null } }),
    db.user.count({ where: { isMuted: true, deletedAt: null } }),
  ]);

  // Optional: Get combat/death stats if tables exist
  let activeCombats = 0;
  let deathsToday = 0;
  try {
    activeCombats = await db.battle.count({
      where: { status: "ACTIVE" },
    });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    deathsToday = await db.deathLog.count({
      where: { createdAt: { gte: todayStart } },
    });
  } catch {
    // Tables might not exist or have different structure
  }

  const stats = [
    {
      name: "Total Users",
      value: totalUsers,
      color: "cyan",
    },
    {
      name: "Users (24h)",
      value: usersLast24h,
      color: "blue",
    },
    {
      name: "Banned Users",
      value: bannedUsers,
      color: "red",
    },
    {
      name: "Muted Users",
      value: mutedUsers,
      color: "yellow",
    },
    {
      name: "Active Combats",
      value: activeCombats,
      color: "purple",
    },
    {
      name: "Deaths Today",
      value: deathsToday,
      color: "orange",
    },
  ];

  return (
    <PanelLayout
      title="Admin Panel"
      navItems={adminNavItems}
    >
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-cyan-400">System Overview</h2>
          <p className="mt-1 text-sm text-slate-400">
            Monitor system health and user activity
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="rounded-lg border border-slate-800 bg-slate-900/50 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{stat.name}</p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {stat.value.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`rounded-full bg-${stat.color}-500/20 p-3 text-${stat.color}-400`}
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PanelLayout>
  );
}
