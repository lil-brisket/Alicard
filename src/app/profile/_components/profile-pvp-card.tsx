type ProfilePvpCardProps = {
  wins: number;
  losses: number;
  winPercent: number;
};

export function ProfilePvpCard({ wins, losses, winPercent }: ProfilePvpCardProps) {
  const total = wins + losses;

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
      <h2 className="mb-4 text-lg font-bold text-cyan-400">PvP Record</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 text-center">
            <p className="mb-1 text-xs text-slate-400">Wins</p>
            <p className="text-2xl font-bold text-green-400">{wins}</p>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 text-center">
            <p className="mb-1 text-xs text-slate-400">Losses</p>
            <p className="text-2xl font-bold text-red-400">{losses}</p>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4 text-center">
            <p className="mb-1 text-xs text-slate-400">Win %</p>
            <p className="text-2xl font-bold text-cyan-400">{winPercent}%</p>
          </div>
        </div>

        {total > 0 && (
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
            <p className="mb-1 text-xs text-slate-400">Total Matches</p>
            <p className="text-lg font-semibold text-slate-200">{total}</p>
          </div>
        )}

        {/* Placeholders */}
        <div className="space-y-2 border-t border-slate-700/50 pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Current Streak</span>
            <span className="text-slate-300">—</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Rank Tier</span>
            <span className="text-slate-300">—</span>
          </div>
        </div>
      </div>
    </div>
  );
}
