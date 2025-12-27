"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

const navigationLinks = [
  { label: "World", href: "/world" },
  { label: "Inventory", href: "/inventory" },
  { label: "Skills", href: "/skills" },
  { label: "Profile", href: "/profile" },
  { label: "Quests", href: "/quests" },
  { label: "Guilds", href: "/guilds" },
  { label: "Bank", href: "/bank" },
  { label: "Market", href: "/market" },
  { label: "Crafting", href: "/crafting" },
  { label: "Combat", href: "/combat" },
  { label: "Death Screen", href: "/death" },
  { label: "Leaderboards", href: "/leaderboards" },
  { label: "Tutorial", href: "/tutorial" },
  { label: "Hall of the Dead", href: "/hall-of-the-dead" },
] as const;

export function NavigationSection() {
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="rounded-xl bg-white/10 p-6">
      <h2 className="mb-4 text-2xl font-bold">Navigation</h2>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {navigationLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg bg-[hsl(280,100%,70%)] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[hsl(280,100%,65%)] active:bg-[hsl(280,100%,60%)] min-h-[44px] flex items-center justify-center"
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="border-t border-white/20 pt-4">
        <button
          onClick={handleLogout}
          className="w-full rounded-lg bg-red-600/20 px-6 py-3 font-semibold text-red-300 transition hover:bg-red-600/30 active:bg-red-600/40 min-h-[44px]"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

