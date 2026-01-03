"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

interface PanelNavItem {
  label: string;
  href: string;
  icon?: ReactNode;
}

interface PanelLayoutProps {
  title: string;
  navItems: PanelNavItem[];
  children: ReactNode;
  searchSlot?: ReactNode;
}

export function PanelLayout({
  title,
  navItems,
  children,
  searchSlot,
}: PanelLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex">
        {/* Left Navigation */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/50">
          <div className="sticky top-0 p-4">
            <h2 className="mb-4 text-lg font-bold text-cyan-400">{title}</h2>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                      isActive
                        ? "bg-cyan-600/20 text-cyan-400"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Top Bar */}
          <div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold text-cyan-400">{title}</h1>
                {searchSlot}
              </div>
              <Link
                href="/hub"
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
              >
                Back to Hub
              </Link>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

