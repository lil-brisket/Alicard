type ProfileBankingCardProps = {
  balanceCoins: number;
  vaultLevel: number;
};

export function ProfileBankingCard({
  balanceCoins,
  vaultLevel,
}: ProfileBankingCardProps) {
  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
      <h2 className="mb-4 text-lg font-bold text-cyan-400">Banking</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
            <p className="mb-1 text-xs text-slate-400">Bank Balance</p>
            <p className="text-2xl font-bold text-yellow-400">
              {balanceCoins.toLocaleString()} coins
            </p>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
            <p className="mb-1 text-xs text-slate-400">Vault Level</p>
            <p className="text-2xl font-bold text-purple-400">Level {vaultLevel}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
