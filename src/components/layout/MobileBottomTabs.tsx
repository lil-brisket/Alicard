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
  { label: "World", href: "/world" },
  { label: "Combat", href: "/combat" },
  { label: "Profile", href: "/profile" },
];

export function MobileBottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-black w-full max-w-full overflow-x-hidden">
      {/* safe-area padding for iOS */}
      <div className="pb-[env(safe-area-inset-bottom)] w-full max-w-full">
        <div className="mx-auto flex max-w-4xl items-center justify-around px-2 py-2 w-full">
          {TABS.map((t) => {
            const active = pathname === t.href || pathname.startsWith(t.href + "/");

            return (
              <Link
                key={t.href}
                href={t.href}
                className={[
                  "flex flex-col items-center justify-center gap-1 px-2 py-2 text-xs transition-colors min-h-[44px] min-w-[44px] active:opacity-80",
                  active 
                    ? "font-semibold text-slate-100" 
                    : "text-slate-400 active:text-slate-200",
                ].join(" ")}
              >
                {/* placeholder for icons */}
                <span 
                  className={[
                    "h-6 w-6 rounded flex-shrink-0",
                    active ? "bg-slate-600" : "bg-slate-700",
                  ].join(" ")} 
                  aria-hidden 
                />
                <span className="truncate text-center leading-tight">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

