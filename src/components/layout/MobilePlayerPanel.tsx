"use client";

import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { PlayerPanelContent } from "./PlayerPanel";

export function MobilePlayerPanel() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          aria-label="Open player panel"
          className="min-h-[44px] border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 active:bg-slate-700"
        >
          Player
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 border-l p-0">
        <PlayerPanelContent />
      </SheetContent>
    </Sheet>
  );
}

