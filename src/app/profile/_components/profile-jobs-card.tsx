type Job = {
  id: string;
  jobKey: string;
  jobName: string;
  level: number;
  xp: number;
  active: boolean;
};

type ProfileJobsCardProps = {
  jobs: Job[];
};

export function ProfileJobsCard({ jobs }: ProfileJobsCardProps) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
        <h2 className="mb-4 text-lg font-bold text-cyan-400">Jobs</h2>
        <p className="text-sm text-slate-400">No jobs yet</p>
      </div>
    );
  }

  // Sort by level descending, then by active status
  const sortedJobs = [...jobs].sort((a, b) => {
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }
    return b.level - a.level;
  });

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
      <h2 className="mb-4 text-lg font-bold text-cyan-400">Jobs</h2>

      <div className="space-y-3">
        {sortedJobs.map((job) => (
          <div
            key={job.id}
            className={`rounded-lg border p-4 ${
              job.active
                ? "border-cyan-500/50 bg-cyan-950/30"
                : "border-slate-700/50 bg-slate-800/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-200">{job.jobName}</p>
                  {job.active && (
                    <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-400">
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-400">Level {job.level}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-cyan-400">Lv.{job.level}</p>
                <p className="text-xs text-slate-400">{job.xp.toLocaleString()} XP</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
