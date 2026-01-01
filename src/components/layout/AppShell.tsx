"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MobileBottomTabs } from "./MobileBottomTabs";
import { DesktopSidebar } from "./AppSidebar";
import { DesktopPlayerPanel } from "./PlayerPanel";
import { MobileSidebar } from "./MobileSidebar";
import { MobilePlayerPanel } from "./MobilePlayerPanel";
import { Button } from "~/components/ui/button";
import { Menu, X, ChevronLeft, ChevronRight } from "lucide-react";

const STORAGE_KEYS = {
  SIDEBAR_OPEN: "alicard-sidebar-open",
  PLAYER_PANEL_OPEN: "alicard-player-panel-open",
} as const;

function getStoredValue(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  const stored = localStorage.getItem(key);
  return stored !== null ? stored === "true" : defaultValue;
}

function setStoredValue(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, String(value));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatPage = pathname?.startsWith("/chat");
  
  // Start with default values to ensure server/client match
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [playerPanelOpen, setPlayerPanelOpen] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Load from localStorage after mount to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    const storedSidebar = getStoredValue(STORAGE_KEYS.SIDEBAR_OPEN, true);
    const storedPanel = getStoredValue(STORAGE_KEYS.PLAYER_PANEL_OPEN, true);
    setSidebarOpen(storedSidebar);
    setPlayerPanelOpen(storedPanel);
  }, []);

  // Force sidebars open on chat page
  useEffect(() => {
    if (isChatPage && isMounted) {
      setSidebarOpen(true);
      setPlayerPanelOpen(true);
    }
  }, [isChatPage, isMounted]);

  // Persist sidebar state to localStorage
  useEffect(() => {
    if (isMounted) {
      setStoredValue(STORAGE_KEYS.SIDEBAR_OPEN, sidebarOpen);
    }
  }, [sidebarOpen, isMounted]);

  // Persist player panel state to localStorage
  useEffect(() => {
    if (isMounted) {
      setStoredValue(STORAGE_KEYS.PLAYER_PANEL_OPEN, playerPanelOpen);
    }
  }, [playerPanelOpen, isMounted]);

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-gradient-to-b from-black via-black to-slate-950">
      {/* Desktop Header with toggle buttons */}
      {!isChatPage && (
      <header className="sticky top-0 z-40 hidden h-14 items-center justify-between gap-3 border-b border-slate-800 bg-black/80 backdrop-blur px-4 md:flex">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            className="h-9 w-9 border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="font-semibold text-slate-100">Alicard</div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setPlayerPanelOpen(!playerPanelOpen)}
          aria-label={playerPanelOpen ? "Close player panel" : "Open player panel"}
          className="h-9 w-9 border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
        >
          {playerPanelOpen ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
      </header>
      )}

      {/* Mobile Header with menu buttons */}
      {!isChatPage && (
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-slate-800 bg-black/80 backdrop-blur px-3 md:hidden w-full max-w-full">
        <div className="flex items-center gap-2 min-w-0">
          <MobileSidebar />
          <div className="font-semibold text-slate-100 truncate">Alicard</div>
        </div>
        <MobilePlayerPanel />
      </header>
      )}

      <div className={`flex w-full max-w-full ${isChatPage ? 'h-screen' : 'min-h-screen'}`}>
        <DesktopSidebar isOpen={sidebarOpen} onLinkClick={() => !isChatPage && setSidebarOpen(false)} isChatPage={isChatPage} />

        {/* IMPORTANT: pb-16 to clear the condensed bottom tabs on mobile */}
        <main className={`min-w-0 flex-1 overflow-x-hidden ${isChatPage ? '' : 'pb-16 md:pb-0'}`}>
          {isChatPage ? (
            <div className="h-full w-full relative">
              {/* Floating toggle buttons for chat page on desktop - positioned above chat header */}
              {/* Left sidebar toggle - positioned on left edge */}
              <div className="hidden md:flex absolute top-2 left-2 z-50">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="h-8 w-8 border-slate-700 bg-slate-900/80 backdrop-blur text-slate-100 hover:bg-slate-800"
                >
                  {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
              </div>
              {/* Right panel toggle - positioned on right edge */}
              <div className="hidden md:flex absolute top-2 right-2 z-50">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPlayerPanelOpen(!playerPanelOpen)}
                  className="h-8 w-8 border-slate-700 bg-slate-900/80 backdrop-blur text-slate-100 hover:bg-slate-800"
                >
                  {playerPanelOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
              </div>
              {children}
            </div>
          ) : (
            <div className="mx-auto w-full max-w-6xl px-4 md:px-6 py-4 md:py-6">
              {children}
            </div>
          )}
        </main>

        <DesktopPlayerPanel isOpen={playerPanelOpen} isChatPage={isChatPage} />
      </div>

      <MobileBottomTabs />
    </div>
  );
}
