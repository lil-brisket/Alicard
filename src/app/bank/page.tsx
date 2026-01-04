"use client";

import { useState, useMemo } from "react";
import { api } from "~/trpc/react";
import Link from "next/link";
import toast from "react-hot-toast";

// Format number with commas
function formatCoins(coins: number): string {
  return coins.toLocaleString();
}

// Format date for display
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString();
}

// Get transaction display text
function getTransactionText(
  transaction: {
    type: string;
    amountCoins: number;
    fromUser?: { username: string } | null;
    toUser?: { username: string } | null;
    note?: string | null;
  }
): string {
  switch (transaction.type) {
    case "TRANSFER":
      if (transaction.fromUser && transaction.toUser) {
        return `Transfer: ${formatCoins(transaction.amountCoins)} coins (${transaction.fromUser.username} → ${transaction.toUser.username})`;
      }
      return `Transfer: ${formatCoins(transaction.amountCoins)} coins`;
    case "INTEREST":
      return `Daily Interest: +${formatCoins(transaction.amountCoins)} coins`;
    case "DEPOSIT":
      return `Deposit: +${formatCoins(transaction.amountCoins)} coins`;
    case "WITHDRAW":
      return `Withdraw: -${formatCoins(transaction.amountCoins)} coins`;
    default:
      return transaction.note ?? `Transaction: ${formatCoins(transaction.amountCoins)} coins`;
  }
}

export default function BankPage() {
  const [recipientQuery, setRecipientQuery] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<{ id: string; username: string } | null>(null);
  const [amount, setAmount] = useState("");
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Get bank overview
  const { data: overview, refetch: refetchOverview } = api.bank.getOverview.useQuery();

  // Search users (debounced)
  const { data: searchResults = [] } = api.users.search.useQuery(
    { query: recipientQuery },
    {
      enabled: recipientQuery.length >= 2,
      staleTime: 5000,
    }
  );

  // Get transaction history
  const { data: history = [] } = api.bank.getHistory.useQuery({ limit: 20 });

  // Transfer mutation
  const transferMutation = api.bank.transfer.useMutation({
    onSuccess: () => {
      toast.success("Transfer completed successfully!");
      setAmount("");
      setSelectedRecipient(null);
      setRecipientQuery("");
      void refetchOverview();
    },
    onError: (error) => {
      toast.error(error.message || "Transfer failed");
    },
  });

  // Claim interest mutation
  const claimInterestMutation = api.bank.claimDailyInterest.useMutation({
    onSuccess: (data) => {
      toast.success(`Interest claimed! +${formatCoins(data.interestAmount)} coins`);
      void refetchOverview();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to claim interest");
    },
  });

  // Deposit mutation
  const depositMutation = api.bank.deposit.useMutation({
    onSuccess: () => {
      toast.success("Deposit completed successfully!");
      setDepositAmount("");
      void refetchOverview();
    },
    onError: (error) => {
      toast.error(error.message || "Deposit failed");
    },
  });

  // Withdraw mutation
  const withdrawMutation = api.bank.withdraw.useMutation({
    onSuccess: () => {
      toast.success("Withdrawal completed successfully!");
      setWithdrawAmount("");
      void refetchOverview();
    },
    onError: (error) => {
      toast.error(error.message || "Withdrawal failed");
    },
  });

  // Filter search results (exclude already selected)
  const filteredResults = useMemo(() => {
    if (!selectedRecipient) return searchResults;
    return searchResults.filter((u) => u.id !== selectedRecipient.id);
  }, [searchResults, selectedRecipient]);

  const handleTransfer = () => {
    if (!selectedRecipient) {
      toast.error("Please select a recipient");
      return;
    }

    const amountNum = parseInt(amount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    transferMutation.mutate({
      toUserId: selectedRecipient.id,
      amountCoins: amountNum,
    });
  };

  const handleClaimInterest = () => {
    claimInterestMutation.mutate();
  };

  const handleDeposit = () => {
    const amountNum = parseInt(depositAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    depositMutation.mutate({
      amountCoins: amountNum,
    });
  };

  const handleWithdraw = () => {
    const amountNum = parseInt(withdrawAmount, 10);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    withdrawMutation.mutate({
      amountCoins: amountNum,
    });
  };

  const interestAmount = overview
    ? Math.floor(overview.bankBalanceCoins * 0.1)
    : 0;

  return (
    <div>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-cyan-400">Bank</h1>
            <p className="mt-2 text-slate-400">
              Manage your finances and transfer coins
            </p>
          </div>
        </div>

        {/* Balances */}
        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white/10 p-6">
            <h2 className="mb-2 text-lg font-semibold text-slate-300">
              Wallet
            </h2>
            <p className="text-3xl font-bold text-cyan-400">
              {overview ? formatCoins(overview.walletCoins) : "..."} coins
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-6">
            <h2 className="mb-2 text-lg font-semibold text-slate-300">
              Bank Balance
            </h2>
            <p className="text-3xl font-bold text-cyan-400">
              {overview ? formatCoins(overview.bankBalanceCoins) : "..."} coins
            </p>
          </div>
        </div>

        {/* Deposit/Withdraw Section */}
        <div className="mb-6 rounded-xl bg-white/10 p-6">
          <h2 className="mb-4 text-xl font-semibold">Deposit & Withdraw</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Deposit */}
            <div className="flex flex-col rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <h3 className="mb-3 text-lg font-semibold text-green-400">
                Deposit to Bank
              </h3>
              <p className="mb-3 text-sm text-slate-400">
                Transfer coins from your wallet to your bank account
              </p>
              <div className="flex flex-1 flex-col">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Amount (coins)
                  </label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Enter amount..."
                    min="1"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-green-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleDeposit}
                  disabled={!depositAmount || depositMutation.isPending}
                  className="mt-3 w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {depositMutation.isPending ? "Depositing..." : "Deposit"}
                </button>
              </div>
            </div>

            {/* Withdraw */}
            <div className="flex flex-col rounded-lg border border-slate-700 bg-slate-900/50 p-4">
              <h3 className="mb-3 text-lg font-semibold text-orange-400">
                Withdraw from Bank
              </h3>
              <p className="mb-3 text-sm text-slate-400">
                Transfer coins from your bank account to your wallet
              </p>
              <div className="flex flex-1 flex-col">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Amount (coins)
                  </label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount..."
                    min="1"
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || withdrawMutation.isPending}
                  className="mt-3 w-full rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {withdrawMutation.isPending ? "Withdrawing..." : "Withdraw"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Interest */}
        <div className="mb-6 rounded-xl bg-white/10 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-lg font-semibold text-slate-300">
                Daily Interest
              </h2>
              <p className="text-slate-400">
                {overview?.canClaimInterest
                  ? `Claimable today: +${formatCoins(interestAmount)} coins (10%)`
                  : "Already claimed today"}
              </p>
            </div>
            <button
              onClick={handleClaimInterest}
              disabled={
                !overview?.canClaimInterest ||
                claimInterestMutation.isPending ||
                interestAmount === 0
              }
              className="rounded-lg bg-cyan-500 px-6 py-2 font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {claimInterestMutation.isPending ? "Claiming..." : "Claim"}
            </button>
          </div>
        </div>

        {/* Transfer Section */}
        <div className="mb-6 rounded-xl bg-white/10 p-6">
          <h2 className="mb-4 text-xl font-semibold">Transfer Coins</h2>
          <div className="space-y-4">
            {/* Recipient Search */}
            <div className="relative">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Recipient
              </label>
              <input
                type="text"
                value={selectedRecipient?.username ?? recipientQuery}
                onChange={(e) => {
                  setRecipientQuery(e.target.value);
                  setSelectedRecipient(null);
                  setShowRecipientDropdown(e.target.value.length >= 2);
                }}
                onFocus={() => {
                  if (recipientQuery.length >= 2) {
                    setShowRecipientDropdown(true);
                  }
                }}
                onBlur={() => {
                  // Delay to allow click on dropdown item
                  setTimeout(() => setShowRecipientDropdown(false), 200);
                }}
                placeholder="Search by username..."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
              {showRecipientDropdown && filteredResults.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-900">
                  {filteredResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        setSelectedRecipient(user);
                        setRecipientQuery(user.username);
                        setShowRecipientDropdown(false);
                      }}
                      className="w-full px-4 py-2 text-left text-slate-100 hover:bg-slate-800"
                    >
                      {user.username}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Amount (coins)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount..."
                min="1"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleTransfer}
              disabled={
                !selectedRecipient ||
                !amount ||
                transferMutation.isPending
              }
              className="w-full rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {transferMutation.isPending ? "Sending..." : "Send Coins"}
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="rounded-xl bg-white/10 p-6">
          <h2 className="mb-4 text-xl font-semibold">Recent Transactions</h2>
          {history.length === 0 ? (
            <p className="text-slate-400">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {history.map((transaction: (typeof history)[number]) => (
                <div
                  key={transaction.id}
                  className="rounded-lg border border-slate-700 bg-slate-900/50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-100">
                        {getTransactionText(transaction)}
                      </p>
                      {transaction.note && (
                        <p className="text-sm text-slate-400">
                          {transaction.note}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">
                      {formatDate(transaction.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
