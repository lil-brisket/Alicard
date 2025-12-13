import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
} from "~/server/api/trpc";

// Helper to check if interest is claimable today (UTC)
function isInterestClaimableToday(lastClaimedAt: Date | null): boolean {
  if (!lastClaimedAt) return true;
  
  const now = new Date();
  const lastClaimed = new Date(lastClaimedAt);
  
  // Check if last claim was on a different UTC day
  const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const lastClaimedUTC = new Date(Date.UTC(lastClaimed.getUTCFullYear(), lastClaimed.getUTCMonth(), lastClaimed.getUTCDate()));
  
  return nowUTC.getTime() > lastClaimedUTC.getTime();
}

export const bankRouter = createTRPCRouter({
  // Get bank overview (wallet, bank balance, interest claimable status)
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    // Get player with wallet (gold field)
    const player = await ctx.db.player.findUnique({
      where: { userId },
      select: {
        id: true,
        gold: true,
        bankAccount: true,
      },
    });

    if (!player) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Player not found",
      });
    }

    // Upsert bank account if it doesn't exist
    let bankAccount = player.bankAccount;
    if (!bankAccount) {
      bankAccount = await ctx.db.bankAccount.create({
        data: {
          playerId: player.id,
          balanceCoins: 0,
          vaultLevel: 1,
        },
      });
    }

    // Check if interest is claimable
    const canClaimInterest = isInterestClaimableToday(bankAccount.lastInterestClaimedAt);

    return {
      walletCoins: player.gold,
      bankBalanceCoins: bankAccount.balanceCoins,
      lastInterestClaimedAt: bankAccount.lastInterestClaimedAt,
      canClaimInterest,
    };
  }),

  // Transfer coins from wallet to another player's wallet
  transfer: protectedProcedure
    .input(
      z.object({
        toUserId: z.string(),
        amountCoins: z.number().int().positive("Amount must be positive"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const fromUserId = ctx.session.user.id;

      // Validate: cannot send to self
      if (fromUserId === input.toUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot send coins to yourself",
        });
      }

      // Validate: amount must be positive
      if (input.amountCoins <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Amount must be greater than 0",
        });
      }

      // Get sender and receiver players
      const [sender, receiver] = await Promise.all([
        ctx.db.player.findUnique({
          where: { userId: fromUserId },
          select: { id: true, gold: true },
        }),
        ctx.db.user.findUnique({
          where: { id: input.toUserId },
          include: {
            player: {
              select: { id: true, gold: true },
            },
          },
        }),
      ]);

      if (!sender) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sender player not found",
        });
      }

      if (!receiver || !receiver.player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Receiver player not found",
        });
      }

      // Validate: sender has enough coins
      if (sender.gold < input.amountCoins) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient funds",
        });
      }

      // Perform atomic transfer
      await ctx.db.$transaction(async (tx) => {
        // Decrement sender wallet
        await tx.player.update({
          where: { id: sender.id },
          data: {
            gold: {
              decrement: input.amountCoins,
            },
          },
        });

        // Increment receiver wallet
        await tx.player.update({
          where: { id: receiver.player!.id },
          data: {
            gold: {
              increment: input.amountCoins,
            },
          },
        });

        // Create transaction ledger entries
        // Get or create bank accounts for ledger
        const senderAccount = await tx.bankAccount.upsert({
          where: { playerId: sender.id },
          create: {
            playerId: sender.id,
            balanceCoins: 0,
            vaultLevel: 1,
          },
          update: {},
        });

        await tx.bankTransaction.create({
          data: {
            type: "TRANSFER",
            amountCoins: input.amountCoins,
            fromUserId,
            toUserId: input.toUserId,
            accountId: senderAccount.id,
            note: `Transfer to ${receiver.username}`,
          },
        });

        // Get or create receiver's bank account for ledger
        const receiverAccount = await tx.bankAccount.upsert({
          where: { playerId: receiver.player!.id },
          create: {
            playerId: receiver.player!.id,
            balanceCoins: 0,
            vaultLevel: 1,
          },
          update: {},
        });

        await tx.bankTransaction.create({
          data: {
            type: "TRANSFER",
            amountCoins: input.amountCoins,
            fromUserId,
            toUserId: input.toUserId,
            accountId: receiverAccount.id,
            note: `Transfer from ${ctx.session.user.username ?? "Unknown"}`,
          },
        });
      });

      return { success: true };
    }),

  // Deposit coins from wallet to bank
  deposit: protectedProcedure
    .input(
      z.object({
        amountCoins: z.number().int().positive("Amount must be positive"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Validate: amount must be positive
      if (input.amountCoins <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Amount must be greater than 0",
        });
      }

      // Get player with wallet and bank account
      const player = await ctx.db.player.findUnique({
        where: { userId },
        select: {
          id: true,
          gold: true,
          bankAccount: true,
        },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      // Validate: player has enough coins in wallet
      if (player.gold < input.amountCoins) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient funds in wallet",
        });
      }

      // Upsert bank account if it doesn't exist
      let bankAccount = player.bankAccount;
      if (!bankAccount) {
        bankAccount = await ctx.db.bankAccount.create({
          data: {
            playerId: player.id,
            balanceCoins: 0,
            vaultLevel: 1,
          },
        });
      }

      // Perform atomic deposit
      await ctx.db.$transaction(async (tx) => {
        // Decrement wallet
        await tx.player.update({
          where: { id: player.id },
          data: {
            gold: {
              decrement: input.amountCoins,
            },
          },
        });

        // Increment bank balance
        await tx.bankAccount.update({
          where: { id: bankAccount.id },
          data: {
            balanceCoins: {
              increment: input.amountCoins,
            },
          },
        });

        // Create transaction ledger entry
        await tx.bankTransaction.create({
          data: {
            type: "DEPOSIT",
            amountCoins: input.amountCoins,
            accountId: bankAccount.id,
            note: "Deposit from wallet",
          },
        });
      });

      return { success: true };
    }),

  // Withdraw coins from bank to wallet
  withdraw: protectedProcedure
    .input(
      z.object({
        amountCoins: z.number().int().positive("Amount must be positive"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Validate: amount must be positive
      if (input.amountCoins <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Amount must be greater than 0",
        });
      }

      // Get player with wallet and bank account
      const player = await ctx.db.player.findUnique({
        where: { userId },
        select: {
          id: true,
          gold: true,
          bankAccount: true,
        },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      // Upsert bank account if it doesn't exist
      let bankAccount = player.bankAccount;
      if (!bankAccount) {
        bankAccount = await ctx.db.bankAccount.create({
          data: {
            playerId: player.id,
            balanceCoins: 0,
            vaultLevel: 1,
          },
        });
      }

      // Validate: bank has enough coins
      if (bankAccount.balanceCoins < input.amountCoins) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Insufficient funds in bank",
        });
      }

      // Perform atomic withdrawal
      await ctx.db.$transaction(async (tx) => {
        // Decrement bank balance
        await tx.bankAccount.update({
          where: { id: bankAccount.id },
          data: {
            balanceCoins: {
              decrement: input.amountCoins,
            },
          },
        });

        // Increment wallet
        await tx.player.update({
          where: { id: player.id },
          data: {
            gold: {
              increment: input.amountCoins,
            },
          },
        });

        // Create transaction ledger entry
        await tx.bankTransaction.create({
          data: {
            type: "WITHDRAW",
            amountCoins: input.amountCoins,
            accountId: bankAccount.id,
            note: "Withdraw to wallet",
          },
        });
      });

      return {
        success: true,
      };
    }),

  // Claim daily interest (10% of bank balance)
  claimDailyInterest: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Get player and bank account
    const player = await ctx.db.player.findUnique({
      where: { userId },
      include: {
        bankAccount: true,
      },
    });

    if (!player) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Player not found",
      });
    }

    // Upsert bank account if it doesn't exist
    let bankAccount = player.bankAccount;
    if (!bankAccount) {
      bankAccount = await ctx.db.bankAccount.create({
        data: {
          playerId: player.id,
          balanceCoins: 0,
          vaultLevel: 1,
        },
      });
    }

    // Check if interest is claimable
    if (!isInterestClaimableToday(bankAccount.lastInterestClaimedAt)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Interest already claimed today",
      });
    }

    // Calculate interest (10% of current balance, floored)
    const interestAmount = Math.floor(bankAccount.balanceCoins * 0.1);

    // Apply interest in transaction
    await ctx.db.$transaction(async (tx) => {
      const updatedAccount = await tx.bankAccount.update({
        where: { id: bankAccount.id },
        data: {
          balanceCoins: {
            increment: interestAmount,
          },
          lastInterestClaimedAt: new Date(),
        },
      });

      // Create transaction ledger entry
      await tx.bankTransaction.create({
        data: {
          type: "INTEREST",
          amountCoins: interestAmount,
          accountId: bankAccount.id,
          note: "Daily interest payment",
        },
      });

      return updatedAccount;
    });

    return {
      success: true,
      interestAmount,
      newBalance: bankAccount.balanceCoins + interestAmount,
    };
  }),

  // Get transaction history
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get player and bank account
      const player = await ctx.db.player.findUnique({
        where: { userId },
        include: {
          bankAccount: {
            select: { id: true },
          },
        },
      });

      if (!player) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Player not found",
        });
      }

      // Build OR conditions for transactions
      const orConditions: Array<{ fromUserId: string } | { toUserId: string } | { accountId: string }> = [
        { fromUserId: userId },
        { toUserId: userId },
      ];

      if (player.bankAccount) {
        orConditions.push({ accountId: player.bankAccount.id });
      }

      // Get transactions where user is sender, receiver, or account owner
      const transactions = await ctx.db.bankTransaction.findMany({
        where: {
          OR: orConditions,
        },
        include: {
          fromUser: {
            select: {
              id: true,
              username: true,
            },
          },
          toUser: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: input?.limit ?? 20,
      });

      return transactions;
    }),
});
