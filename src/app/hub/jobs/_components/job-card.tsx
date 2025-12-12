"use client";

import Link from "next/link";
import { ProgressBar } from "./progress-bar";

type JobCardProps = {
  job: {
    id: string;
    key: string;
    name: string;
    description: string | null;
    category: "CRAFT" | "GATHER";
    icon: string | null;
  };
  userJob: {
    level: number;
    totalXp: number;
    progress: {
      current: number;
      needed: number;
    };
    active: boolean;
  } | null;
};

export function JobCard({ job, userJob }: JobCardProps) {
  const level = userJob?.level ?? 1;
  const xp = userJob?.totalXp ?? 0;
  const progress = userJob?.progress ?? { current: 0, needed: 100 };
  const isActive = userJob?.active ?? false;

  return (
    <Link
      href={`/hub/jobs/${job.key}`}
      className="group block rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-500/70 hover:bg-slate-900/80"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-100 group-hover:text-cyan-300">
              {job.name}
            </h3>
            {isActive && (
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400">
                Active
              </span>
            )}
            <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
              {job.category}
            </span>
          </div>
          {job.description && (
            <p className="mt-1 text-sm text-slate-400">{job.description}</p>
          )}
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
              <span>Level {level}</span>
              <span>{xp} XP</span>
            </div>
            <ProgressBar
              current={progress.current}
              max={progress.needed}
              showNumbers={false}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
