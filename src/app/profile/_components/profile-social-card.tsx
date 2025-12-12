type ProfileSocialCardProps = {
  guildName?: string | null;
  guildRole?: string | null;
  friendsCount?: number;
  commendationsHelpful?: number;
  commendationsSkilled?: number;
  commendationsStrategic?: number;
};

export function ProfileSocialCard({
  guildName,
  guildRole,
  friendsCount = 0,
  commendationsHelpful = 0,
  commendationsSkilled = 0,
  commendationsStrategic = 0,
}: ProfileSocialCardProps) {
  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
      <h2 className="mb-4 text-lg font-bold text-cyan-400">Social</h2>

      <div className="space-y-4">
        {/* Guild Info */}
        {guildName && (
          <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
            <p className="mb-1 text-xs text-slate-400">Guild</p>
            <p className="text-lg font-semibold text-purple-400">{guildName}</p>
            {guildRole && (
              <p className="mt-1 text-xs text-slate-400">Role: {guildRole}</p>
            )}
          </div>
        )}

        {/* Friends */}
        <div className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
          <p className="mb-1 text-xs text-slate-400">Friends</p>
          <p className="text-lg font-semibold text-slate-200">{friendsCount}</p>
        </div>

        {/* Commendations */}
        <div className="space-y-2 border-t border-slate-700/50 pt-4">
          <p className="mb-2 text-xs font-semibold text-slate-400">Commendations</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Helpful</span>
              <span className="font-semibold text-green-400">{commendationsHelpful}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Skilled</span>
              <span className="font-semibold text-blue-400">{commendationsSkilled}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300">Strategic</span>
              <span className="font-semibold text-purple-400">{commendationsStrategic}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
