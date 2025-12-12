"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { JobCard } from "./_components/job-card";
import { ProgressBar } from "./_components/progress-bar";

export default function JobsPage() {
  const { data: jobs, isLoading: jobsLoading, error: jobsError } = api.jobs.listJobs.useQuery();
  const { data: myJobs, isLoading: myJobsLoading, error: myJobsError, refetch: refetchMyJobs } = api.jobs.getMyJobs.useQuery();
  const utils = api.useUtils();

  const addXpMutation = api.jobs.addJobXp.useMutation({
    onSuccess: async () => {
      await refetchMyJobs();
      void utils.jobs.getMyJobs.invalidate();
    },
    onError: (error) => {
      console.error("Failed to add XP:", error);
    },
  });

  if (jobsLoading || myJobsLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <h1 className="text-2xl font-bold text-cyan-400">Jobs</h1>
          <p className="mt-2 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (jobsError || myJobsError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <h1 className="text-2xl font-bold text-cyan-400">Jobs</h1>
          <div className="mt-4 rounded bg-red-500/20 border border-red-500/50 p-4">
            <p className="text-red-400 font-semibold">Error loading jobs</p>
            <p className="text-red-300 text-sm mt-2">
              {jobsError?.message ?? myJobsError?.message ?? "Unknown error"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const myJobsMap = new Map(myJobs?.map((uj) => [uj.jobId, uj]) ?? []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <h1 className="text-2xl font-bold text-cyan-400">Jobs & Professions</h1>
        <p className="mt-2 text-slate-400">
          Manage your crafting and gathering professions
        </p>

        <div className="mt-6 space-y-4">
          {jobs?.map((job) => {
            const userJob = myJobsMap.get(job.id);
            const transformedUserJob = userJob
              ? {
                  ...userJob,
                  progress: {
                    current: userJob.xpInLevel ?? 0,
                    needed: userJob.xpToNext ?? 100,
                  },
                }
              : null;
            return (
              <div key={job.id} className="space-y-2">
                <JobCard job={job} userJob={transformedUserJob} />
                <div className="ml-4 flex items-center gap-2">
                  <button
                    onClick={() => {
                      addXpMutation.mutate({ jobId: job.id, xp: 10 });
                    }}
                    disabled={addXpMutation.isPending}
                    className="rounded bg-cyan-500/20 px-3 py-1 text-xs text-cyan-400 transition hover:bg-cyan-500/30 disabled:opacity-50"
                  >
                    {addXpMutation.isPending ? "Training..." : "Train +10 XP"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <Link
            href="/hub"
            className="inline-block rounded-xl bg-cyan-500/20 px-6 py-3 text-cyan-400 transition hover:bg-cyan-500/30"
          >
            Return to Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
