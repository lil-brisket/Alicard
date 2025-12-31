import * as React from "react";
import { cn } from "~/lib/utils";

export interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
}

export const ListRow = React.forwardRef<HTMLDivElement, ListRowProps>(
  ({ className, children, interactive = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-4 rounded-lg border border-slate-800/30 bg-slate-900/30 p-4 transition-colors",
          interactive && "hover:bg-slate-800/40 hover:border-slate-700/50 cursor-pointer active:bg-slate-800/50",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
ListRow.displayName = "ListRow";

