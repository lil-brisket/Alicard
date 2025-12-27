"use client";

import { SidebarContent } from "./AppSidebar";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { Menu } from "lucide-react";

export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          aria-label="Open menu"
          className="h-9 w-9 min-h-[44px] min-w-[44px] border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 active:bg-slate-700"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 border-r p-0">
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );
}

