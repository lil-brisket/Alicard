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
  addXp,
} from "~/server/lib/job-utils";

export const jobsRouter = createTRPCRouter({
  // Get all available jobs
  listJobs: protectedProcedure.query(async () => {
    return await db.job.findMany({
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
    });
  }),

  // Get user's jobs (create if missing for starter jobs)
  getMyJobs: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    // Get player
    const player = await db.player.findUnique({
      where: { userId },
    });

    // If player doesn't exist, return empty array (user needs to create character first)
    if (!player) {
      return [];
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

      return userJobs.map((uj) => {
        const levelResult = addXp(uj.level, uj.xp, 0, 10);
        return {
          ...uj,
          totalXp: uj.xp,
          level: levelResult.newLevel,
          xpInLevel: levelResult.xpInLevel,
          xpToNext: levelResult.xpToNext,
          progressPct: levelResult.progressPct,
        };
      });
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

      // Update XP using shared addXp function for consistent leveling
      const levelResult = addXp(userJob.level, userJob.xp, input.xp, 10);

      const updated = await db.userJob.update({
        where: { id: userJob.id },
        data: { xp: levelResult.newXp, level: levelResult.newLevel },
        include: { job: true },
      });

      return {
        ...updated,
        totalXp: updated.xp,
        level: levelResult.newLevel,
        xpInLevel: levelResult.xpInLevel,
        xpToNext: levelResult.xpToNext,
        progressPct: levelResult.progressPct,
        leveledUp: levelResult.leveledUp,
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
      const levelResult = addXp(level, userJob.xp, 0, 10);

      return {
        ...userJob,
        level: levelResult.newLevel,
        totalXp: userJob.xp,
        xpInLevel: levelResult.xpInLevel,
        xpToNext: levelResult.xpToNext,
        progressPct: levelResult.progressPct,
        isMaxLevel: levelResult.newLevel >= 10,
      };
    }),
});
