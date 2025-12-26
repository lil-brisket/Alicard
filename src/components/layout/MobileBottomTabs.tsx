"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  label: string;
  href: string;
  icon?: React.ReactNode; // optional later
};

const TABS: Tab[] = [
  { label: "Home", href: "/hub" },
  { label: "Equipment", href: "/equipment" },
  { label: "Skills", href: "/skills" },
  { label: "Map", href: "/map" },
  { label: "Chat", href: "/chat" },
  { label: "Options", href: "/settings" },
];

export function MobileBottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-black">
      {/* safe-area padding for iOS */}
      <div className="pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-4xl items-center justify-around px-4 py-3">
          {TABS.map((t) => {
            const active = pathname === t.href || pathname.startsWith(t.href + "/");

            return (
              <Link
                key={t.href}
                href={t.href}
                className={[
                  "flex flex-col items-center justify-center gap-2 px-3 py-1 text-sm transition-colors",
                  active 
                    ? "font-semibold text-slate-100" 
                    : "text-slate-400 hover:text-slate-200",
                ].join(" ")}
              >
                {/* placeholder for icons */}
                <span 
                  className={[
                    "h-8 w-8 rounded",
                    active ? "bg-slate-600" : "bg-slate-700",
                  ].join(" ")} 
                  aria-hidden 
                />
                <span className="truncate">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

