"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-900/30 hover:border-red-500/50"
      type="button"
    >
      Logout
    </button>
  );
}

