"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "~/trpc/react";
import { HUB_NAV, type NavItem } from "~/config/navigation";

function NavSection({
  title,
  items,
  variant = "link",
  onLinkClick,
}: {
  title: string;
  items: NavItem[];
  variant?: "link" | "button";
  onLinkClick?: () => void;
}) {
  const pathname = usePathname();

  const handleClick = () => {
    onLinkClick?.();
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");

          const base =
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition min-h-[44px] active:bg-muted/80";
          const activeCls = active
            ? "bg-muted font-semibold"
            : "hover:bg-muted/60";

          // Jobs as "buttons"
          if (variant === "button") {
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleClick}
                className={`${base} ${activeCls} border border-border`}
              >
                {item.label}
              </Link>
            );
          }

          // Regular links
          return (
            <Link key={item.href} href={item.href} onClick={handleClick} className={`${base} ${activeCls}`}>
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function JobsSection({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { data: jobs, isLoading: jobsLoading } = api.jobs.listJobs.useQuery();
  const { data: myJobs, isLoading: myJobsLoading } = api.jobs.getMyJobs.useQuery();

  const isLoading = jobsLoading || myJobsLoading;

  const handleClick = () => {
    onLinkClick?.();
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Jobs
        </div>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Jobs
        </div>
        <div className="text-sm text-muted-foreground">No jobs available</div>
      </div>
    );
  }

  // Create a map of jobId -> userJob for quick lookup
  const myJobsMap = new Map(myJobs?.map((uj) => [uj.jobId, uj]) ?? []);

  // Sort jobs by category, then name
  const sortedJobs = [...jobs].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Jobs
      </div>
      <div className="space-y-1">
        {sortedJobs.map((job) => {
          const userJob = myJobsMap.get(job.id);
          const level = userJob?.level ?? 1;
          const active = pathname === `/jobs/${job.key}` || pathname.startsWith(`/jobs/${job.key}/`);

          return (
            <Link
              key={job.id}
              href={`/jobs/${job.key}`}
              onClick={handleClick}
              className={`flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm transition min-h-[44px] active:bg-muted/80 ${
                active
                  ? "bg-muted font-semibold"
                  : "hover:bg-muted/60"
              }`}
            >
              <span>{job.name}</span>
              <span className="text-xs text-muted-foreground">Lv. {level}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function PlayerStatsSection() {
  const { data: player, isLoading } = api.player.getCurrent.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Stats
        </div>
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!player?.stats) {
    return null;
  }

  const stats = player.stats;

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Stats
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">VIT</span>
          <span className="font-medium">{stats.vitality}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">STR</span>
          <span className="font-medium">{stats.strength}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">SPD</span>
          <span className="font-medium">{stats.speed}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">DEX</span>
          <span className="font-medium">{stats.dexterity}</span>
        </div>
      </div>
    </div>
  );
}

export function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-4 pb-8">
      <div className="text-lg font-bold">Alicard</div>

      <PlayerStatsSection />
      <JobsSection onLinkClick={onLinkClick} />
      <NavSection title="Links" items={HUB_NAV} variant="link" onLinkClick={onLinkClick} />

      <div className="mt-auto text-xs text-muted-foreground">
        Tap outside to close on mobile.
      </div>
    </div>
  );
}

export function DesktopSidebar({ isOpen, onLinkClick }: { isOpen: boolean; onLinkClick?: () => void }) {
  return (
    <aside
      className={`hidden shrink-0 border-r transition-all duration-300 md:block ${
        isOpen ? "w-64" : "w-0 border-r-0"
      }`}
      style={{ height: "calc(100vh - 3.5rem)" }}
    >
      {isOpen && (
        <div className="h-full w-64">
          <SidebarContent onLinkClick={onLinkClick} />
        </div>
      )}
    </aside>
  );
}

