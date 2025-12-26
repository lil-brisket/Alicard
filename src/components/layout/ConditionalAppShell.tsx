"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";

const EXCLUDED_PATHS = ["/", "/auth/signin", "/auth/register"];

export function ConditionalAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Check if current path should exclude the sidebar
  const shouldExclude = EXCLUDED_PATHS.some((path) => pathname === path || pathname.startsWith("/auth/"));
  
  if (shouldExclude) {
    return <>{children}</>;
  }
  
  return <AppShell>{children}</AppShell>;
}

