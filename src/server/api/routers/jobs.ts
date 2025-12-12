import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  getLevelFromXp,
  getXpProgress,
  getMaxXpForLevel,
} from "~/server/lib/job-utils";

export const jobsRouter = createTRPCRouter({
  // Get all available jobs
  listJobs: protectedProcedure.query(async () => {
    return await db.job.findMany({
      orderBy: { category: "asc", name: "asc" },
    });
  }),

  // Get user's jobs (create if missing for starter jobs)
  getMyJobs: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    // Get player
    const player = await db.player.findUnique({
      where: { userId },
    });

    if (!player) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Player not found",
      });
    }

    // Get all jobs
    const allJobs = await db.job.findMany();
    
    // Get user's existing jobs
    const userJobs = await db.userJob.findMany({
      where: { playerId: player.id },
      include: { job: true },
    });

    const userJobMap = new Map(userJobs.map((uj) => [uj.jobId, uj]));

    // Create missing jobs for user (auto-create starter jobs)
    const jobsToCreate = allJobs.filter((job) => !userJobMap.has(job.id));
    
    if (jobsToCreate.length > 0) {
      await db.userJob.createMany({
        data: jobsToCreate.map((job) => ({
          playerId: player.id,
          jobId: job.id,
          level: 1,
          xp: 0,
          active: false,
        })),
      });

      // Refetch user jobs
      const updatedUserJobs = await db.userJob.findMany({
        where: { playerId: player.id },
        include: { job: true },
      });

      return updatedUserJobs.map((uj) => ({
        ...uj,
        totalXp: uj.xp,
        level: getLevelFromXp(uj.xp),
        progress: getXpProgress(getLevelFromXp(uj.xp), uj.xp),
      }));
    }

    return userJobs.map((uj) => ({
      ...uj,
      totalXp: uj.xp,
      level: getLevelFromXp(uj.xp),
      progress: getXpProgress(getLevelFromXp(uj.xp), uj.xp),
    }));
  }),

  // Add XP to a job
  addJobXp: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
        xp: z.number().int().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const player = await db.player.findUnique({
        where: { userId },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      // Get or create user job
      let userJob = await db.userJob.findUnique({
        where: {
          playerId_jobId: {
            playerId: player.id,
            jobId: input.jobId,
          },
        },
        include: { job: true },
      });

      if (!userJob) {
        // Create if missing
        userJob = await db.userJob.create({
          data: {
            playerId: player.id,
            jobId: input.jobId,
            level: 1,
            xp: 0,
            active: false,
          },
          include: { job: true },
        });
      }

      // Update XP (capped at level 10)
      const oldLevel = getLevelFromXp(userJob.xp);
      const maxXp = getMaxXpForLevel(10);
      const newXp = Math.min(userJob.xp + input.xp, maxXp);
      const newLevel = getLevelFromXp(newXp);

      const updated = await db.userJob.update({
        where: { id: userJob.id },
        data: { xp: newXp, level: newLevel },
        include: { job: true },
      });

      return {
        ...updated,
        totalXp: updated.xp,
        level: newLevel,
        progress: getXpProgress(newLevel, updated.xp),
        leveledUp: newLevel > oldLevel,
      };
    }),

  // Set active job (optional)
  setActiveJob: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const player = await db.player.findUnique({
        where: { userId },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      // Deactivate all jobs
      await db.userJob.updateMany({
        where: { playerId: player.id },
        data: { active: false },
      });

      // Activate selected job
      const userJob = await db.userJob.findUnique({
        where: {
          playerId_jobId: {
            playerId: player.id,
            jobId: input.jobId,
          },
        },
      });

      if (!userJob) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found for user",
        });
      }

      const updated = await db.userJob.update({
        where: { id: userJob.id },
        data: { active: true },
        include: { job: true },
      });

      return updated;
    }),

  // Get job progression details
  getJobProgression: protectedProcedure
    .input(
      z.object({
        jobId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      
      const player = await db.player.findUnique({
        where: { userId },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      const userJob = await db.userJob.findUnique({
        where: {
          playerId_jobId: {
            playerId: player.id,
            jobId: input.jobId,
          },
        },
        include: { job: true },
      });

      if (!userJob) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found for user",
        });
      }

      const level = getLevelFromXp(userJob.xp);
      const progress = getXpProgress(level, userJob.xp);

      return {
        ...userJob,
        level,
        totalXp: userJob.xp,
        progress,
        xpForNextLevel: progress.needed,
        isMaxLevel: level >= 10,
      };
    }),
});
