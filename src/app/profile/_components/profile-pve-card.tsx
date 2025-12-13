type ProfilePveCardProps = {
  totalKills: number;
  bossesSlain: number;
  deathsUsed: number;
  deathsLimit: number;
  deathsRemaining: number;
};

export function ProfilePveCard({
  totalKills,
  bossesSlain,
  deathsUsed,
  deathsLimit,
  deathsRemaining,
}: ProfilePveCardProps) {
  const deathPercentage = (deathsUsed / deathsLimit) * 100;
  const isPermaDead = deathsRemaining === 0;

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
      <h2 className="mb-4 text-lg font-bold text-cyan-400">PvE / Legacy</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
            <p className="mb-1 text-xs text-slate-400">Combat Kills</p>
            <p className="text-2xl font-bold text-orange-400">{totalKills}</p>
          </div>
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
            <p className="mb-1 text-xs text-slate-400">Bosses Slain</p>
            <p className="text-2xl font-bold text-purple-400">{bossesSlain}</p>
          </div>
        </div>

        {/* Deaths Progress */}
        <div
          className={`rounded-lg border p-4 ${
            isPermaDead
              ? "border-red-500/50 bg-red-950/30"
              : "border-slate-700/50 bg-slate-800/30"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-slate-400">Deaths</p>
            <p
              className={`text-xs font-semibold ${
                isPermaDead ? "text-red-400" : "text-slate-300"
              }`}
            >
              {deathsUsed} / {deathsLimit}
            </p>
          </div>
          <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-700/50">
            <div
              className={`h-full transition-all ${
                isPermaDead ? "bg-red-600" : "bg-red-500"
              }`}
              style={{ width: `${Math.min(deathPercentage, 100)}%` }}
            />
          </div>
          {!isPermaDead && (
            <p className="text-xs text-slate-400">
              {deathsRemaining} live{deathsRemaining !== 1 ? "s" : ""} remaining
            </p>
          )}
          {isPermaDead && (
            <p className="text-xs font-semibold text-red-400">Permanently Fallen</p>
          )}
        </div>
      </div>
    </div>
  );
}
