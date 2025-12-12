"use client";

import Link from "next/link";
import { api } from "~/trpc/react";
import { JobCard } from "../hub/jobs/_components/job-card";

export default function JobsPage() {
  const { data: jobs, isLoading: jobsLoading, error: jobsError } = api.jobs.listJobs.useQuery();
  const { data: myJobs, isLoading: myJobsLoading, error: myJobsError } = api.jobs.getMyJobs.useQuery();
  const utils = api.useUtils();

  const addXpMutation = api.jobs.addJobXp.useMutation({
    onSuccess: () => {
      void utils.jobs.getMyJobs.invalidate();
    },
  });

  const setActiveJobMutation = api.jobs.setActiveJob.useMutation({
    onSuccess: () => {
      void utils.jobs.getMyJobs.invalidate();
    },
  });

  if (jobsLoading || myJobsLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <h1 className="text-2xl font-bold text-cyan-400">Jobs & Professions</h1>
          <p className="mt-2 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (jobsError || myJobsError) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <h1 className="text-2xl font-bold text-cyan-400">Jobs & Professions</h1>
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

  // Group jobs by category
  const craftJobs = jobs?.filter((job) => job.category === "CRAFT") ?? [];
  const gatherJobs = jobs?.filter((job) => job.category === "GATHER") ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <h1 className="text-2xl font-bold text-cyan-400">Jobs & Professions</h1>
        <p className="mt-2 text-slate-400">
          Manage your crafting and gathering professions
        </p>

        {craftJobs.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Crafting Professions</h2>
            <div className="space-y-4">
              {craftJobs.map((job) => {
                const userJob = myJobsMap.get(job.id);
                return (
                  <div key={job.id} className="space-y-2">
                    <JobCard job={job} userJob={userJob ?? null} basePath="/jobs" />
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
                      {userJob && !userJob.active && (
                        <button
                          onClick={() => {
                            setActiveJobMutation.mutate({ jobId: job.id });
                          }}
                          disabled={setActiveJobMutation.isPending}
                          className="rounded bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400 transition hover:bg-emerald-500/30 disabled:opacity-50"
                        >
                          {setActiveJobMutation.isPending ? "Activating..." : "Set Active"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {gatherJobs.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-slate-200 mb-4">Gathering Professions</h2>
            <div className="space-y-4">
              {gatherJobs.map((job) => {
                const userJob = myJobsMap.get(job.id);
                return (
                  <div key={job.id} className="space-y-2">
                    <JobCard job={job} userJob={userJob ?? null} basePath="/jobs" />
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
                      {userJob && !userJob.active && (
                        <button
                          onClick={() => {
                            setActiveJobMutation.mutate({ jobId: job.id });
                          }}
                          disabled={setActiveJobMutation.isPending}
                          className="rounded bg-emerald-500/20 px-3 py-1 text-xs text-emerald-400 transition hover:bg-emerald-500/30 disabled:opacity-50"
                        >
                          {setActiveJobMutation.isPending ? "Activating..." : "Set Active"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(!jobs || jobs.length === 0) && (
          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
            <p className="text-slate-400">No jobs available yet.</p>
          </div>
        )}

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
