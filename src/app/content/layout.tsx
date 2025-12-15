import { redirect } from "next/navigation";
import Link from "next/link";
import { requireContentPage } from "~/server/lib/admin-auth";

export default async function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireContentPage();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-cyan-400">Content Panel</h1>
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
            href="/content/dashboard"
            className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400"
          >
            Dashboard
          </Link>
          <Link
            href="/content/items"
            className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400"
          >
            Items
          </Link>
          <Link
            href="/content/monsters"
            className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400"
          >
            Monsters
          </Link>
          <Link
            href="/content/quests"
            className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400"
          >
            Quests
          </Link>
          <Link
            href="/content/maps"
            className="border-b-2 border-transparent px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-cyan-500 hover:text-cyan-400"
          >
            Maps
          </Link>
        </nav>

        {children}
      </div>
    </div>
  );
}
