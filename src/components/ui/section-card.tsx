import * as React from "react";
import { cn } from "~/lib/utils";

export interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(
  ({ className, title, description, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-slate-800/50 bg-gradient-to-br from-slate-900/60 to-slate-950/60 p-4 shadow-lg backdrop-blur-sm md:p-6",
          className
        )}
        {...props}
      >
        {(title || description) && (
          <div className="mb-3 space-y-1 md:mb-4">
            {title && (
              <h2 className="text-base font-bold text-slate-100 md:text-lg">{title}</h2>
            )}
            {description && (
              <p className="text-xs text-slate-400 md:text-sm">{description}</p>
            )}
          </div>
        )}
        {children}
      </div>
    );
  }
);
SectionCard.displayName = "SectionCard";

