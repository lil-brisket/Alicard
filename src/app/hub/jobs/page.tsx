"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { JobCard } from "./_components/job-card";
import { ProgressBar } from "./_components/progress-bar";

export default function JobsPage() {
  const { data: jobs, isLoading: jobsLoading, error: jobsError } = api.jobs.listJobs.useQuery();
  const { data: myJobs, isLoading: myJobsLoading, error: myJobsError } = api.jobs.getMyJobs.useQuery();
  const { data: activeAction } = api.skillTraining.getActiveAction.useQuery(
    undefined,
    {
      refetchInterval: 2000, // Refetch every 2 seconds for real-time updates
    }
  );

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
  
  // Determine which job is currently being trained (if any)
  const activeJobId = activeAction?.action?.skill?.jobId;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <h1 className="text-2xl font-bold text-cyan-400">Jobs & Professions</h1>
        <p className="mt-2 text-slate-400">
          Choose a job to view available actions, training skills, and gathering nodes
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
                  isTraining: activeJobId === job.id,
                }
              : null;
            return (
              <JobCard key={job.id} job={job} userJob={transformedUserJob} />
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
