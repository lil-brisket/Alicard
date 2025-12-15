import { redirect } from "next/navigation";
import Link from "next/link";
import { requireModeratorPage } from "~/server/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireModeratorPage();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-cyan-400">Admin Panel</h1>
              <p className="text-sm text-slate-400">
                User: {user.username} | Role: {user.role}
              </p>
            </div>
            <Link
              href="/hub"
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
            >
              Back to Hub
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-6 flex space-x-4 border-b border-slate-800">
          <Link
            href="/admin/users"
            className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400"
          >
            Users
          </Link>
          {user.role === "ADMIN" && (
            <Link
              href="/admin/actions"
              className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400"
            >
              Action Log
            </Link>
          )}
        </nav>

        {children}
      </div>
    </div>
  );
}
