import Link from "next/link";

type Achievement = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  rarity: string;
  unlockedAt: Date;
};

type ProfileAchievementsCardProps = {
  achievements: Achievement[];
  username: string;
};

export function ProfileAchievementsCard({
  achievements,
  username,
}: ProfileAchievementsCardProps) {
  const rarityColors: Record<string, string> = {
    COMMON: "border-slate-500/50 bg-slate-700/30",
    UNCOMMON: "border-green-500/50 bg-green-700/20",
    RARE: "border-blue-500/50 bg-blue-700/20",
    EPIC: "border-purple-500/50 bg-purple-700/20",
    LEGENDARY: "border-yellow-500/50 bg-yellow-700/20",
  };

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-cyan-400">Achievements</h2>
        {achievements.length > 0 && (
          <Link
            href={`/profile/${username}/achievements`}
            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            View all →
          </Link>
        )}
      </div>

      {achievements.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-slate-400">No achievements unlocked yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {achievements.slice(0, 8).map((achievement) => (
            <div
              key={achievement.id}
              className={`rounded-lg border p-3 ${rarityColors[achievement.rarity] ?? rarityColors.COMMON}`}
            >
              <div className="mb-2 flex h-12 items-center justify-center">
                {achievement.icon ? (
                  <img
                    src={achievement.icon}
                    alt={achievement.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="text-2xl">🏆</div>
                )}
              </div>
              <p className="mb-1 text-xs font-semibold text-slate-200">
                {achievement.name}
              </p>
              {achievement.description && (
                <p className="text-xs text-slate-400 line-clamp-2">
                  {achievement.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
